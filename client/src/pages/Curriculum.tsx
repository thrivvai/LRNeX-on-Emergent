import { ArrowLeft, ArrowRight, BookOpen, Check, CircleHelp, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { insertTelemetryEvent } from "@/lib/telemetry";
import { CURRICULUM_CONTENT_VERSION, D2D_CURRICULUM, type CurriculumModule } from "@shared/curriculum";
import { PILOT_APP_VERSION } from "@shared/pilot";

type Scholar = { id: string; pseudonym: string; programId: string; cohortId: string };
const PROGRESS_KEY = "d2d-curriculum-progress-v1";

function readProgress(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") as Record<string, number>; } catch { return {}; }
}

function CurriculumChrome({ scholar, children, onReset }: { scholar: Scholar; children: React.ReactNode; onReset: () => void }) {
  return <div className="curriculum-page"><header className="journey-header"><Link href="/student" className="journey-brand"><span className="journey-brand__glyph"><i /><i /><i /></span><span><strong>D2D</strong><small>student growth</small></span></Link><div className="journey-header__meta"><span className="journey-user">{scholar.pseudonym}</span><button className="journey-reset" onClick={onReset}>Reset demo</button></div></header>{children}</div>;
}

export default function CurriculumPage() {
  const [scholar, setScholar] = useState<Scholar | null>(null);
  const [selectedId, setSelectedId] = useState(D2D_CURRICULUM[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, number>>(readProgress);
  const [practiceAnswer, setPracticeAnswer] = useState<string | null>(null);
  const [practiceRevision, setPracticeRevision] = useState(0);
  const [saved, setSaved] = useState(false);
  // One telemetry session per visit with a monotonic sequence, as in StudentJourney. `event_seq` is an
  // int4 column, so it can't hold a timestamp.
  const session = useRef({ id: crypto.randomUUID(), seq: 0 });
  const selected = useMemo(() => D2D_CURRICULUM.find((module) => module.id === selectedId) ?? D2D_CURRICULUM[0], [selectedId]);
  const currentStep = selected.steps[stepIndex] ?? selected.steps[0];
  const completedSteps = progress[selected.id] ?? 0;
  const isComplete = completedSteps >= selected.steps.length;

  useEffect(() => {
    const stored = localStorage.getItem("d2d-scholar");
    if (stored) { try { setScholar(JSON.parse(stored) as Scholar); } catch { localStorage.removeItem("d2d-scholar"); } }
  }, []);

  useEffect(() => {
    setStepIndex(Math.min(progress[selected.id] ?? 0, selected.steps.length - 1));
    setPracticeAnswer(null); setPracticeRevision(0); setSaved(false);
  }, [selected.id, selected.steps.length]);

  async function log(eventType: "lesson_opened" | "lesson_step_viewed" | "lesson_completed" | "answer_selected" | "answer_changed", payload: Record<string, unknown>) {
    if (!scholar) return;
    await insertTelemetryEvent({
      event_id: crypto.randomUUID(), program_id: scholar.programId, cohort_id: scholar.cohortId, scholar_id: scholar.id,
      session_id: session.current.id, event_seq: session.current.seq++, event_type: eventType,
      // Curriculum steps are scenes, not assessment items: `item_id` is a uuid FK to assessment_items.
      event_version: "2", lesson_id: selected.lessonId, scene_id: currentStep.id, occurred_at_client: new Date().toISOString(),
      client_monotonic_ms: Math.round(performance.now()), payload, app_version: PILOT_APP_VERSION,
    });
  }

  async function selectModule(module: CurriculumModule) {
    setSelectedId(module.id); setStepIndex(progress[module.id] ?? 0); setSaved(false);
    await log("lesson_opened", { module: module.slug, status: module.status });
  }

  async function saveStep() {
    const nextProgress = Math.max(progress[selected.id] ?? 0, stepIndex + 1);
    const next = { ...progress, [selected.id]: nextProgress };
    setProgress(next); localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); setSaved(true);
    if (scholar) {
      await supabase.from("lesson_progress").upsert({ program_id: scholar.programId, cohort_id: scholar.cohortId, scholar_id: scholar.id, lesson_id: selected.lessonId, status: nextProgress >= selected.steps.length ? "completed" : "in_progress", current_step: currentStep.id, content_version: CURRICULUM_CONTENT_VERSION, completed_at_client: nextProgress >= selected.steps.length ? new Date().toISOString() : null }, { onConflict: "scholar_id,lesson_id,content_version" });
    }
    await log(nextProgress >= selected.steps.length ? "lesson_completed" : "lesson_step_viewed", { step: currentStep.id, completed: nextProgress >= selected.steps.length });
    if (stepIndex < selected.steps.length - 1) setStepIndex(stepIndex + 1);
  }

  function answerPractice(value: string) {
    const nextRevision = practiceRevision + 1; setPracticeRevision(nextRevision); setPracticeAnswer(value);
    void log(nextRevision > 1 ? "answer_changed" : "answer_selected", { value, revision_number: nextRevision, correct: value === currentStep.practice?.answer });
  }

  function reset() { localStorage.removeItem("d2d-scholar"); localStorage.removeItem(PROGRESS_KEY); void supabase.auth.signOut(); setScholar(null); }

  if (!scholar) return <div className="curriculum-gate"><BookOpen size={32} /><h1>Enter your learning space first.</h1><p>Use your student access code to open the D2D curriculum.</p><Link className="button button--dark" href="/student">Go to student entry <ArrowRight size={16} /></Link></div>;

  return <CurriculumChrome scholar={scholar} onReset={reset}><main className="curriculum-main"><div className="curriculum-heading"><div><Link href="/student" className="back-link"><ArrowLeft size={15} /> Back to my journey</Link><div className="journey-gate__stamp"><Sparkles size={17} /> D2D LEARNING SPACE / FOUR FIELD NOTES</div><h1>Practice the way<br /><em>you think.</em></h1><p>Each module gives you a real situation, a decision to make, and a question to carry forward. Take your time. Your process is part of the work.</p></div><div className="curriculum-heading__note"><LockKeyhole size={15} /><span>Research pilot<br /><strong>No countdowns. No names.</strong></span></div></div><div className="curriculum-layout"><nav className="module-list" aria-label="D2D curriculum modules"><div className="module-list__label">YOUR ROADMAP</div>{D2D_CURRICULUM.map((module, index) => { const done = (progress[module.id] ?? 0) >= module.steps.length; return <button key={module.id} className={`module-tile ${module.id === selected.id ? "is-selected" : ""}`} onClick={() => void selectModule(module)} aria-current={module.id === selected.id ? "step" : undefined}><span className="module-tile__number">0{index + 1}</span><span className="module-tile__body"><strong>{module.title}</strong><small>{module.eyebrow}</small><em>{done ? "Complete" : module.status === "active" ? "In progress" : "Available"}</em></span>{done ? <Check size={16} /> : <ArrowRight size={15} />}</button>; })}<div className="module-list__legend"><CircleHelp size={14} /><span>Modules are designed for practice, not speed. You can return to any completed field note.</span></div></nav><section className="lesson-view" aria-labelledby="lesson-title"><div className="lesson-view__meta"><span className="content-tag">{selected.eyebrow}</span><span>{selected.standards.join(" · ")}</span></div><div className="lesson-view__header"><div><span className="lesson-view__phase">{selected.phase.toUpperCase()} / {stepIndex + 1} OF {selected.steps.length}</span><h2 id="lesson-title">{selected.title}</h2><p>{selected.description}</p></div><div className="lesson-view__progress" aria-label={`${Math.round(((progress[selected.id] ?? 0) / selected.steps.length) * 100)} percent complete`}><span>{Math.round(((progress[selected.id] ?? 0) / selected.steps.length) * 100)}%</span><i><b style={{ width: `${Math.round(((progress[selected.id] ?? 0) / selected.steps.length) * 100)}%` }} /></i></div></div><div className="lesson-view__step"><div className="lesson-view__step-label">{currentStep.label}</div><h3>{currentStep.title}</h3><p>{currentStep.body}</p>{currentStep.callout && <div className="lesson-view__callout"><span>KEEP THIS IN VIEW</span><strong>{currentStep.callout}</strong></div>}{currentStep.practice && <fieldset className="practice-card"><legend>{currentStep.practice.prompt}</legend><div className="practice-options">{currentStep.practice.choices.map((choice) => <label key={choice.id} className={practiceAnswer === choice.id ? "is-selected" : ""}><input type="radio" name={`practice-${selected.id}-${currentStep.id}`} checked={practiceAnswer === choice.id} onChange={() => answerPractice(choice.id)} />{choice.label}{practiceAnswer === choice.id && <Check size={15} />}</label>)}</div>{practiceAnswer && <p className={practiceAnswer === currentStep.practice.answer ? "practice-feedback is-correct" : "practice-feedback"}>{practiceAnswer === currentStep.practice.answer ? "That is the signal." : "Look again at what the number measures."} {currentStep.practice.explanation}</p>}</fieldset>}</div><div className="lesson-view__footer"><span>{saved ? "Saved to your learning space" : isComplete ? "Complete — revisit any time" : "Your place saves as you move"}</span><div><button className="button button--soft" onClick={() => { setStepIndex(Math.max(0, stepIndex - 1)); setSaved(false); }} disabled={stepIndex === 0}><ArrowLeft size={15} /> Previous</button><button className="button button--dark" onClick={() => void saveStep()} disabled={Boolean(currentStep.practice && !practiceAnswer)}>{stepIndex === selected.steps.length - 1 ? isComplete ? "Review complete" : "Complete field note" : "Save and continue"}<ArrowRight size={15} /></button></div></div></section></div></main></CurriculumChrome>;
}
