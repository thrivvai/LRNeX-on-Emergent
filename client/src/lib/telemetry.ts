import { supabase } from "@/lib/supabase";
import { createTelemetryQueue, type TelemetryEvent } from "@/lib/telemetryQueue";

const queue = createTelemetryQueue({
  storage: window.localStorage,
  // `defaultToNull: false`: a column some rows of a batch omit takes its database default (several are
  // NOT NULL with defaults) instead of the NULL a multi-row insert would otherwise fill in.
  send: async (events) => {
    const { error, status } = await supabase.from("learning_events").insert(events, { defaultToNull: false });
    return { error, status };
  },
});

/** Queues the event, then flushes. Resolves true once this event is stored server-side. */
export const insertTelemetryEvent = (event: TelemetryEvent) => queue.insert(event);
export const flushTelemetryQueue = () => queue.flush();
/** Events the server rejected outright, with its reason. Kept locally for export and diagnosis. */
export const readTelemetryDeadLetters = () => queue.deadLetters();
/** Moves dead letters back into the queue, e.g. after a deploy fixes the cause of the rejection. */
export const requeueTelemetryDeadLetters = () => queue.requeueDeadLetters();
