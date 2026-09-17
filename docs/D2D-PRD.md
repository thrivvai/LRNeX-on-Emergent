# D2D Student Growth Platform — PRD + Architecture Spec

**Version:** 0.4 (review-ready draft)
**Status:** Pilot-ready build specification — NOT compliance-certified production
**Product:** D2D Student Growth Platform ("LMS D2D")
**Client / Program Owner:** Diapers 2 Deposits, Inc. (D2D)
**Builder:** Thrivv AI / Thrivv Hyperintelligence
**Source material:** Whitney's build-overview email + three rounds of meeting notes (2026-08 → 09)

> **This document is for review. No design or code begins until it is approved.**
> Where the notes and the email conflict, the meeting notes are treated as the authority and the conflict is called out inline.

---

## 0. Changelog

### v0.3 → v0.4 (measurement + integration decisions)
- **Confidence-score signals, noise-handling methodology, and scale defined (§7).** Signals confirmed (time-to-answer, answer changes, lingering, hint usage, revisits) plus recommended additions; a methodology that avoids misreading non-cognitive pauses; weights kept as an intentional, validated tuning experiment; an ordinal Shaky / Building / Secure (+ Insufficient signal) scale.
- **D2D Money Hub integration set (§8).** Whitney wants it, in V1. Approach for the existing standalone HTML activities: serve from a controlled activities origin, sandboxed iframe, `postMessage` tracking SDK.
- **Digital Dollars = simple earn-and-display (§13).** SMS deferred from V1 (§17). Career mapping → Phase II, with a separate Whitney-facing brief.

### v0.2 → v0.3 (behavior-first reframe)
- **Primary measure is now behavior, not test-score growth (§6, §7).** Whitney wants the platform centered on *how scholars behave and act*. A comparative analysis of behavior becomes a **confidence score** — the headline outcome. Test scores are still collected (lowest **and** highest pre, lowest **and** highest post) but are **supplementary, not the primary growth metric.**
- **Native assessment delivery pulled into V1 (§5, §18).** Required to capture full behavior telemetry (dwell, answer-changes, revisits) — Google Forms can't. This replaces the v0.2 "Forms now, native later" plan.
- **Behavior tracking generalized beyond assessments (§8) — NEW.** Whitney may surface existing **D2D Money Hub activities/programs *through* the LMS** and have the LMS **track scholar behavior across those actions.** Captured as a first-class capability.
- **Rewards themed as "Digital Dollars" (§13).** Virtual-only in V1, on-brand with financial literacy.
- **Resolved:** rewards scope (virtual, Digital Dollars); behavior fidelity (native in V1).

### v0.1 → v0.2
- LRNEX/Prysm/Audacity reframed as future product ideas this build informs; behavior analytics added; permissions refined (read-only stakeholder, instructor input-not-destroy, super_admin all); super-admin cohort library expanded; Vortex → V2; clock-in = rewards + data.

---

## 1. What this is

The D2D Student Growth Platform is an **instructor-facing data spine** for Diapers 2 Deposits' out-of-school-time programming. Today scholar progress lives in scattered Google Forms, spreadsheets, and instructor memory. This platform puts it in one place — but its center of gravity is **behavior**: *how* scholars act, hesitate, persist, and choose, rendered into a **confidence score** and paired with supporting score and readiness data. Assessments and activities in → **behavior signals, a confidence score, readiness, and supporting growth out**, with a recommendation layer that tells instructors where to push next. It turns d2dmoneyhub.com from a content site into the program's data spine.

- **Students barely touch it.** In V1 their surface is: take assessments (pre/post/surveys), a clock-in button, their **Digital Dollars** rewards view, and — if adopted — **D2D Money Hub activities surfaced through the LMS.** Everything they do is timestamped and behavior-tracked.
- **Everyone else works from the dashboard:** instructors, the Instructional Lead, admins, the evaluator, and school staff.

