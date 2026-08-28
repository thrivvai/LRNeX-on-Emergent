# D2D Student Growth Platform — PRD + Architecture Spec

**Version:** 0.2 (review-ready draft)
**Status:** Pilot-ready build specification — NOT compliance-certified production
**Product:** D2D Student Growth Platform ("LMS D2D")
**Client / Program Owner:** Diapers 2 Deposits, Inc. (D2D)
**Builder:** Thrivv AI / Thrivv Hyperintelligence
**Source material:** Whitney's build-overview email + two rounds of meeting notes (2026-08)

> **This document is for review. No design or code begins until it is approved.**
> Where the notes and the email conflict, the meeting notes are treated as the authority and the conflict is called out inline.

---

## 0. What changed from v0.1 → v0.2

Incorporates the second round of clarifications:

- **Engine reframe (§1).** LRNEX / Prysm / Audacity are **future product ideas, not software that powers this build.** This build produces the *learnings* that will inform them.
- **Assessment behavior analytics (§7) — NEW V1 capability.** Answer-change counts, time-lingering, revisits, and similar during-assessment signals.
- **Permissions refined (§3).** Stakeholder/evaluator read-only; instructor can input/upload but not delete or alter core functions; super_admin does any and all functions.
- **Growth rule resolved (§6.2).** Lowest score of the first pretest → highest score of the final posttest; all attempts retained.
- **Super-admin cohort library + per-cohort config (§9) — expanded.** A composable library of surveys, retests, pre/post-tests, and standards sets (ESSA / MCAP / any state), plugged into cohorts, extensible by uploading documentation.
- **Resolved:** Financial Literacy Vortex → V2 (§6.3); clock-in = rewards + data, not attendance-of-record (§4); dashboard design directive added (§10).

---

## 1. What this is — and how LRNEX/Prysm/Audacity actually relate

The D2D Student Growth Platform is an **instructor-facing data spine** for Diapers 2 Deposits' out-of-school-time programming. Today scholar growth lives in scattered Google Forms, spreadsheets, and instructor memory. This platform puts it in one place: **pre-test and post-test in → growth, readiness, and behavior signals out**, with a recommendation layer that tells instructors where to push next. It turns d2dmoneyhub.com from a content site into the program's data spine.

**LRNEX, Prysm, and Audacity are not completed software and do not power this build.** They are **future product ideas** — which is why the email names them. The relationship runs the other way:

> This build includes constructing D2D's own **mastery + assessment engine**. The *learnings* from building it — how to map results to standards and career tendencies, how to monitor student behavior during assessments, what recommendation logic actually helps — are exactly the feedback and data needed to build LRNEX / Prysm / Audacity **later**. This platform is the R&D substrate for those future products, not a consumer of them.

So: nothing external "plugs in" as a finished engine. The mastery engine, recommendation matrix, and behavior analytics are built **here**, as internal modules, and their outputs seed the future roadmap.

**Not production-certified on day one.** Same stance as all Thrivv MVPs: compliance-aligned and pilot-ready, with the controls (FERPA-by-design, role-based access, audit, timestamping) needed to reach production after legal, security, accessibility, and procurement review. Do not describe it as fully FERPA-certified or audit-certified until that review is done.

### 1.1 What D2D is actually trying to do (keep all of these in view)

The platform serves several D2D objectives at once — the design should never optimize one and drop the others:

1. Teach **financial literacy** (F.A.S.T. Framework, MD Personal Financial Literacy, AFC®-aligned).
2. **Map to state standards** and the state exam that matters (MCAP first).
3. **Improve mathematics learning** in the process (MCCR Math).
4. Produce **clear, FERPA-compliant, 21st CCLC-compliant reports**.
5. Surface **student behavior during assessment** as first-class data, not just scores.

---

## 2. The architectural spine — a pluggable, per-cohort-configurable shell (PRIORITY)

The email's *priority requirement* ("standards frameworks and exam blueprints are configuration, not hard-coded") and the notes' "shell with pluggable capabilities" describe the same backbone. The v0.2 clarifications sharpen it: **the super admin composes each cohort from a library of reusable pieces.**

**Maps against MCAP today; accepts additional state exams as configuration, never a rebuild.** Registries:

