# D2D Student Growth Platform — PRD + Architecture Spec

**Version:** 0.1 (review-ready draft)
**Status:** Pilot-ready build specification — NOT compliance-certified production
**Product:** D2D Student Growth Platform ("LMS D2D")
**Client / Program Owner:** Diapers 2 Deposits, Inc. (D2D)
**Builder:** Thrivv AI / Thrivv Hyperintelligence
**Engines (Thrivv build):** LRNEX, Prysm, Audacity
**Source material:** Whitney's build-overview email + meeting notes (2026-08)

> **This document is for review. No design or code begins until it is approved.**
> Sourced from Whitney's "Build Overview, Goals & Workflow" email and follow-up meeting notes. Where the notes and the email conflict, the meeting notes are treated as the authority and the conflict is called out inline.

---

## 1. What this is (and is not)

The D2D Student Growth Platform is an **instructor-facing data spine** for Diapers 2 Deposits' out-of-school-time programming. Today, scholar growth lives in scattered Google Forms, spreadsheets, and instructor memory. This platform puts it in one place: **pre-test and post-test in → growth and state-exam readiness out**, with a recommendation layer that tells instructors exactly where to push next. It turns d2dmoneyhub.com from a content site into the program's data spine.

- **Students barely touch it.** In V1 their surface is: take pre-tests, post-tests, and surveys; a clock-in button; and their reward view. Nothing else.
- **Everyone else works from the dashboard:** instructors, the Instructional Lead, admins, the evaluator, and school staff.

**This is a distinct product from the generic LRNEX MVP.** Per Whitney's email, LRNEX (with Prysm and Audacity) is one of **Thrivv's engine features** that powers this build. So: D2D Student Growth Platform is the product; LRNEX/Prysm/Audacity are engines embedded inside it. The proprietary program logic (F.A.S.T. Framework, Financial Literacy Vortex, AFC®-aligned standards) belongs to D2D; the engine and platform are Thrivv's build.

**Not production-certified on day one.** Same stance as all Thrivv MVPs: build it compliance-aligned and pilot-ready, with the technical controls (FERPA-by-design, role-based access, audit, timestamping) needed to reach production after legal, security, accessibility, and procurement review. Do not describe it as fully FERPA-certified or audit-certified until that review is done.

---

## 2. The architectural spine — a pluggable shell (PRIORITY REQUIREMENT)

Both the email's stated *priority requirement* ("standards frameworks and exam blueprints are configuration, not hard-coded") and the meeting note ("the LMS is essentially a shell with pluggable capabilities") describe the same backbone. This is the single most important architectural decision and everything else hangs off it.

**The platform maps student learning against MCAP today and must accept additional state exams over time without a rebuild.** Build the standards + exam layer as a set of registries:

