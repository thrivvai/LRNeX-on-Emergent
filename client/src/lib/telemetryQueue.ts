/**
 * Durable delivery queue for research telemetry (`learning_events`).
 *
 * Every event ends up in exactly one place, and nothing leaves the queue silently:
 *  - delivered:   removed. A duplicate-key rejection counts as delivered, because the row already exists.
 *  - retry:       kept when the failure is transient (offline, timeout, expired session, 5xx).
 *  - dead letter: moved to a bounded side store, with the server's reason, when the server rejected the
 *                 event outright (RLS, constraint, malformed data). Retrying those can never succeed.
 *  - overflow:    past the cap, the oldest heartbeat is evicted first (a regenerable liveness signal),
 *                 otherwise the oldest event. A per-session `telemetry_queue_overflow` marker records
 *                 exactly what was evicted, so analysis sees the gap instead of a silently truncated stream.
 *
 * Concurrency: every queue mutation is a synchronous read-modify-write of current storage, which is
 * atomic on the JS event loop. A flush never writes back a snapshot taken before an `await`, so events
 * enqueued while a flush is in flight are never clobbered.
 */

export type TelemetryEvent = Record<string, unknown> & { event_id: string };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type DeliveryError = { code?: string | null; message?: string | null };
/** `status` is the HTTP status; 0 means the request never reached the server. */
export type DeliveryResult = { error: DeliveryError | null; status?: number };
export type DeliveryOutcome = "delivered" | "retry" | "dead_letter";

export type DeadLetter = {
  event: TelemetryEvent;
  reason: { code: string | null; message: string | null; status: number | null; retriesExhausted?: boolean };
  dead_lettered_at: string;
};

export type FlushSummary = { delivered: number; retrying: number; deadLettered: number; remaining: number };

export type TelemetryQueueOptions = {
  storage: StorageLike;
  /** Inserts a batch atomically: one bad row fails the whole batch. */
  send: (events: TelemetryEvent[]) => Promise<DeliveryResult>;
  maxQueued?: number;
  maxDeadLetters?: number;
  /** Server-side transient failures in a row before an event is dead-lettered. Offline never counts. */
  maxServerRetries?: number;
  batchSize?: number;
  now?: () => string;
  newId?: () => string;
};

export const QUEUE_KEY = "d2d-telemetry-queue-v1";
export const DEAD_LETTER_KEY = "d2d-telemetry-dead-letters-v1";
export const DEAD_LETTER_OVERFLOW_KEY = "d2d-telemetry-dead-letter-overflow-v1";
export const OVERFLOW_EVENT_TYPE = "telemetry_queue_overflow";

const DUPLICATE_KEY = "23505";
// Retrying can succeed: connection exception (08), insufficient resources (53), operator intervention
// including statement timeout (57), serialization failure, deadlock, and expired or invalid JWTs (the
// client refreshes the session before the next flush).
const TRANSIENT_SQLSTATE_CLASSES = ["08", "53", "57"];
const TRANSIENT_CODES = new Set(["40001", "40P01", "PGRST301", "PGRST302", "PGRST303"]);
const INT4_MAX = 2_147_483_647;

export function classifyDeliveryFailure(error: DeliveryError, status?: number): DeliveryOutcome {
  const code = error.code ?? "";
  if (code === DUPLICATE_KEY) return "delivered";
  if (TRANSIENT_CODES.has(code) || TRANSIENT_SQLSTATE_CLASSES.some((prefix) => code.startsWith(prefix))) return "retry";
  if (status === 0 || status === 408 || status === 429 || (status ?? 0) >= 500) return "retry";
  // The database answered with a definite reason. Without a code we cannot be sure it saw the request.
  return code ? "dead_letter" : "retry";
}

type OverflowPayload = {
  gap_id: string;
  reason: "queue_capacity";
  dropped_count: number;
  dropped_by_type: Record<string, number>;
  first_dropped_seq: number | null;
  last_dropped_seq: number | null;
  oldest_dropped_at: string | null;
  newest_dropped_at: string | null;
};

type Settled = { event: TelemetryEvent; outcome: DeliveryOutcome; result: DeliveryResult };

const lower = (a: number | null | undefined, b: number | null) => (a == null ? b : b == null ? a : Math.min(a, b));
const higher = (a: number | null | undefined, b: number | null) => (a == null ? b : b == null ? a : Math.max(a, b));