### 2.1 Framework registry
Academic standards as **loadable, versioned sets**, versioned by adoption year. At launch: **MCCR Math**, **MD Personal Financial Literacy (PFL)**. **ESSA, MCAP, and any state's standards** are additional loadable sets the super admin can select and attach per cohort.

### 2.2 Exam blueprint registry
Each state exam is a **blueprint**: sections, the standards each section tests, scoring bands. **MCAP is the first blueprint.** Others are added as config.

### 2.3 Pluggable mapping
Items → standards → exam sections through the **active blueprint**. Swap or add a blueprint and the **same scholar data re-maps** with no code change. An executive/super-admin member (not the instructor) loads frameworks and blueprints.

### 2.4 Internal modules (not external engines)
The mastery engine, recommendation decision-matrix (§8), and behavior analytics (§7) are **internal, modular components** of this build. There is no dependency on LRNEX/Prysm/Audacity — those are downstream products this build's data will inform.

---

## 3. Roles & Permissions (FERPA-aligned, 3 tiers with personas)

Three permission **tiers**, each with **personas** that carve scope. Reconciles the notes' "user / admin / super admin" with the email's four personas, and adds the v0.2 action limits.

### Tier 1 — `user` (base access)
| Persona | Access |
|---|---|
| **student** (scholar) | Minimal surface only: assigned pre-tests, post-tests, surveys; clock-in button; own rewards. All actions + behavior telemetry timestamped. No dashboard, no other data. |
| **parent** | **Read-only, own child only** — that scholar's growth/outcome view. |

### Tier 2 — `admin` (operational, cohort/site-scoped) — **can input, cannot destroy**
| Persona | Access |
|---|---|
| **instructor** | Assigned cohort roster + single-student dashboards; administer/score assessments; **upload/input pertinent data**; view growth, behavior signals, and recommendations; select a recommendation and mark it implemented; manual attendance entry. **Cannot delete data. Cannot alter core functions** (frameworks, blueprints, matrix, reward rules, cohort config, user provisioning). |
| **school_admin** | Broader read/input access across their school's cohorts and reporting; same destructive/core-function limits as instructor. |
| **instructional_lead** | Oversight across assigned cohorts/instructors; assignment and QA; same limits. |

### Tier 3 — `super_admin` (any and all functions)
| Persona | Access |
|---|---|
| **CEO (Whitney) / program_director / dev_team** | **Any and all functions.** Controls what happens within **each cohort, specifically to that cohort**. Loads frameworks/blueprints; manages the cohort library (§9); manages the decision matrix and reward rules; provisions users; deletes/edits data; full cross-cohort/school/(future) state reporting. |

### Read-only observers
| Persona | Access |
|---|---|
| **stakeholder / evaluator** | **Read-only** access to growth and outcome data for evaluations. Provisioned and scope-limited by super_admin. No input, no core-function access. |

**Model:** every scholar-owned query scoped by tier + persona scope (own child / assigned cohort / assigned school / all). One centralized authorization module. **Delete and core-function mutations are super_admin only.** No cross-scope access except super_admin.

---

## 4. Student surface (V1) — full scope

