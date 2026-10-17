import { describe, expect, it } from "vitest";
import {
  classifyDeliveryFailure,
  createTelemetryQueue,
  DEAD_LETTER_OVERFLOW_KEY,
  OVERFLOW_EVENT_TYPE,
  QUEUE_KEY,
  type DeliveryError,
  type DeliveryResult,
  type TelemetryEvent,
  type TelemetryQueueOptions,
} from "../client/src/lib/telemetryQueue";
import { PILOT_EVENT_TYPES } from "../shared/pilot";

function memoryStorage(quotaBytes = Infinity) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      let total = value.length;
      for (const [otherKey, otherValue] of data) if (otherKey !== key) total += otherValue.length;
      if (total > quotaBytes) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
  };
}

type Rejection = { error: DeliveryError; status: number } | null;

// Behaves like PostgREST inserting into learning_events: a multi-row insert is atomic, event_id is unique.
function fakeServer() {
  const rows = new Map<string, TelemetryEvent>();
  const calls: TelemetryEvent[][] = [];
  let mode: "online" | "offline" | "unavailable" = "online";
  let reject: (event: TelemetryEvent) => Rejection = () => null;
  const send = async (events: TelemetryEvent[]): Promise<DeliveryResult> => {
    calls.push(events.map((event) => ({ ...event })));
    if (mode === "offline") return { error: { code: "", message: "TypeError: Failed to fetch" }, status: 0 };
    if (mode === "unavailable") return { error: { code: "", message: "Service Unavailable" }, status: 503 };
    const ids = new Set<string>();
    for (const event of events) {
      if (rows.has(event.event_id) || ids.has(event.event_id)) return { error: { code: "23505", message: "duplicate key value violates unique constraint" }, status: 409 };
      ids.add(event.event_id);
      const rejection = reject(event);
      if (rejection) return rejection;
    }
    for (const event of events) rows.set(event.event_id, event);
    return { error: null, status: 201 };
  };
  return {
    rows,
    calls,
    send,
    goOffline: () => (mode = "offline"),
    goUnavailable: () => (mode = "unavailable"),
    goOnline: () => (mode = "online"),
    rejectWhen: (rule: (event: TelemetryEvent) => Rejection) => (reject = rule),
  };
}

let counter = 0;
function event(overrides: Partial<TelemetryEvent> = {}): TelemetryEvent {
  counter += 1;
  return {
    event_id: `evt-${counter}`,
    program_id: "program-1",
    cohort_id: "cohort-1",
    scholar_id: "scholar-1",
    session_id: "session-1",
    event_seq: counter,
    event_type: "answer_selected",
    occurred_at_client: `2026-10-17T00:00:${String(counter % 60).padStart(2, "0")}.000Z`,
    app_version: "test",
    payload: {},
    ...overrides,
  };
}

function setup(overrides: Partial<TelemetryQueueOptions> = {}) {
  const storage = memoryStorage();
  const server = fakeServer();
  let ids = 0;
  const queue = createTelemetryQueue({
    storage,
    send: server.send,
    now: () => "2026-10-17T12:00:00.000Z",
    newId: () => `gen-${++ids}`,
    ...overrides,
  });
  return { storage, server, queue };
}

const overflowMarkers = (events: TelemetryEvent[]) => events.filter((e) => e.event_type === OVERFLOW_EVENT_TYPE);

describe("classifyDeliveryFailure", () => {
  it.each([
    ["23505", 409, "delivered"],
    ["42501", 403, "dead_letter"],
    ["22003", 400, "dead_letter"],
    ["22P02", 400, "dead_letter"],
    ["23503", 409, "dead_letter"],
    ["", 0, "retry"],
    ["PGRST301", 401, "retry"],
    ["57014", 500, "retry"],
    ["40001", 409, "retry"],
    ["08006", 503, "retry"],
    ["", 503, "retry"],
    ["", 429, "retry"],
    ["XX000", 500, "retry"],
    ["", undefined, "retry"],
    ["42501", undefined, "dead_letter"],
  ] as const)("code %s with status %s is %s", (code, status, expected) => {
    expect(classifyDeliveryFailure({ code }, status)).toBe(expected);
  });
});

