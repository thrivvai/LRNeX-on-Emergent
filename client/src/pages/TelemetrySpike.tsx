import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Radio, RotateCcw, Wifi } from "lucide-react";
import { Link } from "wouter";
import { insertTelemetryEvent } from "@/lib/telemetry";
import { HEARTBEAT_INTERVAL_MS, IDLE_THRESHOLD_MS } from "@shared/pilot";

type SpikeEvent = { event_id: string; event_type: string; occurred_at_client: string; item_id?: string; payload?: Record<string, unknown>; delivery?: "sent" | "queued" };
const STORAGE_KEY = "d2d-telemetry-spike-log-v1";
const SESSION_KEY = "d2d-telemetry-spike-session-v1";

function loadEvents(): SpikeEvent[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SpikeEvent[]; } catch { return []; } }

export default function TelemetrySpike() {
  const [events, setEvents] = useState<SpikeEvent[]>(loadEvents);
  const [answer, setAnswer] = useState("new_balance");
  const [online, setOnline] = useState(navigator.onLine);
  const [active, setActive] = useState(document.visibilityState === "visible");
  const [lastDwellMs, setLastDwellMs] = useState(0);
  const itemEnteredAt = useRef<number>(performance.now());
  const revision = useRef(0);
  const sessionId = useMemo(() => localStorage.getItem(SESSION_KEY) ?? crypto.randomUUID(), []);

  useEffect(() => { localStorage.setItem(SESSION_KEY, sessionId); }, [sessionId]);
  useEffect(() => {
    const append = async (eventType: string, payload: Record<string, unknown> = {}) => {
      const event: SpikeEvent = { event_id: crypto.randomUUID(), event_type: eventType, occurred_at_client: new Date().toISOString(), item_id: "spike-item-1", payload: { ...payload, session_id: sessionId, client_monotonic_ms: Math.round(performance.now()) } };
      const delivered = await insertTelemetryEvent({ event_id: event.event_id, program_id: "00000000-0000-0000-0000-000000000000", cohort_id: "00000000-0000-0000-0000-000000000000", scholar_id: "00000000-0000-0000-0000-000000000000", session_id: sessionId, event_seq: loadEvents().length + 1, event_type: eventType, occurred_at_client: event.occurred_at_client, client_monotonic_ms: Number(event.payload?.client_monotonic_ms), payload: event.payload, app_version: "telemetry-spike" });
      const next = [...loadEvents(), { ...event, delivery: delivered ? ("sent" as const) : ("queued" as const) }].slice(-200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setEvents(next);
    };
    const onVisibility = () => { setActive(document.visibilityState === "visible"); void append(document.visibilityState === "visible" ? "visibility_visible" : "visibility_hidden"); };
    const onFocus = () => void append("window_focused"); const onBlur = () => void append("window_blurred");
    const onOnline = () => { setOnline(true); void append("telemetry_network_online"); }; const onOffline = () => { setOnline(false); void append("telemetry_network_offline"); };
    const heartbeat = window.setInterval(() => void append("heartbeat", { active: document.visibilityState === "visible" }), HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility); window.addEventListener("focus", onFocus); window.addEventListener("blur", onBlur); window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    void append("telemetry_spike_opened");
    return () => { window.clearInterval(heartbeat); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("focus", onFocus); window.removeEventListener("blur", onBlur); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [sessionId]);

  const recordDwell = () => { const dwellMs = Math.max(0, Math.round(performance.now() - itemEnteredAt.current)); setLastDwellMs(dwellMs); itemEnteredAt.current = performance.now(); };
  const recordAnswer = (value: string) => { revision.current += 1; setAnswer(value); void insertTelemetryEvent({ event_id: crypto.randomUUID(), program_id: "00000000-0000-0000-0000-000000000000", cohort_id: "00000000-0000-0000-0000-000000000000", scholar_id: "00000000-0000-0000-0000-000000000000", session_id: sessionId, event_seq: events.length + revision.current, event_type: revision.current === 1 ? "answer_selected" : "answer_changed", occurred_at_client: new Date().toISOString(), client_monotonic_ms: Math.round(performance.now()), payload: { item_id: "spike-item-1", value, revision_number: revision.current }, app_version: "telemetry-spike" }); };
  const exportLog = () => { const blob = new Blob([JSON.stringify({ sessionId, exportedAt: new Date().toISOString(), events: loadEvents() }, null, 2)], { type: "application/json" }); const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = `d2d-telemetry-spike-${sessionId}.json`; anchor.click(); URL.revokeObjectURL(anchor.href); };
  const reset = () => { localStorage.removeItem(STORAGE_KEY); revision.current = 0; setEvents([]); itemEnteredAt.current = performance.now(); };

  return <main className="telemetry-spike-page"><header><Link href="/" className="spike-back"><ArrowLeft size={16} /> D2D pilot</Link><span className="spike-kicker"><Radio size={14} /> Telemetry spike</span></header><section className="spike-card"><div className="spike-status"><span className={online ? "status-dot online" : "status-dot"} /> {online ? "Network available" : "Offline mode"}<span className={active ? "status-pill active" : "status-pill"}>{active ? "Visible" : "Hidden"}</span></div><h1>Instrument the moment.</h1><p>Use this page on a real Android phone or iPad. Switch apps, lock the screen, answer twice, wait, go offline, and return. The log is synthetic and pseudonymous.</p><div className="spike-actions"><button onClick={() => { recordDwell(); void insertTelemetryEvent({ event_id: crypto.randomUUID(), program_id: "00000000-0000-0000-0000-000000000000", cohort_id: "00000000-0000-0000-0000-000000000000", scholar_id: "00000000-0000-0000-0000-000000000000", session_id: sessionId, event_seq: events.length + 1, event_type: "assessment_item_exited", occurred_at_client: new Date().toISOString(), client_monotonic_ms: Math.round(performance.now()), payload: { dwell_ms: lastDwellMs }, app_version: "telemetry-spike" }); }}><Wifi size={16} /> Record dwell boundary</button><button className="spike-secondary" onClick={exportLog}><Download size={16} /> Export log</button><button className="spike-secondary" onClick={reset}><RotateCcw size={16} /> Reset</button></div><div className="spike-question"><span>SP-01 · credit-card statement</span><h2>Which number tells you what you owe?</h2>{["new_balance", "minimum", "apr"].map((choice) => <label key={choice}><input type="radio" checked={answer === choice} onChange={() => recordAnswer(choice)} /> {choice.replace("_", " ")}</label>)}<small>Revision {revision.current} · Last dwell boundary {lastDwellMs} ms · Idle threshold {IDLE_THRESHOLD_MS / 1000}s</small></div><div className="spike-log"><div><strong>{events.length}</strong><span>events captured</span></div><div><strong>{events.filter((event) => event.delivery === "queued").length}</strong><span>queued locally</span></div><div><strong>{sessionId.slice(0, 8)}</strong><span>session</span></div></div><ol className="spike-events">{events.slice(-12).reverse().map((event) => <li key={event.event_id}><span>{event.event_type}</span><time>{new Date(event.occurred_at_client).toLocaleTimeString()}</time><em>{event.delivery ?? "local"}</em></li>)}</ol></section></main>;
}