export function createTelemetryQueue(options: TelemetryQueueOptions) {
  const { storage, send } = options;
  const maxQueued = options.maxQueued ?? 2000;
  const maxDeadLetters = options.maxDeadLetters ?? 500;
  const maxServerRetries = options.maxServerRetries ?? 50;
  const batchSize = options.batchSize ?? 50;
  const now = options.now ?? (() => new Date().toISOString());
  const newId = options.newId ?? (() => crypto.randomUUID());
  const delivered = new Set<string>();
  let running: Promise<FlushSummary> | null = null;
  let followUp: Promise<FlushSummary> | null = null;

  function readList<T>(key: string): T[] {
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? "[]");
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  function rememberDelivered(eventId: string) {
    delivered.add(eventId);
    if (delivered.size > 1000) delivered.delete(delivered.values().next().value as string);
  }

  function seqOf(event: TelemetryEvent): number | null {
    const seq = Number(event.event_seq);
    return Number.isInteger(seq) && seq >= 0 && seq <= INT4_MAX ? seq : null;
  }

  // Records an evicted event in its session's overflow marker. The marker is replaced rather than edited,
  // so a copy already in flight is never mutated under it; all copies share a `gap_id`, and analysis takes
  // the latest count per gap.
  function recordGap(queue: TelemetryEvent[], victim: TelemetryEvent) {
    const { program_id, cohort_id, scholar_id, session_id } = victim;
    if (!program_id || !cohort_id || !scholar_id || !session_id) return;
    const index = queue.findIndex((event) => event.event_type === OVERFLOW_EVENT_TYPE && event.session_id === session_id);
    const previous = index >= 0 ? (queue[index].payload as OverflowPayload) : undefined;
    const type = String(victim.event_type ?? "unknown");
    const seq = seqOf(victim);
    const at = typeof victim.occurred_at_client === "string" ? victim.occurred_at_client : null;
    const payload: OverflowPayload = {
      gap_id: previous?.gap_id ?? newId(),
      reason: "queue_capacity",
      dropped_count: (previous?.dropped_count ?? 0) + 1,
      dropped_by_type: { ...previous?.dropped_by_type, [type]: (previous?.dropped_by_type[type] ?? 0) + 1 },
      first_dropped_seq: lower(previous?.first_dropped_seq, seq),
      last_dropped_seq: higher(previous?.last_dropped_seq, seq),
      oldest_dropped_at: previous?.oldest_dropped_at ?? at,
      newest_dropped_at: at ?? previous?.newest_dropped_at ?? null,
    };
    if (index >= 0) queue.splice(index, 1);
    queue.push({
      event_id: newId(),
      program_id,
      cohort_id,
      scholar_id,
      session_id,
      event_seq: payload.last_dropped_seq ?? 0,
      event_type: OVERFLOW_EVENT_TYPE,
      occurred_at_client: now(),
      app_version: victim.app_version ?? "unknown",
      payload,
      delivery_attempt: 0,
    });
  }

  function evictOne(queue: TelemetryEvent[]): boolean {
    let index = queue.findIndex((event) => event.event_type === "heartbeat");
    if (index < 0) index = queue.findIndex((event) => event.event_type !== OVERFLOW_EVENT_TYPE);
    if (index < 0) return false;
    const [victim] = queue.splice(index, 1);
    recordGap(queue, victim);
    return true;
  }

  function writeQueue(queue: TelemetryEvent[]) {
    while (queue.length > maxQueued && evictOne(queue)) { /* shed to the cap */ }
    for (;;) {
      try {
        storage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return;
      } catch (error) {
        // Storage quota exceeded: shed the lowest-value event (recorded in the marker) and try again.
        if (!evictOne(queue)) throw error;
      }
    }
  }

  function appendDeadLetters(entries: DeadLetter[]) {
    const all = [...readList<DeadLetter>(DEAD_LETTER_KEY), ...entries];
    const overflow = Math.max(0, all.length - maxDeadLetters);
    if (overflow) storage.setItem(DEAD_LETTER_OVERFLOW_KEY, String(Number(storage.getItem(DEAD_LETTER_OVERFLOW_KEY) ?? 0) + overflow));
    storage.setItem(DEAD_LETTER_KEY, JSON.stringify(all.slice(overflow)));
  }

  function enqueue(event: TelemetryEvent) {
    const queue = readList<TelemetryEvent>(QUEUE_KEY);
    if (delivered.has(event.event_id) || queue.some((queued) => queued.event_id === event.event_id)) return;
    queue.push({ ...event, delivery_attempt: 0 });
    writeQueue(queue);
  }

  async function sendSafely(events: TelemetryEvent[]): Promise<DeliveryResult> {
    try {
      return await send(events);
    } catch (error) {
      return { error: { code: null, message: error instanceof Error ? error.message : String(error) }, status: 0 };
    }
  }

  // A multi-row insert is atomic and its error names no row, so a definite rejection is split in half
  // until the offending event is isolated; the valid events around it are still delivered.
  async function deliver(events: TelemetryEvent[]): Promise<Settled[]> {
    const result = await sendSafely(events);
    if (!result.error) return events.map((event) => ({ event, outcome: "delivered" as const, result }));
    const outcome = classifyDeliveryFailure(result.error, result.status);
    if (outcome === "retry" || events.length === 1) return events.map((event) => ({ event, outcome, result }));
    const middle = Math.ceil(events.length / 2);
    return [...(await deliver(events.slice(0, middle))), ...(await deliver(events.slice(middle)))];
  }

  // Applies a batch's outcomes to the *current* queue in one synchronous read-modify-write.
  function settle(results: Settled[]) {
    const counts = { delivered: 0, retrying: 0, deadLettered: 0 };
    const retryAttempts = new Map<string, number>();
    const settledIds = new Set<string>();
    const deadLetters: DeadLetter[] = [];
    for (const { event, outcome, result } of results) {
      const attempts = Number(event.delivery_attempt);
      const exhausted = outcome === "retry" && result.status !== 0 && attempts >= maxServerRetries;
      settledIds.add(event.event_id);
      if (outcome === "delivered") {
        rememberDelivered(event.event_id);
        counts.delivered += 1;
      } else if (outcome === "retry" && !exhausted) {
        retryAttempts.set(event.event_id, attempts);
        counts.retrying += 1;
      } else {
        counts.deadLettered += 1;
        deadLetters.push({
          event,
          reason: { code: result.error?.code ?? null, message: result.error?.message ?? null, status: result.status ?? null, ...(exhausted ? { retriesExhausted: true } : {}) },
          dead_lettered_at: now(),
        });
      }
    }
    const queue = readList<TelemetryEvent>(QUEUE_KEY).flatMap((event) => {
      if (!settledIds.has(event.event_id)) return [event];
      const attempts = retryAttempts.get(event.event_id);
      return attempts === undefined ? [] : [{ ...event, delivery_attempt: attempts }];
    });
    writeQueue(queue);
    if (deadLetters.length) appendDeadLetters(deadLetters);
    return counts;
  }

  // Sends in FIFO batches, re-reading the queue each round so events enqueued mid-flush are included.
  // Each event is attempted at most once per drain; the drain stops early when the network is down.
  async function drain(): Promise<FlushSummary> {
    const summary: FlushSummary = { delivered: 0, retrying: 0, deadLettered: 0, remaining: 0 };
    const attempted = new Set<string>();
    for (;;) {
      const batch = readList<TelemetryEvent>(QUEUE_KEY).filter((event) => !attempted.has(event.event_id)).slice(0, batchSize);
      if (!batch.length) break;
      batch.forEach((event) => attempted.add(event.event_id));
      const results = await deliver(batch.map((event) => ({ ...event, delivery_attempt: Number(event.delivery_attempt ?? 0) + 1 })));
      const counts = settle(results);
      summary.delivered += counts.delivered;
      summary.retrying += counts.retrying;
      summary.deadLettered += counts.deadLettered;
      if (results.some((settled) => settled.outcome === "retry" && settled.result.status === 0)) break;
    }
    summary.remaining = readList<TelemetryEvent>(QUEUE_KEY).length;
    return summary;
  }

  // Coalesces concurrent callers: one drain in flight, plus at most one follow-up for anything enqueued
  // after the in-flight drain's last read.
  function flush(): Promise<FlushSummary> {
    if (!running) {
      running = drain().finally(() => {
        running = null;
      });
      return running;
    }
    if (!followUp) {
      followUp = running.then(() => {
        followUp = null;
        return flush();
      });
    }
    return followUp;
  }

  async function insert(event: TelemetryEvent): Promise<boolean> {
    enqueue(event);
    await flush();
    return delivered.has(event.event_id);
  }

  function requeueDeadLetters(): number {
    const deadLetters = readList<DeadLetter>(DEAD_LETTER_KEY);
    if (!deadLetters.length) return 0;
    const queue = readList<TelemetryEvent>(QUEUE_KEY);
    const queuedIds = new Set(queue.map((event) => event.event_id));
    for (const { event } of deadLetters) if (!queuedIds.has(event.event_id)) queue.push({ ...event, delivery_attempt: 0 });
    writeQueue(queue);
    storage.setItem(DEAD_LETTER_KEY, "[]");
    return deadLetters.length;
  }

  return {
    enqueue,
    flush,
    insert,
    requeueDeadLetters,
    queued: () => readList<TelemetryEvent>(QUEUE_KEY),
    deadLetters: () => readList<DeadLetter>(DEAD_LETTER_KEY),
  };
}