describe("telemetry delivery queue", () => {
  it("delivers queued events, records the true attempt count, and reports delivery", async () => {
    const { server, queue } = setup();
    const a = event();
    expect(await queue.insert(a)).toBe(true);
    expect(queue.queued()).toEqual([]);
    expect(server.rows.get(a.event_id)?.delivery_attempt).toBe(1);
  });

  it("treats a duplicate-key rejection as delivered, even inside a mixed batch", async () => {
    const { server, queue } = setup();
    const existing = event();
    server.rows.set(existing.event_id, existing);
    const fresh = event();
    queue.enqueue(existing);
    queue.enqueue(fresh);
    const summary = await queue.flush();
    expect(summary).toMatchObject({ delivered: 2, deadLettered: 0, remaining: 0 });
    expect(server.rows.has(fresh.event_id)).toBe(true);
    expect(queue.deadLetters()).toEqual([]);
  });

  it("dead-letters a rejected event with its reason while delivering the valid events in its batch", async () => {
    const { server, queue } = setup();
    const [a, bad, c] = [event(), event({ event_seq: 1_760_000_000_000 }), event()];
    server.rejectWhen((e) => (e.event_id === bad.event_id ? { error: { code: "22003", message: "integer out of range" }, status: 400 } : null));
    [a, bad, c].forEach(queue.enqueue);
    const summary = await queue.flush();
    expect(summary).toMatchObject({ delivered: 2, deadLettered: 1, retrying: 0, remaining: 0 });
    expect([...server.rows.keys()]).toEqual([a.event_id, c.event_id]);
    const [deadLetter] = queue.deadLetters();
    expect(deadLetter.event.event_id).toBe(bad.event_id);
    expect(deadLetter.reason).toMatchObject({ code: "22003", status: 400 });
  });

  it("never retries a permanent rejection on later flushes", async () => {
    const { server, queue } = setup();
    const poison = event();
    server.rejectWhen(() => ({ error: { code: "42501", message: "new row violates row-level security policy" }, status: 403 }));
    queue.enqueue(poison);
    await queue.flush();
    await queue.flush();
    await queue.flush();
    expect(server.calls).toHaveLength(1);
    expect(queue.queued()).toEqual([]);
    expect(queue.deadLetters()).toHaveLength(1);
  });

  it("keeps events through transient server errors and delivers them later with an accurate attempt count", async () => {
    const { server, queue } = setup();
    const a = event();
    server.goUnavailable();
    expect(await queue.insert(a)).toBe(false);
    expect(queue.queued()[0].delivery_attempt).toBe(1);
    server.goOnline();
    await queue.flush();
    expect(server.rows.get(a.event_id)?.delivery_attempt).toBe(2);
    expect(queue.queued()).toEqual([]);
  });

  it("stops early while offline and never dead-letters offline events, however long it lasts", async () => {
    const { server, queue } = setup({ batchSize: 50, maxServerRetries: 3 });
    for (let i = 0; i < 120; i += 1) queue.enqueue(event());
    server.goOffline();
    for (let i = 0; i < 5; i += 1) await queue.flush();
    expect(server.calls).toHaveLength(5); // one batch per flush, not three
    expect(queue.queued()).toHaveLength(120);
    expect(queue.deadLetters()).toEqual([]);
    server.goOnline();
    expect(await queue.flush()).toMatchObject({ delivered: 120, remaining: 0 });
  });

  it("dead-letters an event after repeated server-side failures instead of retrying forever", async () => {
    const { server, queue } = setup({ maxServerRetries: 3 });
    queue.enqueue(event());
    server.goUnavailable();
    await queue.flush();
    await queue.flush();
    expect(queue.queued()).toHaveLength(1);
    await queue.flush();
    expect(queue.queued()).toEqual([]);
    expect(queue.deadLetters()[0].reason).toMatchObject({ status: 503, retriesExhausted: true });
  });

  it("does not lose an event enqueued while a flush is in flight", async () => {
    const storage = memoryStorage();
    const server = fakeServer();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let first = true;
    const queue = createTelemetryQueue({
      storage,
      send: async (events) => {
        if (first) {
          first = false;
          await gate;
        }
        return server.send(events);
      },
    });
    const a = event();
    const late = event();
    queue.enqueue(a);
    const flushing = queue.flush();
    const lateInsert = queue.insert(late); // lands while the first send is still pending
    release();
    await flushing;
    expect(await lateInsert).toBe(true);
    expect(server.rows.has(a.event_id)).toBe(true);
    expect(server.rows.has(late.event_id)).toBe(true);
    expect(queue.queued()).toEqual([]);
  });

  it("coalesces concurrent flushes into a single drain", async () => {
    const { server, queue } = setup();
    queue.enqueue(event());
    await Promise.all([queue.flush(), queue.flush(), queue.flush()]);
    expect(server.calls).toHaveLength(1);
  });

  it("evicts heartbeats first on overflow and records the gap in a per-session marker", async () => {
    const { server, queue } = setup({ maxQueued: 5 });
    const heartbeats = [1, 2, 3].map(() => event({ event_type: "heartbeat" }));
    const answers = [1, 2, 3].map(() => event());
    [...heartbeats, ...answers].forEach(queue.enqueue);
    let queued = queue.queued();
    expect(queued.length).toBeLessThanOrEqual(5);
    for (const answer of answers) expect(queued.some((e) => e.event_id === answer.event_id)).toBe(true);
    const [marker] = overflowMarkers(queued);
    const evicted = heartbeats.filter((hb) => !queued.some((e) => e.event_id === hb.event_id));
    expect(marker.payload).toMatchObject({
      reason: "queue_capacity",
      dropped_count: evicted.length,
      dropped_by_type: { heartbeat: evicted.length },
      first_dropped_seq: evicted[0].event_seq,
      last_dropped_seq: evicted.at(-1)!.event_seq,
    });
    const gapId = (marker.payload as { gap_id: string }).gap_id;

    queue.enqueue(event()); // one more eviction in the same gap
    queued = queue.queued();
    const markers = overflowMarkers(queued);
    expect(markers).toHaveLength(1);
    expect((markers[0].payload as { gap_id: string }).gap_id).toBe(gapId);
    expect((markers[0].payload as { dropped_count: number }).dropped_count).toBe(evicted.length + 1);

    await queue.flush();
    const delivered = [...server.rows.values()].find((e) => e.event_type === OVERFLOW_EVENT_TYPE)!;
    expect(delivered).toMatchObject({ program_id: "program-1", cohort_id: "cohort-1", scholar_id: "scholar-1", session_id: "session-1", app_version: "test" });
    expect(Number.isInteger(delivered.event_seq)).toBe(true);
  });

  it("evicts the oldest event when there are no heartbeats, and never evicts the marker", () => {
    const { queue } = setup({ maxQueued: 3 });
    const events = [1, 2, 3, 4, 5].map(() => event());
    events.forEach(queue.enqueue);
    const queued = queue.queued();
    expect(queued).toHaveLength(3);
    expect(queued.at(-2)!.event_id).toBe(events[4].event_id);
    // The marker holds one of the three slots, so three of the five events were evicted.
    expect((overflowMarkers(queued)[0].payload as { dropped_by_type: Record<string, number> }).dropped_by_type).toEqual({ answer_selected: 3 });
  });

  it("keeps the marker's event_seq a valid int4 even when an evicted legacy event carried a timestamp", () => {
    const { queue } = setup({ maxQueued: 1 });
    queue.enqueue(event({ event_seq: 1_760_000_000_000 }));
    queue.enqueue(event({ event_seq: 1_760_000_000_001 }));
    const [marker] = overflowMarkers(queue.queued());
    expect(marker.event_seq).toBe(0);
  });

  it("sheds low-value events instead of throwing when storage is full", () => {
    const storage = memoryStorage(2500);
    const server = fakeServer();
    const queue = createTelemetryQueue({ storage, send: server.send, newId: () => crypto.randomUUID() });
    expect(() => {
      for (let i = 0; i < 40; i += 1) queue.enqueue(event({ event_type: i % 2 ? "heartbeat" : "answer_selected" }));
    }).not.toThrow();
    const queued = queue.queued();
    expect((storage.getItem(QUEUE_KEY) ?? "").length).toBeLessThanOrEqual(2500);
    expect(overflowMarkers(queued)).toHaveLength(1);
  });

  it("requeues dead letters so they deliver once the cause is fixed", async () => {
    const { server, queue } = setup();
    const orphan = event({ lesson_id: "lesson-not-yet-deployed" });
    server.rejectWhen(() => ({ error: { code: "23503", message: "violates foreign key constraint" }, status: 409 }));
    expect(await queue.insert(orphan)).toBe(false);
    expect(queue.deadLetters()).toHaveLength(1);
    server.rejectWhen(() => null);
    expect(queue.requeueDeadLetters()).toBe(1);
    await queue.flush();
    expect(server.rows.has(orphan.event_id)).toBe(true);
    expect(queue.deadLetters()).toEqual([]);
  });

  it("bounds the dead-letter store and counts what it discards", async () => {
    const { storage, server, queue } = setup({ maxDeadLetters: 2 });
    server.rejectWhen(() => ({ error: { code: "22P02", message: "invalid input syntax for type uuid" }, status: 400 }));
    [event(), event(), event()].forEach(queue.enqueue);
    await queue.flush();
    expect(queue.deadLetters()).toHaveLength(2);
    expect(storage.getItem(DEAD_LETTER_OVERFLOW_KEY)).toBe("1");
  });

  it("processes events left in storage by the previous queue implementation", async () => {
    const { storage, server, queue } = setup();
    const legacy = { ...event(), delivery_attempt: 7 };
    storage.setItem(QUEUE_KEY, JSON.stringify([legacy]));
    await queue.flush();
    expect(server.rows.get(legacy.event_id)?.delivery_attempt).toBe(8);
  });

  it("is listed among the pilot event types", () => {
    expect(PILOT_EVENT_TYPES).toContain(OVERFLOW_EVENT_TYPE);
  });
});
