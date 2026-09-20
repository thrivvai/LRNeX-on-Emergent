import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  Download,
  Eye,
  FileText,
  Flag,
  FlaskConical,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { label: "Overview", href: "/student", icon: Compass },
  { label: "My learning", href: "/student", icon: BookOpen },
  { label: "Rewards", href: "/student", icon: Sparkles },
];

const lessonSteps = ["Warm-up", "The statement", "Make a call", "Take it with you"];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="D2D Student Growth Platform">
      <span className="brand-mark__glyph">
        <span />
        <span />
        <span />
      </span>
      {!compact && (
        <span className="brand-mark__wordmark">
          <strong>D2D</strong>
          <small>student growth</small>
        </span>
      )}
    </div>
  );
}

function ButtonLink({
  href,
  children,
  variant = "primary",
  icon: Icon,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "soft" | "outline" | "dark";
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Link href={href} className={`button button--${variant} ${className}`}>
      {children}
      {Icon && <Icon size={16} strokeWidth={2.2} />}
    </Link>
  );
}

function LandingPage() {
  return (
    <main className="landing-page landing-page--cinematic">
      <video className="landing-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
        <source src="/manus-storage/gemini_generated_video_5f2d08c4_06f67600.mp4" type="video/mp4" />
      </video>
      <div className="landing-video__veil" aria-hidden="true" />
      <div className="landing-video__grain" aria-hidden="true" />
      <div className="landing-cinematic__brand"><BrandMark compact /></div>
      <section className="landing-cinematic__content" aria-labelledby="landing-title">
        <div className="landing-cinematic__copy">
          <div className="eyebrow"><span className="eyebrow__dot" /> Learning that moves with real life</div>
          <h1 id="landing-title">Money makes more sense when you can <em>see yourself</em> in the decision.</h1>
          <p>D2D helps scholars turn everyday money moments into clear choices, stronger habits, and a future they can picture.</p>
          <div className="landing-cinematic__actions" aria-label="Choose your sign-in">
            <ButtonLink href="/student" variant="primary" icon={ArrowRight}>Student sign in</ButtonLink>
            <ButtonLink href="/admin" variant="dark" icon={ArrowUpRight}>Admin sign in</ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

function StudentShell({ children, active = "Overview" }: { children: React.ReactNode; active?: string }) {
  return (
    <div className="app-shell app-shell--student">
      <aside className="student-sidebar">
        <div className="sidebar-top"><BrandMark /><button className="icon-button sidebar-close" aria-label="Close menu"><X size={18} /></button></div>
        <div className="student-profile"><div className="profile-avatar">A</div><div><strong>Alex Morgan</strong><small>Rising 9th · cohort 04</small></div><ChevronDown size={15} /></div>
        <div className="sidebar-label">Your space</div>
        <nav className="student-nav">{navItems.map(item => <Link key={item.label} href={item.href} className={active === item.label ? "is-active" : ""}><item.icon size={17} /><span>{item.label}</span>{item.label === "Rewards" && <span className="nav-badge">$240</span>}</Link>)}</nav>
        <div className="sidebar-lab"><div className="sidebar-lab__glow" /><FlaskConical size={21} /><strong>Try a field trip</strong><span>Explore a real-world choice.</span><Link href="/lesson">Open activity <ArrowUpRight size={14} /></Link></div>
        <div className="student-sidebar__bottom"><Link href="/"><CircleHelp size={16} /> Help center</Link><div className="privacy-note"><LockKeyhole size={13} /> Your learning space is private</div></div>
      </aside>
      <main className="student-main">{children}</main>
    </div>
  );
}

function StudentHome() {
  return (
    <StudentShell>
      <header className="student-header"><div className="mobile-brand"><BrandMark compact /></div><div><div className="breadcrumb">Tuesday, September 22 <span>·</span> Week 04</div><h1>Good morning, Alex<span className="heading-period">.</span></h1></div><div className="student-header__actions"><button className="icon-button"><CircleHelp size={18} /></button><div className="header-avatar">A</div></div></header>
      <section className="welcome-band"><div><span className="eyebrow eyebrow--light"><span className="eyebrow__dot" /> YOUR NEXT MOVE</span><h2>Make a money decision<br /><em>you can stand behind.</em></h2><p>You're building the kind of confidence that sticks after the lesson ends.</p><ButtonLink href="/lesson" variant="primary" icon={ArrowRight}>Continue learning</ButtonLink></div><div className="welcome-band__visual"><div className="orbit-number">04</div><div className="welcome-token welcome-token--one">APR</div><div className="welcome-token welcome-token--two">$960</div><div className="welcome-token welcome-token--three">WHY?</div><div className="welcome-band__caption">THE MONEY<br />YOU PAY</div></div></section>
      <section className="student-stats"><div className="student-stat"><span className="stat-kicker">CURRENT STREAK</span><strong>04 <small>days</small></strong><div className="tiny-bars"><i /><i /><i /><i className="is-today" /></div><span className="stat-foot">Keep the rhythm going</span></div><div className="student-stat"><span className="stat-kicker">DIGITAL DOLLARS</span><strong>$240</strong><div className="stat-progress"><span /></div><span className="stat-foot">60 until your next badge</span></div><div className="student-stat"><span className="stat-kicker">LEARNING SIGNAL</span><strong className="signal-word">Building</strong><div className="signal-pips"><i className="is-on" /><i className="is-on" /><i /><i /></div><span className="stat-foot">Your evidence is adding up</span></div></section>
      <section className="home-content-grid"><div className="next-up"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow__dot" /> UP NEXT</span><h3>The Money You Pay</h3></div><span className="section-meta">Lesson 04 <span>·</span> 18 min</span></div><div className="next-up__card"><div className="next-up__number">04</div><div className="next-up__body"><span className="content-tag">CREDIT / FOUNDATION</span><h4>What does this card charge you every day you carry a balance?</h4><p>Read the statement. Find the numbers. Decide what to pay.</p><div className="next-up__bottom"><div className="progress-line"><span /></div><span>2 of 4 steps</span><ButtonLink href="/lesson" variant="dark" icon={ArrowRight}>Open lesson</ButtonLink></div></div><div className="next-up__accent"><span>$</span><span>+</span><span>↗</span></div></div></div><div className="home-side-card"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow__dot" /> RECENT WINS</span><h3>Small moves</h3></div><MoreHorizontal size={18} /></div><div className="win-list"><div><span className="win-icon win-icon--mint"><Check size={15} /></span><span><strong>Found the New Balance</strong><small>Today · The Money You Pay</small></span><b>+20</b></div><div><span className="win-icon win-icon--coral"><Zap size={15} /></span><span><strong>Kept your streak alive</strong><small>Yesterday · Daily check-in</small></span><b>+10</b></div><div><span className="win-icon win-icon--sun"><Sparkles size={15} /></span><span><strong>Asked a smart question</strong><small>Monday · Banking basics</small></span><b>+15</b></div></div><Link href="/student" className="text-link">See all your progress <ArrowRight size={14} /></Link></div></section>
      <section className="quote-band"><div className="quote-band__mark">“</div><p>Financial confidence is not knowing every answer.<br /><em>It is knowing what to look at next.</em></p><span>— YOUR D2D FIELD GUIDE</span></section>
    </StudentShell>
  );
}

function LessonPage() {
  const [selected, setSelected] = useState<string | null>("balance");
  const [supportOpen, setSupportOpen] = useState(false);
  const [saved, setSaved] = useState(true);
  const choices = useMemo(() => [
    { id: "balance", title: "Pay the New Balance", body: "Pay $960 by the Due Date", note: "Interest stays at $0.00" },
    { id: "minimum", title: "Pay the Minimum", body: "Pay $35 this month", note: "The balance keeps earning" },
  ], []);

  function choose(id: string) {
    setSelected(id);
    setSaved(false);
    window.setTimeout(() => setSaved(true), 450);
  }

  return (
    <StudentShell active="My learning">
      <header className="lesson-header"><Link href="/student" className="back-link"><ArrowLeft size={16} /> Back to your space</Link><div className="lesson-header__status"><span className="save-dot" /> {saved ? "Saved" : "Saving"}</div></header>
      <div className="lesson-layout"><aside className="lesson-progress"><span className="eyebrow"><span className="eyebrow__dot" /> THE MONEY YOU PAY</span><h1>Make the<br /><em>call.</em></h1><p>One statement. Four numbers. One decision that changes the cost.</p><div className="lesson-steps">{lessonSteps.map((step, index) => <div key={step} className={`lesson-step ${index === 2 ? "is-current" : index < 2 ? "is-done" : ""}`}><span>{index < 2 ? <Check size={13} /> : `0${index + 1}`}</span><strong>{step}</strong>{index === 2 && <small>you are here</small>}</div>)}</div><div className="lesson-progress__tip"><Sparkles size={17} /><span><strong>Field note</strong><small>There is more than one kind of confidence.</small></span></div></aside><section className="lesson-stage"><div className="lesson-stage__top"><div><span className="content-tag">STEP 03 / MAKE A CALL</span><h2>What would you pay?</h2></div><span className="lesson-time"><Clock3 size={15} /> 04:32</span></div><div className="lesson-prompt"><span className="prompt-label">THE MOMENT</span><p>You have <strong>$1,250</strong> in savings. Your credit card statement shows a new balance of <strong>$960</strong> and a minimum payment of <strong>$35</strong>.</p><div className="prompt-question">Which payment would you make today?</div></div><div className="statement-card"><div className="statement-card__top"><div><span className="mini-label">D2D FINANCIAL FREEDOM CARD</span><h3>March statement</h3></div><span className="statement-card__chip">03 / 31</span></div><div className="statement-grid"><div><small>NEW BALANCE</small><strong>$960.00</strong></div><div><small>MINIMUM PAYMENT</small><strong>$35.00</strong></div><div><small>DUE DATE</small><strong>APR 25</strong></div><div><small>APR</small><strong>23.99%</strong></div></div><div className="statement-card__warning"><Flag size={15} /><span><strong>Minimum Payment Warning</strong><small>Paying only $35 takes 41 months and costs $1,405.44 total.</small></span></div></div><div className="choice-list">{choices.map(choice => <button key={choice.id} onClick={() => choose(choice.id)} className={`choice-card ${selected === choice.id ? "is-selected" : ""}`}><span className="choice-card__radio">{selected === choice.id && <span />}</span><span className="choice-card__copy"><strong>{choice.title}</strong><small>{choice.body}</small></span><span className="choice-card__note">{choice.note}</span>{selected === choice.id && <Check className="choice-card__check" size={17} />}</button>)}</div><div className="lesson-actions"><button className="support-button" onClick={() => setSupportOpen(!supportOpen)}><CircleHelp size={16} /> Need a different way in?</button><button className="button button--dark" onClick={() => window.alert("Your choice is saved for the pilot journey.")}>Commit this choice <ArrowRight size={16} /></button></div>{supportOpen && <div className="support-panel"><Sparkles size={17} /><div><strong>Try looking at the Due Date.</strong><p>That day decides whether the grace period keeps interest at zero. You can still change your choice.</p></div></div>}</section></div>
    </StudentShell>
  );
}

function StaffShell({ children, active = "Overview" }: { children: React.ReactNode; active?: string }) {
  const staffNav = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Learners", icon: Users },
    { label: "Learning evidence", icon: Eye },
    { label: "Data quality", icon: ShieldCheck },
  ];
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-sidebar__brand"><BrandMark /><span className="admin-badge">PILOT</span></div><div className="admin-workspace"><span>WORKSPACE</span><strong>D2D Research Pilot <ChevronDown size={14} /></strong></div><nav className="admin-nav">{staffNav.map(item => <Link key={item.label} href="/admin" className={active === item.label ? "is-active" : ""}><item.icon size={17} /><span>{item.label}</span>{item.label === "Data quality" && <i className="nav-alert" />}</Link>)}</nav><div className="admin-sidebar__bottom"><div className="admin-user"><span>WM</span><div><strong>Whitney Morgan</strong><small>Program director</small></div><MoreHorizontal size={17} /></div><div className="privacy-note"><LockKeyhole size={13} /> Research records are scoped</div></div></aside><main className="admin-main">{children}</main></div>;
}

function AdminPage() {
  const [range, setRange] = useState("This cohort");
  return <StaffShell><header className="admin-header"><div><span className="breadcrumb">D2D RESEARCH PILOT <span>·</span> OVERVIEW</span><h1>The learning signal is getting clearer.</h1><p>Tuesday, September 22, 2026 <span>·</span> Cohort 04 / all learners</p></div><div className="admin-header__actions"><button className="icon-button"><Search size={18} /></button><button className="icon-button"><CircleHelp size={18} /></button><button className="button button--dark"><Download size={15} /> Export view</button><div className="header-avatar header-avatar--staff">WM</div></div></header><div className="admin-toolbar"><div className="range-switcher"><button className={range === "This cohort" ? "is-active" : ""} onClick={() => setRange("This cohort")}>This cohort</button><button className={range === "All time" ? "is-active" : ""} onClick={() => setRange("All time")}>All time</button><button className={range === "Last 7 days" ? "is-active" : ""} onClick={() => setRange("Last 7 days")}>Last 7 days</button></div><span className="freshness"><span className="save-dot" /> Data refreshed 2 min ago</span></div><section className="admin-kpis"><div className="kpi-card"><span className="stat-kicker">ACTIVE LEARNERS</span><strong>18 <small>/ 24</small></strong><div className="kpi-foot"><span className="trend trend--up">↗ 12%</span><span>vs. last week</span></div></div><div className="kpi-card"><span className="stat-kicker">LESSON PROGRESS</span><strong>68<span className="unit">%</span></strong><div className="kpi-track"><span style={{ width: "68%" }} /></div><div className="kpi-foot"><span>16 learners on track</span></div></div><div className="kpi-card kpi-card--signal"><span className="stat-kicker">LEARNING EVIDENCE</span><strong>Building</strong><div className="evidence-meter"><span /><span /><span /><span /><span /></div><div className="kpi-foot"><span className="trend trend--up">↗ 8%</span><span>confidence is emerging</span></div></div><div className="kpi-card"><span className="stat-kicker">DATA QUALITY</span><strong>94<span className="unit">%</span></strong><div className="kpi-foot"><span className="quality-dot" /> 2 records need review</div></div></section><section className="admin-grid"><div className="panel panel--chart"><div className="panel-heading"><div><span className="eyebrow"><span className="eyebrow__dot" /> LEARNING EVIDENCE</span><h2>From first look to next move</h2></div><button className="more-button">Last 4 weeks <ChevronDown size={14} /></button></div><div className="chart-legend"><span><i className="legend-dot legend-dot--mint" /> Made a decision</span><span><i className="legend-dot legend-dot--coral" /> Explained why</span><span><i className="legend-dot legend-dot--navy" /> Transferred it</span></div><div className="chart-area"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart-content"><div className="grid-lines"><i /><i /><i /><i /><i /></div><svg className="evidence-chart" viewBox="0 0 760 210" preserveAspectRatio="none" aria-label="Learning evidence trend chart"><path d="M0,168 C55,160 74,122 125,132 S187,152 240,115 S302,100 360,112 S420,92 480,72 S548,84 600,47 S690,45 760,22" fill="none" stroke="#5dd6b2" strokeWidth="4" strokeLinecap="round" /><path d="M0,188 C55,182 74,165 125,174 S187,180 240,155 S302,140 360,148 S420,130 480,117 S548,116 600,93 S690,78 760,58" fill="none" stroke="#f07c67" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 7" /><path d="M0,198 C55,194 74,190 125,192 S187,196 240,183 S302,174 360,179 S420,166 480,155 S548,156 600,141 S690,130 760,113" fill="none" stroke="#17304a" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" /></svg><div className="chart-x"><span>WEEK 01</span><span>WEEK 02</span><span>WEEK 03</span><span>WEEK 04</span></div></div></div><div className="chart-insight"><span className="insight-icon"><Sparkles size={15} /></span><p><strong>What stands out:</strong> more scholars are revising after they inspect the statement, not before. That is the behavior to watch next.</p><ArrowUpRight size={17} /></div></div><div className="panel panel--roster"><div className="panel-heading"><div><span className="eyebrow"><span className="eyebrow__dot" /> LEARNER PULSE</span><h2>Who needs a closer look?</h2></div><button className="icon-button"><MoreHorizontal size={18} /></button></div><div className="roster-list"><div className="roster-row"><span className="roster-avatar roster-avatar--mint">JM</span><span className="roster-name"><strong>Jordan M.</strong><small>Step 03 · made a revision</small></span><span className="roster-state state--building">Building</span><ArrowRight size={15} /></div><div className="roster-row"><span className="roster-avatar roster-avatar--coral">KT</span><span className="roster-name"><strong>Keisha T.</strong><small>Step 02 · needs support</small></span><span className="roster-state state--watch">Watch</span><ArrowRight size={15} /></div><div className="roster-row"><span className="roster-avatar roster-avatar--sun">RB</span><span className="roster-name"><strong>Riley B.</strong><small>Step 04 · transfer ready</small></span><span className="roster-state state--secure">Secure</span><ArrowRight size={15} /></div><div className="roster-row"><span className="roster-avatar roster-avatar--navy">AS</span><span className="roster-name"><strong>Amari S.</strong><small>Step 01 · not started</small></span><span className="roster-state state--neutral">New</span><ArrowRight size={15} /></div></div><Link href="/admin" className="text-link">View all learners <ArrowRight size={14} /></Link></div></section><section className="admin-bottom-grid"><div className="panel insight-panel"><div className="panel-heading"><div><span className="eyebrow"><span className="eyebrow__dot" /> RESEARCH NOTE</span><h2>A pattern worth following</h2></div><span className="note-date">SEP 22</span></div><div className="insight-panel__body"><div className="quote-mark">“</div><p>When the prompt rephrases the question without giving the answer, 7 of 9 learners changed their reasoning. The next transfer task will tell us whether the idea traveled.</p></div><button className="text-button">Open evidence trail <ArrowUpRight size={15} /></button></div><div className="panel quality-panel"><div className="panel-heading"><div><span className="eyebrow"><span className="eyebrow__dot" /> DATA QUALITY</span><h2>Trust the record</h2></div><ShieldCheck size={19} className="panel-heading__icon" /></div><div className="quality-list"><div><span className="quality-icon quality-icon--mint"><Check size={14} /></span><span><strong>Event delivery</strong><small>All recent sessions synced</small></span><b>100%</b></div><div><span className="quality-icon quality-icon--sun"><Clock3 size={14} /></span><span><strong>Timing context</strong><small>2 sessions with away gaps</small></span><b>Review</b></div><div><span className="quality-icon quality-icon--coral"><Flag size={14} /></span><span><strong>Teacher read</strong><small>3 judgments to collect</small></span><b>Open</b></div></div></div></section></StaffShell>;
}

export default function Home() {
  const [location] = useLocation();
  if (location === "/student") return <StudentHome />;
  if (location === "/lesson") return <LessonPage />;
  if (location === "/admin") return <AdminPage />;
  return <LandingPage />;
}