**LRNEX, Prysm, and Audacity are not completed software and do not power this build.** They are **future product ideas.** This build constructs D2D's own mastery + assessment + **behavior** engine; the *learnings* from it — how to read behavior during assessments and activities, how a confidence score behaves, what recommendation logic helps — are the feedback needed to build those products **later**. This platform is the R&D substrate, not a consumer of them.

**Not production-certified on day one.** Compliance-aligned and pilot-ready, with the controls (FERPA-by-design, role-based access, audit, timestamping) needed to reach production after legal, security, accessibility, and procurement review.

### 1.1 What D2D is trying to do (keep all in view, in priority order)
1. **Understand and improve scholar behavior** — persistence, confidence, engagement — as the headline signal (**the confidence score**).
2. Teach **financial literacy** (F.A.S.T. Framework, MD Personal Financial Literacy, AFC®-aligned).
3. **Map to state standards** and the state exam that matters (MCAP first); **improve mathematics learning** (MCCR Math) in the process.
4. Produce **clear, FERPA-compliant, 21st CCLC-compliant reports.**
5. Track scholar behavior **across assessments and (optionally) D2D Money Hub activities**, not just within a single test.

---

## 2. The architectural spine — a pluggable, per-cohort-configurable shell (PRIORITY)

The email's *priority requirement* ("standards frameworks and exam blueprints are configuration, not hard-coded") and the notes' "shell with pluggable capabilities" describe the same backbone: **the super admin composes each cohort from a library of reusable pieces.**

**Maps against MCAP today; accepts additional state exams as configuration, never a rebuild.**

### 2.1 Framework registry
Academic standards as **loadable, versioned sets** (by adoption year). At launch: **MCCR Math**, **MD Personal Financial Literacy (PFL)**. **ESSA, MCAP, and any state's standards** are additional loadable sets the super admin selects and attaches per cohort.

### 2.2 Exam blueprint registry
Each state exam is a **blueprint**: sections, the standards each section tests, scoring bands. **MCAP is the first blueprint.** Others are added as config.

### 2.3 Pluggable mapping
Items → standards → exam sections through the **active blueprint**. Swap or add a blueprint and the **same scholar data re-maps** with no code change. A super-admin member (not the instructor) loads frameworks and blueprints.

### 2.4 Internal modules (not external engines)
The mastery engine, **behavior + confidence-score engine** (§7), recommendation decision-matrix (§9), and activity tracking (§8) are **internal, modular components** of this build. No dependency on LRNEX/Prysm/Audacity.

---

## 3. Roles & Permissions (FERPA-aligned, 3 tiers with personas)

Three permission **tiers**, each with **personas** carving scope.

### Tier 1 — `user` (base access)
| Persona | Access |
|---|---|
| **student** (scholar) | Minimal surface only: assigned assessments, clock-in, own Digital Dollars, assigned activities. All actions + behavior telemetry timestamped. No dashboard, no other data. |
| **parent** | **Read-only, own child only.** |

### Tier 2 — `admin` (operational, cohort/site-scoped) — **can input, cannot destroy**
| Persona | Access |
|---|---|
| **instructor** | Assigned cohort roster + single-student dashboards; administer/score assessments; **upload/input pertinent data**; view behavior, confidence score, growth, and recommendations; select a recommendation and mark it implemented; manual attendance entry. **Cannot delete data. Cannot alter core functions.** |
| **school_admin** | Broader read/input across their school's cohorts and reporting; same limits. |
| **instructional_lead** | Oversight across assigned cohorts/instructors; assignment and QA; same limits. |

### Tier 3 — `super_admin` (any and all functions)
| Persona | Access |
|---|---|
| **CEO (Whitney) / program_director / dev_team** | **Any and all functions.** Controls each cohort specifically. Loads frameworks/blueprints; manages the cohort library (§10), decision matrix, reward rules, and activity catalog; provisions users; deletes/edits data; full reporting. |

### Read-only observers
| Persona | Access |
|---|---|
| **stakeholder / evaluator** | **Read-only** growth/outcome data for evaluations. Provisioned and scope-limited by super_admin. No input, no core-function access. |

