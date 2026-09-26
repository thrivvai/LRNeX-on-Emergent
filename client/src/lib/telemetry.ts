import { supabase } from "@/lib/supabase";

const QUEUE_KEY = "d2d-telemetry-queue-v1";

type QueuedEvent = Record<string, unknown> & { event_id: string; delivery_attempt?: number };
let flushInFlight: Promise<{ sent: number; remaining: number }> | null = null;

function readQueue(): QueuedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedEvent[];
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedEvent[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-500)));
}

export async function flushTelemetryQueue() {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
  const queued = readQueue();
  if (!queued.length) return { sent: 0, remaining: 0 };
  const remaining: QueuedEvent[] = [];
  let sent = 0;
  for (const event of queued) {
    const { error } = await supabase.from("learning_events").insert({ ...event, delivery_attempt: Number(event.delivery_attempt ?? 1) + 1 });
    if (error) remaining.push({ ...event, delivery_attempt: Number(event.delivery_attempt ?? 1) + 1 });
    else sent += 1;
  }
  writeQueue(remaining);
  return { sent, remaining: remaining.length };
  })();
  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

export async function insertTelemetryEvent(event: QueuedEvent) {
  const queue = readQueue();
  if (!queue.some((queued) => queued.event_id === event.event_id)) {
    queue.push({ ...event, delivery_attempt: Number(event.delivery_attempt ?? 0) + 1 });
    writeQueue(queue);
  }
  await flushTelemetryQueue();
  return !readQueue().some((queued) => queued.event_id === event.event_id);
}
