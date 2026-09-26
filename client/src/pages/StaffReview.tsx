import { BarChart3, Check, Mail, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";

const ADMIN_AUTH_REDIRECT_URL = typeof window === "undefined" ? "/admin" : `${window.location.origin}/admin`;

function StaffChrome({ children }: { children: React.ReactNode }) {
  return <div className="staff-review"><header className="staff-review__header"><Link href="/" className="journey-brand"><span className="journey-brand__glyph"><i /><i /><i /></span><span><strong>D2D</strong><small>student growth</small></span></Link><span><ShieldCheck size={14} /> RLS-scoped research workspace</span></header>{children}</div>;
}

function StaffEntry() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function sendLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: ADMIN_AUTH_REDIRECT_URL } });
    if (authError) setError(authError.message); else setSent(true);
    setBusy(false);
  }
  return <StaffChrome><main className="staff-entry"><div className="staff-entry__icon"><Mail size={21} /></div><span className="journey-card__kicker">INSTRUCTOR / ADMIN ENTRY</span><h1>Bring the<br /><em>read.</em></h1><p>Use your program email to receive a secure sign-in link. Staff access is scoped by program role; student records never come through a broad admin query.</p>{sent ? <div className="staff-success"><Check size={19} /><strong>Check your inbox.</strong><span>The secure link will return you to the D2D research workspace.</span></div> : <form onSubmit={sendLink} className="code-form"><label htmlFor="staff-email">Program email</label><input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="instructor@school.org" required /><button className="button button--dark" disabled={busy}>{busy ? "Sending…" : "Send secure link"}<Mail size={16} /></button></form>}{error && <div className="journey-error" role="alert">{error}</div>}</main></StaffChrome>;
}

type Row = { scholar_id: string; band: string; score: number | null; abstained: boolean; pseudonym?: string; judged?: string | null };

function StaffDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [programId, setProgramId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => { void (async () => {
    const { data: userData } = await supabase.auth.getUser(); setUserEmail(userData.user?.email ?? "Staff user");
    const { data: program } = await supabase.from("programs").select("id").eq("slug", "d2d-pilot").single();
    if (!program) { setDenied(true); setBusy(false); return; }
    setProgramId(program.id);
    const { data: membership } = await supabase.from("program_memberships").select("role").eq("program_id", program.id).eq("user_id", userData.user?.id ?? "").eq("status", "active").maybeSingle();
    if (!membership) { setDenied(true); setBusy(false); return; }
    const { data: scholars } = await supabase.from("scholars").select("id,pseudonym").eq("program_id", program.id).eq("status", "active");
    const { data: results } = await supabase.from("confidence_results").select("scholar_id,band,score,abstained").eq("program_id", program.id).order("generated_at", { ascending: false });
    const { data: judgments } = await supabase.from("teacher_judgments").select("scholar_id,judgment").eq("program_id", program.id).eq("teacher_user_id", userData.user?.id ?? "");
    const judgmentMap = new Map((judgments ?? []).map((item) => [item.scholar_id, item.judgment]));
    const latest = new Map<string, Row>();
    for (const result of results ?? []) if (!latest.has(result.scholar_id)) latest.set(result.scholar_id, { ...result, pseudonym: scholars?.find((scholar) => scholar.id === result.scholar_id)?.pseudonym, judged: judgmentMap.get(result.scholar_id) ?? null });
    setRows(Array.from(latest.values())); setBusy(false);
  })(); }, []);
  async function judge(row: Row, judgment: "matches" | "partly_matches" | "does_not_match") {
    const { data: userData } = await supabase.auth.getUser();
    const { data: enrollment } = await supabase.from("enrollments").select("cohort_id").eq("scholar_id", row.scholar_id).eq("status", "active").limit(1).maybeSingle();
    const { error } = await supabase.from("teacher_judgments").upsert({ program_id: programId, cohort_id: enrollment?.cohort_id, scholar_id: row.scholar_id, teacher_user_id: userData.user?.id, judgment }, { onConflict: "judgment_key" });
    setMessage(error ? "Judgment could not be saved." : "Teacher read saved to the research record.");
    if (!error) setRows((current) => current.map((item) => item.scholar_id === row.scholar_id ? { ...item, judged: judgment } : item));
  }
  if (busy) return <StaffChrome><div className="journey-loading">Loading the evidence view…</div></StaffChrome>;
  if (denied) return <StaffChrome><div className="staff-denied"><ShieldCheck size={24} /><h1>Access is scoped.</h1><p>This email is authenticated, but it has not been assigned a D2D pilot role yet. Add an active program membership, then return here.</p><Link href="/" className="button button--dark">Return home</Link></div></StaffChrome>;
  const secure = rows.filter((row) => row.band === "secure").length; const abstained = rows.filter((row) => row.abstained).length;
  return <StaffChrome><main className="staff-dashboard"><header className="staff-dashboard__intro"><div><span className="journey-card__kicker">D2D RESEARCH PILOT / LIVE READ</span><h1>Read the work,<br /><em>not just the score.</em></h1><p>Signed in as {userEmail}. This view combines behavior evidence, a supporting confidence band, and your one-click read of whether it matches the scholar you know.</p></div><div className="staff-dashboard__mark"><BarChart3 size={22} /><strong>{rows.length}</strong><small>scholar signals</small></div></header><section className="staff-kpis"><div><Users size={16} /><strong>{rows.length}</strong><span>active signals</span></div><div><BarChart3 size={16} /><strong>{secure}</strong><span>secure context bands</span></div><div><ShieldCheck size={16} /><strong>{abstained}</strong><span>held / abstained</span></div></section><section className="evidence-table"><div className="evidence-table__head"><span>Scholar</span><span>Confidence context</span><span>Your read</span></div>{rows.length === 0 ? <div className="evidence-empty">No completed journeys yet. The first student result will appear here.</div> : rows.map((row) => <div className="evidence-row" key={row.scholar_id}><div><strong>{row.pseudonym ?? "Scholar"}</strong><small>Demo cohort / The Money You Pay</small></div><div><span className={`evidence-band evidence-band--${row.abstained ? "abstained" : row.band}`}>{row.abstained ? "ABSTAINED" : row.band}</span><small>{row.score === null ? "Supporting context only" : `${row.score}/100 context score`}</small></div><div className="judgment-actions"><button className={row.judged === "matches" ? "is-selected" : ""} onClick={() => judge(row, "matches")}>Matches</button><button className={row.judged === "partly_matches" ? "is-selected" : ""} onClick={() => judge(row, "partly_matches")}>Partly</button><button className={row.judged === "does_not_match" ? "is-selected" : ""} onClick={() => judge(row, "does_not_match")}>Not yet</button></div></div>)}</section>{message && <div className="staff-toast">{message}</div>}</main></StaffChrome>;
}

export default function StaffReview() {
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => { void (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.functions.invoke("bootstrap-staff-membership", { body: {} });
    setSession(Boolean(data.session));
  })(); }, []);
  if (session === null) return <StaffChrome><div className="journey-loading">Checking secure session…</div></StaffChrome>;
  return session ? <StaffDashboard /> : <StaffEntry />;
}