**Model:** every scholar-owned query scoped by tier + persona scope. One centralized authorization module. **Delete and core-function mutations are super_admin only.** No cross-scope access except super_admin.

---

## 4. Student surface (V1) — full scope

1. **Log in** (minimal, scholar-appropriate).
2. **Clock-in button** — a single, **easily accessible** timestamped tap. Purpose is **rewards + data**, *not* attendance-of-record.
3. **Take assigned assessments** — pre-tests, post-tests, surveys, retests — **delivered natively** (§5), with **behavior telemetry captured throughout** (§7).
4. **Digital Dollars** — the scholar's virtual reward balance and badges (§13).
5. **Assigned activities** (if adopted) — access **D2D Money Hub activities surfaced through the LMS**, with behavior tracked across them (§8).

**Everything student-side is timestamped and immutable** (login, clock-in, assessment start/submit, each response, each answer change, dwell per item, revisits, survey submit, activity actions, reward events).

Students never see cohort data, other scholars, dashboards, recommendations, or reports.

---

## 5. Assessment model

### 5.1 Types & delivery
`pretest`, `posttest`, `survey`, `retest`. Each item is tagged to a **standard** and the **exam section** it feeds. **Delivery is native in V1** — the platform renders and administers assessments itself, so it can capture full behavior telemetry (§7). *(This is the v0.3 change: native delivery moves from Phase 2 into V1. Google-Forms ingestion may remain a fallback importer, but the primary path is native.)*

### 5.2 Retake rule
- **Unlimited pre- and post-test retakes** — all attempts retained ("mind mining" of scholar choices).
- **A pretest retake stays a pretest** — never auto-promoted to a post-test.
- Each administration records `assessment_type`, `attempt_number`, timestamps; all attempts preserved.

---

## 6. Standards mapping, growth, and readiness

### 6.1 Mapping & mastery
Item → standard → exam section (through the active blueprint). Answers roll up into **mastery by standard** and **readiness by exam section**.

### 6.2 Score data (supplementary — NOT the primary metric)
Per scholar, the platform **collects and retains the lowest and highest pretest scores and the lowest and highest posttest scores**, plus every individual attempt. This is **descriptive supporting data**, not the headline measure. The **primary measure is the behavioral confidence score (§7).**

> This resolves the earlier growth-metric concern: because the score spread is supplementary rather than the primary effect claim, the "lowest-pre vs highest-post" framing is fine as a descriptive range. Evaluators should be shown the confidence score as the primary lens, with score ranges as context.

### 6.3 Readiness classification
Each scholar classified per exam section as **On Track / Watch / Gap**, on **D2D's fixed rules**. Predictive modeling is **Phase 3**.

> **Financial Literacy Vortex mapping → V2.** Not in this build.

---

## 7. Behavior analytics & the confidence score (PRIMARY MEASURE — V1)

This is the heart of v0.3. D2D cares most about *how* scholars behave, and turns that into a **confidence score**.

### 7.1 Behavior signals (captured natively, per item, per administration, timestamped)
- **Answer changes** — whether and how many times a scholar changes an answer (second-guessing).
- **Dwell / lingering** — time per item; items lingered on far longer than others (hesitation).
- **Revisits** — returning to an item after moving on.
- **Response latency & pacing** — time to first answer, order answered, idle gaps.
- **Persistence & completion** — items skipped, returned to, or abandoned.
- (Extensible — the telemetry model allows new signal types without a schema rebuild.)

### 7.2 The confidence score (the headline output)
A **comparative analysis of behavior signals becomes a per-scholar confidence score** — how *secure* a scholar's responses are, distinct from raw correctness — computed across items, attempts, and over time.

**Signals (V1).** Confirmed with Whitney, plus recommended additions:
- **Time to answer** (response latency)
- **Answer changes** — and their *direction* (wrong→right vs right→wrong is very informative)
- **Lingering / dwell** per item
- **Hint usage** — asked for a hint or not
- **Revisits** — going back to an answer as if unsure
- *Recommended additions:* **first-attempt correctness** (right without changing); **final correctness** (the anchor — confidence is read *relative to* whether they got it right); **idle/blur events** (window/tab focus loss — used to *exclude* non-cognitive pauses); a **light periodic self-report** ("how sure are you?") to calibrate the behavioral model; **consistency** across same-standard items; and **trajectory over time**.

