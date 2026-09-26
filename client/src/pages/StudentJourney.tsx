import { ArrowRight, Check, CircleHelp, Clock3, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { isPlausibleAccessCode, normalizeAccessCode, PILOT_APP_VERSION } from "@shared/pilot";

type Scholar = { id: string; pseudonym: string; programId: string; cohortId: string };
type AssessmentItem = { id: string; item_order: number; prompt: string; choices: Array<{ id: string; label: string }> };
type Assessment = { id: string; kind: "pretest" | "posttest"; title: string; items: AssessmentItem[] };
type Lesson = { id: string; title: string; framework_phase: string; content: { steps?: Array<{ id: string; title: string; prompt: string }> } };

type EventContext = { sessionId: string; scholar: Scholar; seq: number };
const appVersion = PILOT_APP_VERSION;

function nowIso() { return new Date().toISOString(); }
function newSessionId() { return crypto.randomUUID(); }

async function logEvent(context: EventContext, eventType: string, payload: Record<string, unknown>, lessonId?: string, attemptId?: string) {
  await supabase.from("learning_events").insert({
    event_id: crypto.randomUUID(), program_id: context.scholar.programId, cohort_id: context.scholar.cohortId,
    scholar_id: context.scholar.id, session_id: context.sessionId, event_seq: context.seq++, event_type: eventType,
    lesson_id: lessonId ?? null, attempt_id: attemptId ?? null, occurred_at_client: nowIso(), client_monotonic_ms: Math.round(performance.now()), payload, app_version: appVersion,
  });
}

function JourneyChrome({ children, scholar, onReset }: { children: React.ReactNode; scholar?: Scholar; onReset?: () => void }) {
  return <div className="journey-page"><header className="journey-header"><Link href="/" className="journey-brand"><span className="journey-brand__glyph"><i /><i /><i /></span><span><strong>D2D</strong><small>student growth</small></span></Link><div className="journey-header__meta">{scholar ? <><span className="journey-user">{scholar.pseudonym}</span><button className="journey-reset" onClick={onReset}>Reset demo</button></> : <span><LockKeyhole size={13} /> Private pilot space</span>}</div></header>{children}</div>;
}

function AccessGate({ onSuccess }: { onSuccess: (scholar: Scholar) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function redeem(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInAnonymously();
    if (authError) { setError("Student sessions are not enabled yet. Enable Anonymous Sign-Ins in Supabase Auth, then try again."); setBusy(false); return; }
    const normalizedCode = normalizeAccessCode(code);
    if (!isPlausibleAccessCode(normalizedCode)) { setError("Enter the full access code your instructor gave you."); setBusy(false); return; }
    const { data, error: functionError } = await supabase.functions.invoke("redeem-student-access-code", { body: { code: normalizedCode } });
    if (functionError || !data?.scholar) { setError(data?.error === "too_many_attempts" ? "Too many tries. Please wait 15 minutes before trying again." : data?.error === "invalid_or_expired_code" ? "That access code is not active." : "We could not verify that code."); setBusy(false); return; }
    localStorage.setItem("d2d-scholar", JSON.stringify(data.scholar));
    onSuccess(data.scholar); setBusy(false);
  }
  return <JourneyChrome><main className="journey-gate"><div className="journey-gate__stamp"><Sparkles size={19} /> RESEARCH PILOT / STUDENT ENTRY</div><h1>Bring your<br /><em>curiosity.</em></h1><p>Enter the access code your instructor gave you. No student name or school email is needed for this pilot.</p><form onSubmit={redeem} className="code-form"><label htmlFor="student-code">Your access code</label><input id="student-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="D2D-DEMO-01" autoComplete="one-time-code" required /><button className="button button--primary" disabled={busy}>{busy ? "Checking…" : "Enter the learning space"}<ArrowRight size={16} /></button></form>{error && <div className="journey-error" role="alert">{error}</div>}<div className="journey-gate__note"><CircleHelp size={15} /> Your work is identified by a pilot pseudonym, not your name.</div></main></JourneyChrome>;
}

function AssessmentCard({ assessment, onSubmit, label }: { assessment: Assessment; onSubmit: (answers: Record<string, string>) => Promise<void>; label: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const complete = assessment.items.every((item) => answers[item.id]);
  return <section className="journey-card assessment-card"><div className="journey-card__kicker">{label} <span><Clock3 size={13} /> No countdown</span></div><h2>{assessment.title}</h2><p className="journey-card__lede">We are looking at how you notice and work through a decision. There is no penalty for taking your time.</p><div className="assessment-items">{assessment.items.map((item, index) => <fieldset key={item.id}><legend><span>0{index + 1}</span>{item.prompt}</legend><div className="assessment-options">{item.choices.map((choice) => <label key={choice.id} className={answers[item.id] === choice.id ? "is-selected" : ""}><input type="radio" name={item.id} value={choice.id} checked={answers[item.id] === choice.id} onChange={() => setAnswers((current) => ({ ...current, [item.id]: choice.id }))} />{choice.label}{answers[item.id] === choice.id && <Check size={15} />}</label>)}</div></fieldset>)}</div><button className="button button--dark" disabled={!complete || busy} onClick={async () => { setBusy(true); await onSubmit(answers); setBusy(false); }}>{busy ? "Saving…" : "Save and continue"}<ArrowRight size={16} /></button></section>;
}

function LessonCard({ lesson, context, onDone }: { lesson: Lesson; context: EventContext; onDone: () => void }) {
  const steps = lesson.content.steps ?? [];
  const [step, setStep] = useState(0);
  const [progressId, setProgressId] = useState<string | null>(null);
  useEffect(() => { void (async () => {
    const { data } = await supabase.from("lesson_progress").upsert({ program_id: context.scholar.programId, cohort_id: context.scholar.cohortId, scholar_id: context.scholar.id, lesson_id: lesson.id, status: "in_progress", current_step: steps[0]?.id ?? "notice", content_version: "pilot-1" }, { onConflict: "scholar_id,lesson_id,content_version" }).select("id").single();
    setProgressId(data?.id ?? null); await logEvent(context, "lesson_opened", { stepCount: steps.length }, lesson.id);
  })(); }, [context.scholar.cohortId, context.scholar.id, context.scholar.programId, lesson.id, steps.length]);
  async function next() {
    const nextStep = Math.min(step + 1, steps.length - 1);
    if (nextStep === step) { if (progressId) await supabase.from("lesson_progress").update({ status: "completed", current_step: steps[step]?.id, completed_at_client: nowIso(), completed_at_server: nowIso() }).eq("id", progressId); await logEvent(context, "lesson_completed", { completedStep: steps[step]?.id }, lesson.id); onDone(); return; }
    setStep(nextStep); if (progressId) await supabase.from("lesson_progress").update({ current_step: steps[nextStep]?.id, last_active_at_server: nowIso() }).eq("id", progressId); await logEvent(context, "lesson_step_viewed", { step: steps[nextStep]?.id }, lesson.id);
  }
  const current = steps[step];
  return <section className="journey-card lesson-card"><div className="lesson-card__rail"><span className="journey-card__kicker">{lesson.framework_phase}</span><div className="lesson-card__steps">{steps.map((item, index) => <button key={item.id} className={index === step ? "is-current" : index < step ? "is-done" : ""} onClick={() => setStep(index)}><span>{index < step ? <Check size={12} /> : `0${index + 1}`}</span>{item.title}</button>)}</div></div><div className="lesson-card__body"><span className="content-tag">THE MONEY YOU PAY / FIELD NOTE</span><h2>{current?.title}</h2><p>{current?.prompt}</p><div className="lesson-scenario"><span>THE MOMENT</span><strong>Your statement shows a $960 new balance and a $35 minimum payment.</strong><small>Notice first. Decide second. Carry the question forward.</small></div><button className="button button--dark" onClick={next}>{step === steps.length - 1 ? "Continue to posttest" : "I’m ready for the next step"}<ArrowRight size={16} /></button></div></section>;
}

function JourneyResult({ result, onRestart }: { result: { band: string; score: number | null; abstained: boolean; abstention_reason?: string | null }; onRestart: () => void }) {
  const title = result.abstained ? "Your result is being held with care." : result.band === "secure" ? "You found the signal." : result.band === "building" ? "Your thinking is building." : "You started the work.";
  return <section className="journey-card result-card"><div className="result-card__orb"><Sparkles size={22} /></div><span className="journey-card__kicker">PILOT RESULT / SUPPORTING CONTEXT</span><h1>{title}</h1><p>{result.abstained ? "This pilot does not force a confidence label when an accommodation or missing context makes the signal unsafe to interpret." : "A score is only one supporting signal. What matters most is how you noticed the numbers, changed your mind, and carried the question forward."}</p><div className="result-band"><span>{result.abstained ? "ABSTAINED" : result.band.toUpperCase()}</span>{result.score !== null && <strong>{result.score}<small>/ 100 context score</small></strong>}</div><button className="button button--dark" onClick={onRestart}>Return to my space <ArrowRight size={16} /></button></section>;
}

export default function StudentJourneyPage() {
  const [scholar, setScholar] = useState<Scholar | null>(null);
  const [sessionId] = useState(newSessionId);
  const [step, setStep] = useState<"pretest" | "lesson" | "posttest" | "result">("pretest");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<{ band: string; score: number | null; abstained: boolean; abstention_reason?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const context = useMemo(() => scholar ? ({ sessionId, scholar, seq: 0 } as EventContext) : null, [scholar, sessionId]);

  useEffect(() => { const saved = localStorage.getItem("d2d-scholar"); if (saved) { try { setScholar(JSON.parse(saved)); } catch { localStorage.removeItem("d2d-scholar"); } } setLoading(false); }, []);
  useEffect(() => { if (!scholar) return; void (async () => {
    setLoadError("");
    const [{ data: lessonRow, error: lessonError }, { data: pretest, error: assessmentError }] = await Promise.all([
      supabase.from("lessons").select("id,title,framework_phase,content").eq("slug", "the-money-you-pay").single(),
      supabase.from("assessments").select("id,kind,title").eq("kind", "pretest").eq("status", "published").single(),
    ]);
    if (lessonError || assessmentError || !lessonRow || !pretest) { setLoadError("Your pilot content is not available for this session yet."); return; }
    const { data: preItems } = await supabase.from("assessment_items").select("id,item_order,prompt,choices").eq("assessment_id", pretest.id).order("item_order");
    const { data: posttest } = await supabase.from("assessments").select("id,kind,title").eq("kind", "posttest").eq("status", "published").single();
    const { data: postItems } = posttest ? await supabase.from("assessment_items").select("id,item_order,prompt,choices").eq("assessment_id", posttest.id).order("item_order") : { data: [] };
    setLesson(lessonRow as Lesson); setAssessment({ ...pretest, items: (preItems ?? []) as AssessmentItem[] } as Assessment);
    if (posttest) localStorage.setItem("d2d-posttest", JSON.stringify({ ...posttest, items: (postItems ?? []) as AssessmentItem[] }));
  })(); }, [scholar]);
  useEffect(() => {
    if (!context) return;
    let idleTimer: number | undefined;
    let isIdle = false;
    const emit = (eventType: string, payload: Record<string, unknown>) => { void logEvent(context, eventType, payload, lesson?.id, attemptId ?? undefined); };
    const resetIdle = () => {
      if (isIdle) { isIdle = false; emit("idle_ended", { reason: "activity" }); }
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { isIdle = true; emit("idle_started", { thresholdMs: 60000 }); }, 60000);
    };
    const onVisibility = () => emit(document.visibilityState === "hidden" ? "visibility_hidden" : "visibility_visible", { visibility: document.visibilityState });
    const onBlur = () => emit("visibility_hidden", { reason: "window_blur" });
    const onFocus = () => { emit("visibility_visible", { reason: "window_focus" }); resetIdle(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pointerdown", resetIdle);
    window.addEventListener("keydown", resetIdle);
    resetIdle();
    return () => { window.clearTimeout(idleTimer); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("blur", onBlur); window.removeEventListener("focus", onFocus); window.removeEventListener("pointerdown", resetIdle); window.removeEventListener("keydown", resetIdle); };
  }, [attemptId, context, lesson?.id]);

  async function startAttempt(current: Assessment) {
    if (!context) throw new Error("No scholar context");
    const { data: latest } = await supabase.from("assessment_attempts").select("attempt_number").eq("scholar_id", scholar!.id).eq("assessment_id", current.id).order("attempt_number", { ascending: false }).limit(1).maybeSingle();
    const { data } = await supabase.from("assessment_attempts").insert({ program_id: scholar!.programId, cohort_id: scholar!.cohortId, scholar_id: scholar!.id, assessment_id: current.id, attempt_number: (latest?.attempt_number ?? 0) + 1, started_at_client: nowIso() }).select("id").single();
    if (!data) throw new Error("Attempt could not be created");
    setAttemptId(data.id); await logEvent(context, "assessment_started", { kind: current.kind }, lesson?.id, data.id); return data.id;
  }
  async function submitAssessment(answers: Record<string, string>, kind: "pretest" | "posttest") {
    if (!context || !assessment) return;
    const current = kind === "pretest" ? assessment : JSON.parse(localStorage.getItem("d2d-posttest") ?? "null") as Assessment;
    const id = await startAttempt(current);
    await supabase.from("assessment_responses").insert(Object.entries(answers).map(([itemId, value]) => ({ program_id: scholar!.programId, cohort_id: scholar!.cohortId, scholar_id: scholar!.id, attempt_id: id, item_id: itemId, response_value: value, changed_at_client: nowIso(), is_final: true })));
    await logEvent(context, "assessment_submitted", { kind, answerCount: Object.keys(answers).length }, lesson?.id, id);
    if (kind === "pretest") setStep("lesson");
    else { const { data, error } = await supabase.functions.invoke("score-assessment-attempt", { body: { attemptId: id } }); if (error || !data?.result) { setLoadError("Your responses were saved, but the result could not be generated yet."); return; } setResult(data.result); setStep("result"); }
  }
  function reset() { localStorage.removeItem("d2d-scholar"); localStorage.removeItem("d2d-posttest"); void supabase.auth.signOut(); setScholar(null); setStep("pretest"); setResult(null); }
  if (loading) return <JourneyChrome><div className="journey-loading"><RefreshCw className="spin" /> Loading your learning space…</div></JourneyChrome>;
  if (!scholar) return <AccessGate onSuccess={setScholar} />;
  if (loadError) return <JourneyChrome scholar={scholar} onReset={reset}><div className="journey-loading"><p>{loadError}</p><button className="button button--dark" onClick={() => window.location.reload()}>Try again</button></div></JourneyChrome>;
  return <JourneyChrome scholar={scholar} onReset={reset}><main className="journey-main"><div className="journey-progress"><span className={step === "pretest" ? "is-current" : "is-done"}>01 / NOTICE</span><span className={step === "lesson" ? "is-current" : step === "posttest" || step === "result" ? "is-done" : ""}>02 / TRY</span><span className={step === "posttest" ? "is-current" : step === "result" ? "is-done" : ""}>03 / CARRY</span></div>{step === "pretest" && assessment && <AssessmentCard assessment={assessment} label="STARTING POINT" onSubmit={(answers) => submitAssessment(answers, "pretest")} />}{step === "lesson" && lesson && context && <LessonCard lesson={lesson} context={context} onDone={() => setStep("posttest")} />}{step === "posttest" && <AssessmentCard assessment={JSON.parse(localStorage.getItem("d2d-posttest") ?? "null") as Assessment} label="REFLECTION POINT" onSubmit={(answers) => submitAssessment(answers, "posttest")} />}{step === "result" && result && <JourneyResult result={result} onRestart={() => setStep("pretest")} />}</main></JourneyChrome>;
}