### 2.1 Framework registry
Academic standards live as **loadable, versioned sets**, versioned by adoption year (standards change over time). At launch:
- **MCCR Math** (Maryland College and Career Ready standards)
- **Maryland Personal Financial Literacy (PFL)**
- Additional frameworks (e.g., other states') drop in as new loadable sets.

### 2.2 Exam blueprint registry
Each state exam is defined as a **blueprint**: its sections, the standards each section tests, and its scoring bands. **MCAP is the first blueprint.** Other state exams are added as new blueprints — a configuration step, not a code change.

### 2.3 Pluggable mapping
- Assessment **items** map to **standards**.
- **Standards** map to **exam sections** through the **active blueprint**.
- Swap or add a blueprint and the **same scholar data re-maps** against the new exam with no code change.

**Who loads this:** an executive/super-admin team member — **not** the instructor — loads framework sets and exam blueprints (per the email).

### 2.4 Pluggable engines
Recommendation logic, and future analytics/predictive features, are engine plug-ins (LRNEX / Prysm / Audacity) behind a stable interface — swappable and independently upgradeable, so the "shell" stays thin and the capabilities are modular.

---

## 3. Roles & Permissions (FERPA-aligned, 3-tier with personas)

Access is role-based and FERPA-aligned. Three permission **tiers**, each containing one or more **personas** that carve scope within the tier. (This reconciles the meeting note's "user / admin / super admin" with the email's four-persona list.)

### Tier 1 — `user` (base access)
| Persona | Access |
|---|---|
| **student** (scholar) | Minimal surface only: take assigned pre-tests, post-tests, surveys; clock-in button; view own rewards. All actions timestamped. No dashboard, no other data. |
| **parent** | Read-only, **their own child only** — that scholar's growth and outcome view. No cohort or cross-scholar visibility. |

### Tier 2 — `admin` (operational, cohort/site-scoped)
| Persona | Access |
|---|---|
| **instructor** | Assigned cohort roster + single-student dashboards; administer and score assessments; view growth + recommendations; select a recommendation and mark it implemented; manual attendance entry. |
| **school_admin** | Broader access across their school's cohorts and reporting. |
| **instructional_lead** | Oversight across cohorts and instructors; assignment and quality/QA; growth + recommendation view across assigned scope. |

### Tier 3 — `super_admin` (full control)
| Persona | Access |
|---|---|
| **CEO / program_director / dev_team** | Controls everything within each cohort. Loads framework sets and exam blueprints; manages the evidence-base KB library; manages feature flags/config and reward rules; provisions users; full cross-cohort / cross-school / (future) cross-state reporting. |

**Permission model:** every scholar-owned query is scoped by the actor's tier **and** persona scope (own child / assigned cohort / assigned school / all). Permission checks live in **one centralized authorization module**. No cross-scope access except `super_admin`.

> **OPEN DECISION (roles):** The email names a **Stakeholder / evaluator** persona with read-only access to growth/outcome data for evaluations. It was not explicitly placed in the 3-tier model. **Proposed:** a read-only `stakeholder` persona, provisioned and scope-limited by `super_admin` (sits alongside `parent` conceptually but scoped to cohort/program outcome data, not a single child). Confirm whether stakeholder/evaluator access is in V1 or a later phase.

---

## 4. Student surface (V1) — full scope

Per the meeting notes (which override the email's "minimal surface, nothing else"), the V1 student surface is:

1. **Log in** (minimal, scholar-appropriate).
2. **Clock-in button** — a single tap that records a timestamped presence/engagement event. Feeds the reward system and can inform attendance/engagement signals.
3. **Take assigned assessments** — pre-tests, post-tests, and **surveys** (confidence / self-reflection).
4. **Reward view** — the scholar's earned rewards/points/badges.

**Everything on the student side is timestamped** (login, clock-in, assessment start/submit, each item response, survey submission, reward events). Timestamps are immutable audit records.

Students never see cohort data, other scholars, dashboards, recommendations, or reports.

---

## 5. Assessment model

### 5.1 Types
`pretest`, `posttest`, `survey`. Each assessment item is authored and **tagged to a standard and to the exam section it feeds**.

### 5.2 Delivery
Google Forms today, **native delivery over time** (Phase 2). The data model must not assume the delivery mechanism — scores flow in whether authored natively or ingested from Forms.

### 5.3 Retake rule (from email — important)
- **Unlimited pre- and post-test retakes** are allowed ("mind mining" of scholars' choices — all attempts are retained).
- **A pretest retake stays a pretest** — a pretest taken 3× is still a pretest, **never** auto-promoted to a post-test.
- Each administration records `assessment_type`, `attempt_number`, and full timestamps; all attempts are preserved.

> **OPEN DECISION (growth baseline):** With unlimited retakes, growth needs a defined baseline and outcome. **Proposed:** growth = **first-administered pretest** (baseline) → **final-administered posttest** (outcome), per standard/section/scholar. Confirm, or specify best-attempt vs first/last.

### 5.4 Surveys
Confidence / self-reflection surveys attach to the scholar record and sit alongside academic growth (teacher-reported observations attach here too).

---

## 6. Standards mapping, growth, and readiness

### 6.1 Mapping & mastery
Every item → standard → exam section (through the active blueprint). A scholar's answers roll up into **mastery by standard** and **readiness by exam section**.

### 6.2 Growth tracking
Pre-to-post movement computed at every level: **scholar, standard, exam section, cohort**. Attendance displays alongside academic growth so instructors see the two together.

### 6.3 Readiness classification
Each scholar is classified per exam section as **On Track / Watch / Gap**. In V1 this classification runs on **D2D's fixed rules** mapping program growth/mastery to projected state-exam performance. Predictive modeling on accumulated data is **Phase 3**, explicitly out of V1.

> **OPEN DECISION (Financial Literacy Vortex):** Whitney's email asks, "Should we also map to the Financial Literacy Vortex?" Confirm whether V1 maps scholar data to the Vortex model in addition to MCCR Math + MD PFL, or whether that's a later addition.

---

## 7. Recommendation engine — fixed static decision matrix

Per the meeting notes, the V1 recommendation engine is a **fixed, static decision matrix** — not predictive, no AI inference. It runs D2D's proprietary logic inside the system.

### 7.1 How it works
- Input: a scholar's **largest gap** (lowest-mastery standard/section) and **strongest lever**, plus their readiness classification.
- The **decision matrix** maps (gap / readiness signal) → a **prioritized support strategy**, plus ranked alternates.
- Each matrix cell references one or more entries in the **evidence-base knowledge library** (below), so every recommended strategy is grounded in a cited source.
- The **instructor selects one strategy and marks it implemented** — a timestamped, audited action.
- The matrix itself is authored and controlled by `super_admin`.

### 7.2 Evidence-base knowledge library
Recommendations draw their strategy content from an **uploaded knowledge base stored in its own library**, e.g. **ESSA, WWC, CASEL, MCAP**, and similar. Each library entry carries metadata: source/framework, strategy type, tags, and the standard/section/gap it applies to. `super_admin` manages uploads and mappings. The decision matrix's cells reference these entries.

> This keeps V1 fully rules-based and auditable while sourcing strategy content from recognized evidence bases. The email's "as the data set grows, it becomes predictive" is **Phase 3**, not V1.

---

## 8. Attendance

- Syncs from **Planbook**, **or** manually entered by an admin.
- Displays alongside academic growth on the instructor dashboard.
- Clock-in events (§4) provide an independent, timestamped engagement signal.

> **OPEN DECISION (attendance source of truth):** Confirm the relationship between Planbook attendance and student clock-in — is clock-in an engagement/reward signal only, or does it also feed the official attendance record when Planbook is absent?

---

## 9. Reward system (V1)

A reward system tied to scholar behavior and activity in the platform.

- **Earning events** (timestamped): clock-in, completing a pre-test / post-test, completing a survey — a configurable set.
- **Reward rules:** an event → points/tokens/badge mapping, **controlled by `super_admin`** (and adjustable per cohort, since super admin controls what happens within each cohort).
- **Reward ledger:** per-scholar record of earned rewards, fully timestamped and auditable.
- **Scholar view:** the student surface shows earned rewards/points/badges.

Kept intentionally simple in V1 (points/badges on defined events). No marketplace, no redemption economy, no external fulfillment in V1.

> **OPEN DECISION (rewards):** Confirm whether V1 rewards are purely virtual (points/badges shown to the scholar) or tie to any real-world redemption. Real-world redemption adds fulfillment + policy scope and is recommended for a later phase.

---

## 10. Reporting — audit-ready

Growth data is the same data that proves the outcome. Cohort and individual growth export into the formats D2D needs for:
- **21st CCLC** (21st Century Community Learning Centers)
- **MSDE** (Maryland State Department of Education)
- **Program evaluator**

Exports are audit-ready by design. Reporting reads from the same mastery/readiness/growth records that run the instructor dashboard.

---

## 11. Core workflow (six stages, from the email)

1. **Set up the standards.** Super-admin loads the framework sets + exam blueprint for the cohort (MCAP now). Each tested section maps to the standards that feed it.
2. **Build the assessments.** Pre-test and post-test items authored and tagged to standards + exam sections. Delivered via Google Forms today, native over time.
3. **Capture the data.** Scholars complete the pre-test at intake and post-test at close; scores flow in. Attendance syncs from Planbook. Teacher observations + confidence-survey results attach to the scholar record. All student-side actions timestamped.
4. **Map and score.** Item-level results roll into mastery by standard, then readiness by exam section. Growth computed pre-to-post at scholar / standard / section / cohort.
5. **Predict and recommend.** Each scholar classified for readiness by section (On Track / Watch / Gap). The decision matrix ranks support strategies and presents the best match plus alternates. Instructor selects and implements (timestamped, audited).
6. **Report.** Cohort and individual growth export into 21st CCLC, MSDE, and evaluator formats.

---

## 12. Data model (core tables, draft)

Tenant/scope: D2D is one program that is **multi-scholar, multi-cohort, multi-instructor, multi-school, and eventually multi-state.** Scope is enforced by school/cohort relationships; a program/tenant id supports future multi-state isolation.

- `programs` (tenant root: id, name, state, settings, timestamps)
- `schools` (id, programId, name, timestamps)
- `cohorts` (id, programId, schoolId, name, term, status, timestamps)
- `users` (id, programId, email, name, tier[user|admin|super_admin], persona, status, authProviderId, timestamps)
- `student_profiles` (id, programId, userId, schoolId, gradeBand, timestamps)
- `parent_links` (id, programId, parentUserId, studentUserId)
- `staff_assignments` (id, programId, adminUserId, scopeType[cohort|school|program], scopeId)
- `enrollments` (id, programId, cohortId, studentUserId, status, timestamps)
- `framework_sets` (id, name, adoptionYear, status)
- `standards` (id, frameworkSetId, code, description, domain)
- `exam_blueprints` (id, name, state, version, scoringBands, status)
- `exam_sections` (id, blueprintId, name)
- `blueprint_section_standards` (id, sectionId, standardId)  ← the pluggable mapping
- `assessments` (id, programId, cohortId, type[pretest|posttest|survey], title, deliveryMode[forms|native], timestamps)
- `assessment_items` (id, assessmentId, prompt, type, correctKey, timestamps)
- `item_standards` (id, itemId, standardId)  ← item → standard tag
- `assessment_administrations` (id, programId, studentUserId, assessmentId, type, attemptNumber, startedAt, submittedAt)  ← retake rule lives here
- `item_responses` (id, administrationId, itemId, response, isCorrect, respondedAt)  ← timestamped
- `mastery_records` (id, programId, studentUserId, standardId, masteryLevel, evidenceCount, lastEvidenceAt)
- `readiness_records` (id, programId, studentUserId, blueprintId, sectionId, classification[on_track|watch|gap], computedAt)
- `growth_records` (id, programId, studentUserId, level[scholar|standard|section|cohort], refId, preValue, postValue, delta, computedAt)
- `attendance_records` (id, programId, studentUserId, cohortId, date, status, source[planbook|manual], enteredBy, timestamps)
- `clockin_events` (id, programId, studentUserId, cohortId, occurredAt)  ← timestamped
- `reward_rules` (id, programId, cohortId?, eventType, points, badge, updatedBy, updatedAt)  ← super_admin controlled
- `reward_ledger` (id, programId, studentUserId, ruleId, points, awardedAt)  ← timestamped
- `kb_library_entries` (id, programId, source[ESSA|WWC|CASEL|MCAP|...], title, strategyType, tags, appliesToStandardId?, appliesToSectionId?, uploadedBy, timestamps)
- `decision_matrix_rules` (id, programId, gapSignal, readinessSignal, strategyRank, kbEntryId, updatedBy, updatedAt)  ← the static matrix
- `recommendations` (id, programId, studentUserId, matrixRuleId, status[surfaced|selected|implemented], selectedBy, implementedAt)
- `report_exports` (id, programId, cohortId?, reportType[21stCCLC|MSDE|evaluator], generatedBy, generatedAt, payloadRef)
- `audit_events` (id, programId, actorUserId, actorTier, actorPersona, action, entityType, entityId, metadataJson, ipAddress, userAgent, createdAt)
- `feature_flags` (id, programId, cohortId?, key, enabled, configJson, updatedBy, updatedAt)

---

## 13. Compliance framework (build framework, not legal certification)

Student data on minors — FERPA is the spine. This is the build framework, not a legal opinion.

- **FERPA-by-design:** data minimization; role/persona-scoped access; parents see only their own child; least privilege; no cross-scope access except super_admin.
- **Timestamp everything student-side** (login, clock-in, assessment start/submit, each response, survey, reward events) — immutable.
- **Audit logging:** every sensitive action (blueprint load, framework load, KB upload, matrix change, score entry/override, recommendation implemented, reward rule change, user provisioning, report export, role change) writes an `audit_event`.
- **Data controls (placeholders for V1):** export scholar data; deactivate/delete; retention policy table. Actual policy text requires legal review.
- **Security:** server-side validation; schema validation on all mutations; DB constraints; no frontend secrets; protected routes; rate limiting on auth-sensitive endpoints; error monitoring.
- **SMS consent (noted):** D2D's SMS communications require TCPA-style consent (see the SMS & Privacy Policy referenced in D2D materials). Any SMS reminder/notification feature must capture and honor opt-in/opt-out. **Out of V1 platform scope unless confirmed** — flagged so it isn't built without the consent workflow.

---

## 14. Phases

**Phase 1 (MVP / V1).** Instructor dashboard; cohort roster + single-student views; MCAP mapping; pre/post growth; **fixed decision-matrix recommendations** sourced from the KB library; Planbook attendance display + manual entry; 3-tier role-based access; student surface (pre/post-test, surveys, clock-in, rewards); timestamping; audit; export for 21st CCLC / MSDE / evaluator.

**Phase 2.** Additional state-exam blueprints; native assessment delivery; deeper analytics.

**Phase 3.** Predictive modeling on accumulated data; multi-state operation; expanded scholar and parent surfaces.

---

## 15. Open decisions for review (consolidated)

1. **Stakeholder/evaluator role** — read-only persona in V1 (proposed, super-admin-provisioned) or later phase? (§3)
2. **Growth baseline** — first-pre → final-post (proposed) vs best-attempt or other? (§5.3)
3. **Financial Literacy Vortex mapping** — map to the Vortex in V1 or later? (§6.3)
4. **Clock-in vs Planbook** — is clock-in engagement/reward only, or a fallback attendance source of truth? (§8)
5. **Rewards** — virtual-only in V1 (proposed) or real-world redemption? (§9)
6. **SMS notifications** — in V1 (requires consent workflow) or deferred? (§13)
7. **Engine boundaries** — confirm which of LRNEX / Prysm / Audacity power which capability (e.g., LRNEX = mastery/assessment engine, Prysm = ?, Audacity = ?), so the plug-in interfaces are drawn correctly. (§2.4)

---

## 16. Non-goals / out of scope for V1

- Predictive readiness modeling (Phase 3).
- Native in-app assessment authoring/delivery (Phase 2 — Google Forms in V1).
- Multi-state operation (architecture supports it; not exercised in V1).
- Student-facing content, lessons, or generative AI tutor (students only test/survey/clock-in/rewards).
- Real-world reward fulfillment/redemption economy.
- SMS notification system (unless confirmed with consent workflow).
- Full legal/FERPA certification, DPA, accessibility audit, pen test (post-MVP gates).

---

## 17. Known limitations (state plainly)

- Not production-ready; not FERPA-certified; not a completed compliance package.
- Recommendations are a fixed rules matrix, not predictive.
- Assessment delivery is via Google Forms ingestion in V1.
- Standards/blueprint coverage = MCCR Math, MD PFL, and MCAP at launch; other frameworks/exams load later.
- Accessibility and security are designed-in but not yet audited/pen-tested.

---

## 18. Notes

Accurate for a build window starting on approval. This is a product and engineering specification for a pilot-ready build — **not** a compliance certification, legal opinion, or procurement checklist. Update only after piloting, legal review, or major architectural change. Where this document and Whitney's email differ, the meeting notes were treated as authoritative and the differences are flagged inline.