**Handling the noise problem (Whitney's concern — a pause may be thinking *or* tying a shoe).** The methodology is built to avoid misreading noise as low mastery:
1. **Exclude probable non-cognitive time.** Idle/blur detection subtracts "away" time (no interaction events, or the window lost focus); cap/winsorize outlier dwell so one long pause can't dominate.
2. **Normalize per scholar and per item difficulty.** Use deviation from the scholar's *own* baseline, not absolute seconds — a generally-slow scholar isn't "low confidence."
3. **Require convergence.** Flag low confidence only when *several* signals agree, never one alone.
4. **Anchor to correctness + the self-report.** Behavior is interpreted against whether the answer was right and how sure the scholar said they were.
5. **Measure change, not a snapshot.** Growth = these signals improving over repeated exposure; comparing a scholar to themselves over time sidesteps much of the noise.
6. **Report uncertainty honestly.** An explicit **"Insufficient signal"** state when data is sparse or noisy, instead of a misleading score.
7. **Weights are the experiment.** Start with equal-ish weights on the corroborating signals, log every raw signal, and **validate** — correlate behavioral confidence against later correctness and teacher judgment, then tune. Weights are configurable and versioned (`confidence_scores.model_version`).

**Scale (recommended).** Human-facing **ordinal bands — Shaky / Building / Secure — plus Insufficient signal**, backed by an internal 0–1 score; drill-down shows the contributing signals. Bands map to the On Track / Watch / Gap language teachers already use and avoid false precision.

Surfaced per scholar and, where possible, per standard/section, on the dashboards and in reports.

### 7.3 Uses
- Instructor dashboard flags ("low confidence + changed answer 3× on a Gap standard").
- **Primary report input** alongside supplementary score ranges and readiness.
- Feeds the recommendation matrix (§9).
- R&D substrate for future products (§1).

---

## 8. D2D Money Hub activity integration (NEW — scope to confirm)

Whitney **wants** the D2D Money Hub integration, **in V1**: **surface existing Money Hub activities/programs *through* the LMS** and **track scholar behavior across those actions** — extending behavior analytics beyond assessments.

- **Catalog:** activities registered as library items the super admin assigns to cohorts.
- **Access:** scholars reach assigned activities from the student surface.
- **Tracking:** the platform records scholar actions across activities (open, time-on-task, interactions, steps completed, choices, idle/blur) as timestamped `activity_events`, feeding the behavior picture and confidence score.

**Integration approach (recommended).** The activities are today **standalone HTML files** hosted on a site. Recommended path — reuse them, don't rebuild:
1. **Serve each activity from a D2D-controlled *activities* origin** (e.g., `activities.d2dmoneyhub.com`, or the LMS's object storage) — the existing HTML files, unchanged in substance.
2. **Embed in a sandboxed iframe** inside an LMS *activity player* route. The `sandbox` attribute isolates the activity from the LMS auth/session, and the separate origin keeps it from touching LMS data — so a compromised or third-party activity can't reach student records.
3. **Inject a small `postMessage` tracking SDK** (one `<script>` tag per HTML file) that emits structured behavior events to the LMS parent frame, which accepts them only from the known activities origin (strict origin check). Activities that add richer event hooks emit richer data; those that don't still yield open, time-on-task, completion, and idle/blur.

**V1 minimum per activity:** open, time-on-task, completion, idle/blur; per-interaction hooks added incrementally. This reuses the existing HTML, gives *real* behavior telemetry (a bare cross-origin iframe with no SDK would expose almost nothing), and stays secure via sandbox + origin-checked `postMessage`.

> One-time effort: adding the tracking `<script>` tag to each HTML activity (or serving them through a wrapper that injects it). Trivial per file; the payoff is genuine cross-activity behavior data feeding the confidence score. **Security note:** review/sanitize each HTML file before serving it (see `docs/SECURITY-BASELINE.md`), since D2D will host them.

---

## 9. Recommendation engine — fixed static decision matrix

A **fixed, static decision matrix** — not predictive, no AI inference. Runs D2D's proprietary logic.

- Input: a scholar's **largest gap**, **confidence score / behavior signals** (§7), and readiness.
- The **matrix** maps (gap / readiness / behavior + confidence signal) → a **prioritized support strategy** + ranked alternates.
- Each cell references entries in the **cohort library's knowledge base** (§10), so every strategy is cited (ESSA / WWC / CASEL / MCAP / uploaded docs).
- The **instructor selects one and marks it implemented** — timestamped, audited.
- Matrix and library entries are super_admin-authored, tailorable **per cohort**.

Predictive recommendation is Phase 3.

---

## 10. Super-admin cohort library & per-cohort configuration

The super admin **composes each cohort** from a reusable **library**, and extends it over time.

### 10.1 The library holds selectable, reusable items
- **Surveys** (different types)
- **Pretests, post-tests, and retests** (different types)
- **Standards sets** — **ESSA**, **MCAP**, and **any state standards**
- **Exam blueprints**
- **Activities / programs** (incl. D2D Money Hub activities, §8)
- **Knowledge-base documentation** (evidence base: ESSA, WWC, CASEL, MCAP, and **uploaded documents**)

### 10.2 Compose per cohort
For **each cohort**, the super admin **plugs in** the chosen items. Configuration is **cohort-specific and granular.**

### 10.3 Extend the library
Super admin **uploads documentation** into the knowledge library to **tailor recommendations and content per cohort.** Uploads are versioned and audited.

---

## 11. Dashboard design directives

**Admin and super-admin dashboards: simplified but elegant** — easy to navigate, **plain language**, low cognitive load. Audience is program staff and executives.

- Plain-language labels over jargon ("How confident each scholar is," not "behavioral vector").
- Single-student view and cohort roster are the primary surfaces.
- **Confidence score + behavior signals + readiness + attendance visible together**, without menu-diving; supplementary score ranges one click away.
- Reports reachable in a click.
- Elegant, calm, credible. Student surface stays minimal and scholar-appropriate.

---

## 12. Attendance

- **Attendance-of-record:** Planbook sync **or** manual admin entry.
- **Clock-in** (§4) is a separate engagement/reward + data signal — **not** the attendance record.
- Attendance displays alongside confidence/behavior and score data.

---

## 13. Reward system (V1) — "Digital Dollars"

Virtual, financial-literacy-themed reward currency.

- **Brand:** rewards are **"Digital Dollars"** — on-brand with D2D's financial-literacy mission (earning, and later saving/budgeting concepts).
- **Earning events** (timestamped): clock-in, completing an assessment, completing a survey, completing an activity — configurable.
- **Reward rules:** event → Digital Dollars (and/or badges), controlled by **super_admin**, adjustable **per cohort**.
- **Ledger:** per-scholar Digital Dollars balance, timestamped and auditable.
- **Scholar view:** current balance + badges.

**Virtual only in V1 — simple earn-and-display.** Scholars earn Digital Dollars on defined events and see their balance and badges. No saving/budgeting mechanic and no real-world redemption in V1. A saving/budgeting layer (to reinforce financial literacy) and any redemption are **Phase II** candidates.

---

## 14. Reporting — audit-ready; confidence, behavior, and supporting growth

Reports lead with **the confidence score and behavior signals**, supported by readiness and score ranges. Cohort and individual exports target **21st CCLC**, **MSDE**, and the **program evaluator**. FERPA- and 21st-CCLC-compliant by design. Reporting reads the same records that run the dashboards.

---

## 15. Core workflow (six stages)

1. **Set up the cohort.** Super-admin composes the cohort from the library (§10): surveys, pre/post-tests, retests, standards sets, blueprint, activities, knowledge entries.
2. **Build/attach assessments (native).** Items authored/tagged to standards + exam sections; delivered natively so behavior is captured.
3. **Capture the data.** Scholars complete pre-test at intake, post-test at close; **behavior telemetry captured throughout**; surveys + activity actions + observations attach. Attendance from Planbook/manual. All student-side actions timestamped.
4. **Map and score.** Item results → mastery by standard → readiness by section. **Confidence score computed from behavior (primary);** lowest/highest pre & post scores retained (supplementary).
5. **Recommend.** The decision matrix ranks strategies (gap + confidence/behavior + library KB); instructor selects and implements.
6. **Report.** Confidence + behavior + readiness (+ supporting score ranges) export into 21st CCLC, MSDE, evaluator formats.

---

## 16. Data model (core tables, draft)

Scope: one program — multi-scholar, multi-cohort, multi-instructor, multi-school, eventually multi-state. Scope enforced by school/cohort relationships; `programId` supports future multi-state isolation.

- `programs` · `schools` · `cohorts` · `users` (tier[user|admin|super_admin], persona) · `student_profiles` · `parent_links` · `staff_assignments` · `enrollments`
- **Standards & exams:** `framework_sets` (standardType[MCCR|PFL|ESSA|MCAP|state]) · `standards` · `exam_blueprints` · `exam_sections` · `blueprint_section_standards`
- **Library / composition:** `library_items` (itemType[survey|pretest|posttest|retest|standards_set|blueprint|activity|kb_doc]) · `cohort_config`
- **Assessments:** `assessments` (type, deliveryMode default **native**) · `assessment_items` (type, correctKey) · `item_standards` · `assessment_administrations` (type, attemptNumber, startedAt, submittedAt) · `item_responses` (response, isCorrect, respondedAt)
- **Behavior telemetry:** `item_interaction_events` (eventType[view|answer|answer_change|revisit|idle|blur|latency], value, occurredAt) · `item_behavior_summary` (answerChangeCount, dwellMs, revisitCount, latencyMs, firstViewAt, finalAnswerAt)
- **Confidence (NEW, primary):** `confidence_scores` (id, programId, studentUserId, scope[scholar|standard|section], refId, score, band, inputsJson, model_version, computedAt)
- **Activities (NEW, §8):** `activities` (id, programId, source[d2d_money_hub|internal], title, externalRef, type, timestamps) · `activity_assignments` (id, programId, cohortId, activityId, assignedBy, timestamps) · `activity_events` (id, programId, studentUserId, activityId, eventType, value, occurredAt)
- **Score & readiness:** `mastery_records` · `readiness_records` (classification[on_track|watch|gap]) · `score_summary` (id, programId, studentUserId, lowestPre, highestPre, lowestPost, highestPost, computedAt) *(supplementary; all attempts remain in `assessment_administrations`)*
- **Attendance & rewards:** `attendance_records` (source[planbook|manual]) · `clockin_events` · `reward_rules` (eventType, digitalDollars, badge, cohortId?) · `reward_ledger` (studentUserId, digitalDollars, reason, awardedAt)
- **Recommendations & KB:** `kb_library_entries` · `decision_matrix_rules` (gapSignal, readinessSignal, confidenceSignal?, behaviorSignal?, strategyRank, kbEntryId) · `recommendations` (status[surfaced|selected|implemented])
- **Platform:** `report_exports` (reportType[21stCCLC|MSDE|evaluator]) · `audit_events` · `feature_flags`

---

## 17. Compliance framework (build framework, not legal certification)

Student data on minors — FERPA is the spine; 21st CCLC reporting is a target output.

- **FERPA-by-design:** data minimization; role/persona-scoped access; parents see only their own child; least privilege; **delete/core-function mutations super_admin only**; no cross-scope access except super_admin.
- **Timestamp everything student-side** — including behavior telemetry and activity events — immutable.
- **Behavior data is sensitive.** Confidence scores and behavior signals are inferences about minors; treat them as protected records, disclosed only within scope, and documented in the data map. Avoid over-interpreting a behavioral inference as a fixed judgment about a child.
- **Audit logging:** every sensitive action writes an `audit_event`.
- **Data controls (V1 placeholders):** export, deactivate/delete, retention table. Policy text requires legal review.
- **Security:** governed by `docs/SECURITY-BASELINE.md` (server-side validation, RLS, no frontend secrets, rate limiting, headers, etc.).
- **SMS consent (noted):** any SMS feature requires TCPA-style opt-in/opt-out. Out of V1 unless confirmed.

---

## 18. Phases

**Phase 1 (MVP / V1).** Instructor + super-admin dashboards (simplified, plain-language); cohort roster + single-student views; super-admin cohort library + per-cohort config; MCAP mapping (+ ESSA/MD PFL/MCCR sets); **native assessment delivery**; **full behavior telemetry + confidence score (primary)**; supplementary pre/post score ranges; fixed decision-matrix recommendations; Planbook + manual attendance; clock-in; **Digital Dollars** rewards; 3-tier RBAC with read-only stakeholder; timestamping; audit; 21st CCLC / MSDE / evaluator exports; **D2D Money Hub activity integration** (sandboxed-iframe + `postMessage` tracking over the existing HTML).

**Phase 2.** Additional state-exam blueprints; deeper analytics; richer activity tracking; Financial Literacy Vortex mapping (candidate); Digital Dollars saving/redemption mechanics (candidate).

**Phase 3.** Predictive modeling; multi-state operation; expanded scholar/parent surfaces; feeds the LRNEX/Prysm/Audacity roadmap.

---

## 19. Open decisions for review

**Resolved in v0.4:** confidence-score signals, noise-handling methodology, and scale (§7 — *weights remain an intentional tuning experiment, validated against later correctness and teacher judgment; ongoing activity, not a build blocker*); Money Hub integration → **in V1**, sandboxed-iframe + `postMessage` tracking SDK over the existing HTML (§8); Digital Dollars → **simple earn-and-display** (§13); **SMS deferred** from V1 (§17); **career mapping → Phase II**, with a separate Whitney-facing brief.

**Resolved in v0.3:** native delivery in V1; confidence score as primary measure; virtual Digital Dollars.

**No remaining blockers to the V1 build.** The confidence-score *weights* are tuned empirically during and after the pilot — the module ships with sensible defaults and full signal logging. The Money Hub activity HTML files must be handed over for review/serving.

---

## 20. Non-goals / out of scope for V1

- LRNEX / Prysm / Audacity as products (this build informs them).
- Predictive modeling (Phase 3).
- Financial Literacy Vortex mapping (V2 candidate).
- Multi-state operation (architecture supports it; not exercised in V1).
- Student-facing content/lessons/generative AI tutor (students only test/survey/clock-in/rewards/assigned activities).
- Real-world reward redemption/fulfillment (Digital Dollars are virtual in V1).
- SMS notification system (unless confirmed with consent workflow).
- Full legal/FERPA certification, DPA, accessibility audit, pen test (post-MVP gates).

---

## 21. Known limitations (state plainly)

- Not production-ready; not FERPA-certified; not a completed compliance package.
- Recommendations are a fixed rules matrix, not predictive.
- The **confidence-score formula is provisional** until defined with Whitney and validated against real behavior data.
- Behavior tracking for **externally embedded** Money Hub activities will be lower-fidelity than natively delivered content.
- Standards/blueprint coverage = MCCR Math, MD PFL, ESSA, MCAP at launch.
- Accessibility and security are designed-in but not yet audited/pen-tested.

---

## 22. Notes

Accurate for a build window starting on approval. A product and engineering specification for a pilot-ready build — **not** a compliance certification, legal opinion, or procurement checklist. Update only after piloting, legal review, or major architectural change. The companion **D2D Logic Model** artifact has been refreshed to lead with the confidence score. A separate **Career Mapping brief** (a Whitney-facing artifact) proposes career mapping for Phase II.