Per the notes (overriding the email's "minimal surface, nothing else"):

1. **Log in** (minimal, scholar-appropriate).
2. **Clock-in button** — a single, **easily accessible** tap recording a timestamped event. Its purpose is **rewards + data**, *not* the official attendance record. (Someone may choose to use it as an informal attendance proxy — that's fine — but Planbook/manual entry remains attendance-of-record.)
3. **Take assigned assessments** — pre-tests, post-tests, **surveys**. During assessment, the platform captures **behavior telemetry** (§7).
4. **Reward view** — earned rewards/points/badges.

**Everything student-side is timestamped and immutable** (login, clock-in, assessment start/submit, each response, each answer change, dwell time per item, survey submit, reward events).

Students never see cohort data, other scholars, dashboards, recommendations, or reports.

---

## 5. Assessment model

### 5.1 Types & delivery
`pretest`, `posttest`, `survey`, plus **retests** (see §9 library). Each item is tagged to a **standard** and the **exam section** it feeds. Google Forms today; **native delivery over time** (Phase 2). The model does not assume the delivery mechanism.

### 5.2 Retake rule (from email)
- **Unlimited pre- and post-test retakes** — all attempts retained ("mind mining" of scholar choices).
- **A pretest retake stays a pretest** — never auto-promoted to a post-test, regardless of how many times taken.
- Each administration records `assessment_type`, `attempt_number`, timestamps; all attempts preserved.

---

## 6. Standards mapping, growth, and readiness

### 6.1 Mapping & mastery
Item → standard → exam section (through the active blueprint). Answers roll up into **mastery by standard** and **readiness by exam section**.

### 6.2 Growth measurement (resolved)
Growth is measured **from the lowest score of the first pretest to the highest score of the final posttest**, per scholar — a conservative baseline against the best outcome. **All scores for every attempt are retained** for analysis (not just the two endpoints). Growth is computed at every level: scholar, standard, exam section, cohort.

> Interpretation note: "first pretest" / "final posttest" read as the pretest phase (baseline) vs the posttest phase (outcome); lowest attempt in the former, highest in the latter. Flag if you meant strictly the chronologically first/last administration.

### 6.3 Readiness classification
Each scholar classified per exam section as **On Track / Watch / Gap**, on **D2D's fixed rules** mapping growth/mastery to projected state-exam performance. Predictive modeling is **Phase 3**.

> **Financial Literacy Vortex mapping → V2.** Not addressed in this build. (Resolved.)

---

## 7. Assessment behavior analytics (NEW — V1)

D2D is **very** interested in *how* scholars behave during an assessment, not only whether they got items right. V1 captures per-item interaction telemetry and surfaces it on the dashboards and in reports.

**Signals to capture (per item, per administration, timestamped):**
- **Answer changes** — did the scholar change an answer, and how many times?
- **Dwell / lingering** — time spent on each item; items where the scholar lingered far longer than others.
- **Revisits** — returning to an item after moving on.
- **Sequence & pacing** — order answered, total time, idle gaps.
- (Extensible — the telemetry model should allow new signal types without a schema rebuild.)

**Uses:**
- Instructor dashboard flags (e.g., "lingered + changed answer 3× on the strongest-gap standard").
- Report inputs alongside growth/improvement.
- **R&D substrate** — this is precisely the "monitor student behavior during assessments" learning that seeds future products (§1).

> **OPEN DECISION (telemetry & delivery):** Rich per-item telemetry (dwell, answer-change counts, revisits) is hard to capture through **Google Forms**. In V1, how much behavior data can we realistically get from Forms vs. what waits for **native delivery** (Phase 2)? **Proposed:** capture what Forms exposes now (submission timing, final answers) + a light native wrapper for dwell/answer-change where feasible; full fidelity lands with native delivery. Confirm the V1 fidelity bar.

---

## 8. Recommendation engine — fixed static decision matrix

Per the notes, a **fixed, static decision matrix** — not predictive, no AI inference. Runs D2D's proprietary logic inside the system.

- Input: a scholar's **largest gap**, **strongest lever**, readiness classification, and now **behavior signals** (§7) where relevant.
- The **decision matrix** maps (gap / readiness / behavior signal) → a **prioritized support strategy** + ranked alternates.
- Each matrix cell references one or more entries in the **cohort library's knowledge base** (§9), so every strategy is grounded in a cited source (ESSA / WWC / CASEL / MCAP / uploaded docs).
- The **instructor selects one and marks it implemented** — timestamped, audited.
- Matrix and library entries are authored/controlled by **super_admin**, and can be tailored **per cohort**.

Predictive recommendation is Phase 3, out of V1.

---

## 9. Super-admin cohort library & per-cohort configuration (expanded)

The super admin **composes each cohort** from a reusable **library**, and can extend that library over time. This is the concrete form of the "pluggable shell."

### 9.1 The library holds selectable, reusable items
- **Surveys** (different types)
- **Pretests, post-tests, and retests** (different types)
- **Standards sets** — **ESSA**, **MCAP**, and **any state standards** the program needs
- **Exam blueprints**
- **Knowledge-base documentation** (evidence base for recommendations: ESSA, WWC, CASEL, MCAP, and **uploaded documents**)

### 9.2 Compose per cohort
For **each specific cohort**, the super admin **plugs in** the chosen surveys / assessments / standards sets / blueprint / knowledge entries. Configuration is **cohort-specific and granular** — the super admin controls what happens within each cohort in a very specific way.

### 9.3 Extend the library
Super admin can **upload documentation** into the knowledge library, which then becomes available to **tailor recommendations and content to specific cohorts.** Uploads are versioned and audited.

> This makes the registries (§2) usable in practice: registries define the *types*; the library is the *stocked shelf*; per-cohort config is the *act of plugging pieces in*.

---

## 10. Dashboard design directives

The **admin and super-admin dashboards must be simplified but elegant** — easy to navigate, **plain language**, low cognitive load. The audience is program staff and executives, not data engineers.

- Plain-language labels over jargon (e.g., "Where each scholar stands," not "readiness vector").
- The single-student view and cohort roster are the primary surfaces (per the mockups referenced in the email).
- Growth **and** behavior signals **and** attendance visible together, without drilling through menus.
- Reports reachable in a click, in the formats D2D needs.
- Elegant, calm, credible — institutional but not intimidating.

Student surface stays minimal and scholar-appropriate.

---

## 11. Attendance

- **Attendance-of-record:** Planbook sync **or** manual entry by an admin.
- **Clock-in** (§4) is a separate, easily accessible engagement/reward + data signal — **not** the attendance record, though it may be used informally as a proxy.
- Attendance displays alongside academic growth and behavior signals on the dashboard.

---

## 12. Reward system (V1)

- **Earning events** (timestamped): clock-in, completing a pre-test / post-test, completing a survey — a configurable set.
- **Reward rules:** event → points/tokens/badge, controlled by **super_admin**, adjustable **per cohort**.
- **Reward ledger:** per-scholar, timestamped, auditable.
- **Scholar view:** earned rewards/points/badges.

Simple in V1 (points/badges on defined events). No marketplace/redemption economy in V1.

> **OPEN DECISION (rewards):** Virtual-only (points/badges shown to scholar) in V1, or tie to real-world redemption? Real-world redemption adds fulfillment + policy scope — recommended for a later phase.

---

## 13. Reporting — audit-ready, growth *and* behavior

Reports care about **growth and improvement — but not only that.** They also carry **behavior-during-assessment** signals and readiness. Cohort and individual exports target:
- **21st CCLC**
- **MSDE**
- **Program evaluator**

FERPA-compliant and 21st-CCLC-compliant by design. Reporting reads the same mastery / readiness / growth / behavior records that run the dashboards — the data that runs the classroom is the data that proves the outcome.

---

## 14. Core workflow (six stages)

1. **Set up the cohort.** Super-admin composes the cohort from the library (§9): pick surveys, pre/post-tests, retests, standards sets (ESSA/MCAP/state), blueprint, and knowledge entries; load frameworks + blueprint.
2. **Build/attach the assessments.** Items authored/tagged to standards + exam sections. Google Forms today, native over time.
3. **Capture the data.** Scholars complete pre-test at intake, post-test at close; **behavior telemetry captured during assessment**; surveys + observations attach. Attendance from Planbook/manual. All student-side actions timestamped.
4. **Map and score.** Item results → mastery by standard → readiness by section. Growth computed lowest-first-pretest → highest-final-posttest at every level, all attempts retained.
5. **Predict and recommend.** Readiness classified (On Track / Watch / Gap). The decision matrix ranks strategies (using gap + behavior signals + library KB) and presents best + alternates. Instructor selects and implements.
6. **Report.** Growth + behavior + readiness export into 21st CCLC, MSDE, evaluator formats.

---

## 15. Data model (core tables, draft)

Scope: D2D is one program — multi-scholar, multi-cohort, multi-instructor, multi-school, eventually multi-state. Scope enforced by school/cohort relationships; a program id supports future multi-state isolation.

- `programs` (id, name, state, settings, timestamps)
- `schools` (id, programId, name, timestamps)
- `cohorts` (id, programId, schoolId, name, term, status, timestamps)
- `users` (id, programId, email, name, tier[user|admin|super_admin], persona, status, authProviderId, timestamps)
- `student_profiles` (id, programId, userId, schoolId, gradeBand, timestamps)
- `parent_links` (id, programId, parentUserId, studentUserId)
- `staff_assignments` (id, programId, adminUserId, scopeType[cohort|school|program], scopeId)
- `enrollments` (id, programId, cohortId, studentUserId, status, timestamps)
- `framework_sets` (id, name, standardType[MCCR|PFL|ESSA|MCAP|state], adoptionYear, status)
- `standards` (id, frameworkSetId, code, description, domain)
- `exam_blueprints` (id, name, state, version, scoringBands, status)
- `exam_sections` (id, blueprintId, name)
- `blueprint_section_standards` (id, sectionId, standardId)
- **Library / composition**
  - `library_items` (id, programId, itemType[survey|pretest|posttest|retest|standards_set|blueprint|kb_doc], refId, title, tags, uploadedBy, version, timestamps)
  - `cohort_config` (id, programId, cohortId, libraryItemId, role, activatedBy, activatedAt)  ← per-cohort plug-in
- `assessments` (id, programId, type[pretest|posttest|survey|retest], title, deliveryMode[forms|native], timestamps)
- `assessment_items` (id, assessmentId, prompt, type, correctKey, timestamps)
- `item_standards` (id, itemId, standardId)
- `assessment_administrations` (id, programId, studentUserId, assessmentId, type, attemptNumber, startedAt, submittedAt)
- `item_responses` (id, administrationId, itemId, response, isCorrect, respondedAt)
- **Behavior telemetry (NEW)**
  - `item_interaction_events` (id, administrationId, itemId, studentUserId, eventType[view|answer|answer_change|revisit|idle|blur], value, occurredAt)
  - `item_behavior_summary` (id, administrationId, itemId, answerChangeCount, dwellMs, revisitCount, firstViewAt, finalAnswerAt)  ← rolled up for dashboards/reports
- `mastery_records` (id, programId, studentUserId, standardId, masteryLevel, evidenceCount, lastEvidenceAt)
- `readiness_records` (id, programId, studentUserId, blueprintId, sectionId, classification[on_track|watch|gap], computedAt)
- `growth_records` (id, programId, studentUserId, level[scholar|standard|section|cohort], refId, baselineValue, outcomeValue, delta, computedAt)  ← baseline=lowest first pretest, outcome=highest final posttest
- `attendance_records` (id, programId, studentUserId, cohortId, date, status, source[planbook|manual], enteredBy, timestamps)
- `clockin_events` (id, programId, studentUserId, cohortId, occurredAt)
- `reward_rules` (id, programId, cohortId?, eventType, points, badge, updatedBy, updatedAt)
- `reward_ledger` (id, programId, studentUserId, ruleId, points, awardedAt)
- `kb_library_entries` (id, programId, source[ESSA|WWC|CASEL|MCAP|upload|...], title, strategyType, tags, appliesToStandardId?, appliesToSectionId?, uploadedBy, version, timestamps)
- `decision_matrix_rules` (id, programId, cohortId?, gapSignal, readinessSignal, behaviorSignal?, strategyRank, kbEntryId, updatedBy, updatedAt)
- `recommendations` (id, programId, studentUserId, matrixRuleId, status[surfaced|selected|implemented], selectedBy, implementedAt)
- `report_exports` (id, programId, cohortId?, reportType[21stCCLC|MSDE|evaluator], generatedBy, generatedAt, payloadRef)
- `audit_events` (id, programId, actorUserId, actorTier, actorPersona, action, entityType, entityId, metadataJson, ipAddress, userAgent, createdAt)
- `feature_flags` (id, programId, cohortId?, key, enabled, configJson, updatedBy, updatedAt)

---

## 16. Compliance framework (build framework, not legal certification)

Student data on minors — FERPA is the spine; 21st CCLC reporting is a target output. This is the build framework, not a legal opinion.

- **FERPA-by-design:** data minimization; role/persona-scoped access; parents see only their own child; least privilege; **delete/core-function mutations super_admin only**; no cross-scope access except super_admin.
- **Timestamp everything student-side** — including behavior telemetry — immutable.
- **Audit logging:** every sensitive action (framework/blueprint load, library upload, cohort config change, matrix change, score entry/override, recommendation implemented, reward-rule change, deletion, user provisioning, report export, role change) writes an `audit_event`.
- **Data controls (placeholders for V1):** export scholar data; deactivate/delete; retention policy table. Policy text requires legal review.
- **Security:** server-side validation; schema validation on all mutations; DB constraints; no frontend secrets; protected routes; rate limiting on auth-sensitive endpoints; error monitoring.
- **SMS consent (noted):** any SMS reminder feature requires TCPA-style opt-in/opt-out per D2D's SMS & Privacy Policy. Out of V1 platform scope unless confirmed.

---

## 17. Phases

**Phase 1 (MVP / V1).** Instructor + super-admin dashboards (simplified, elegant, plain-language); cohort roster + single-student views; super-admin cohort library + per-cohort config; MCAP mapping (+ ESSA/MD PFL/MCCR standards sets); pre/post growth (lowest-first-pre → highest-final-post); **assessment behavior analytics** (Forms-limited fidelity); fixed decision-matrix recommendations from the KB library; Planbook + manual attendance; clock-in (rewards/data); reward system; 3-tier RBAC with read-only stakeholder; timestamping; audit; 21st CCLC / MSDE / evaluator exports.

**Phase 2.** Additional state-exam blueprints; **native assessment delivery** (full behavior-telemetry fidelity); deeper analytics; Financial Literacy Vortex mapping (candidate).

**Phase 3.** Predictive modeling on accumulated data; multi-state operation; expanded scholar/parent surfaces; feeds the LRNEX/Prysm/Audacity product roadmap.

---

## 18. Open decisions for review (consolidated)

**Resolved in v0.2:** engine relationship (§1), stakeholder/evaluator + instructor limits (§3), growth rule (§6.2), Vortex → V2 (§6.3), clock-in purpose (§4/§11).

**Still open:**
1. **Behavior-telemetry V1 fidelity** — how much dwell/answer-change data from Google Forms vs. waiting for native delivery? Proposed: Forms-limited now + light native wrapper where feasible; full fidelity Phase 2. (§7)
2. **Growth wording** — confirm "lowest first pretest → highest final posttest" means lowest among pretest attempts and highest among posttest attempts (proposed), vs strictly chronological first/last administration. (§6.2)
3. **Rewards** — virtual-only V1 (proposed) or real-world redemption? (§12)
4. **SMS notifications** — in V1 (requires consent workflow) or deferred? (§16)
5. **Career-tendency mapping** — the email/notes mention mapping to career tendencies as a learning goal. Confirm this is a forward-looking R&D output (Phase 2+), not a V1 dashboard feature. (§1)

---

## 19. Non-goals / out of scope for V1

- LRNEX / Prysm / Audacity as products (this build informs them; it does not deliver them).
- Predictive readiness modeling (Phase 3).
- Native in-app assessment authoring/delivery (Phase 2 — Google Forms in V1).
- Financial Literacy Vortex mapping (V2 candidate).
- Multi-state operation (architecture supports it; not exercised in V1).
- Student-facing content, lessons, or generative AI tutor (students only test/survey/clock-in/rewards).
- Real-world reward fulfillment/redemption economy.
- SMS notification system (unless confirmed with consent workflow).
- Full legal/FERPA certification, DPA, accessibility audit, pen test (post-MVP gates).

---

## 20. Known limitations (state plainly)

- Not production-ready; not FERPA-certified; not a completed compliance package.
- Recommendations are a fixed rules matrix, not predictive.
- Assessment delivery is Google Forms ingestion in V1; behavior-telemetry fidelity is limited until native delivery.
- Standards/blueprint coverage = MCCR Math, MD PFL, ESSA, and MCAP at launch; other frameworks/exams load later.
- Accessibility and security are designed-in but not yet audited/pen-tested.

---

## 21. Notes

Accurate for a build window starting on approval. A product and engineering specification for a pilot-ready build — **not** a compliance certification, legal opinion, or procurement checklist. Update only after piloting, legal review, or major architectural change. Where this document and Whitney's email differ, the meeting notes were treated as authoritative and the differences are flagged inline.
