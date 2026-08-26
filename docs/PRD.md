# LRNEX MVP — PRD + Architecture Spec

**Version:** 0.3 (consolidated, review-ready)
**Status:** Pilot-ready build specification — NOT compliance-certified production
**Supersedes:** v0.2 (incorporates it in full)
**Primary Builder:** Claude Code
**Product:** LRNEX
**Parent Ecosystem:** Thrivv AI / Thrivv Hyperintelligence
**Build Window:** 30 days
**Build Strategy:** Compliance-aligned modular monolith with a clean upgrade path to district-ready production

> **This document is for review. No design or code should begin until it is approved.**

---

## 0. What changed from v0.2 → v0.3

v0.3 is v0.2 with three additions and zero scope expansion:

1. **A decision record** (§1) capturing a set of "consumer-slick" feature ideas that were evaluated and **rejected or deferred** on 2026-08-26, with reasons — so the same ideas don't quietly reappear mid-build.
2. **Resolved build decisions** (§14) that nail down the five underspecified areas from the v0.2 review. These were the items that would have caused a stall around build-day 10–12 if left open. They are now concrete and reviewable.
3. **A pre-build gate** (§15). The 30-day clock starts *after* this document is approved and the pre-build spike is done — not at first commit.

Everything else is v0.2, preserved.

---

## 1. Decision Record — rejected / deferred ideas

A batch of features was proposed after v0.2 ("AI-native LMS" framing: a Gemini-powered in-lesson tutor, a student AI Knowledge Hub, instant Learner⇄Instructor role switching, a ⌘K command palette, skill-vector radar meters, capstone submissions). Each was evaluated against the v0.2 compliance spine. Decisions:

| Idea | Decision | Reason |
|---|---|---|
| **Student-facing AI tutor sidecar** (in-lesson chat, "ask questions") | **Rejected for MVP** | Directly reverses v0.2's core posture: "no student-facing generative AI in MVP." Users are minors; this is the COPPA/FERPA line that keeps LRNEX sellable to a district. The gateway + feature flag stay so it can be enabled *later*, per-tenant, behind consent + logging. |
| **Student AI Knowledge Hub** (generate quizzes, summarize) | **Rejected for MVP** | Same reason. Rule-based hints and structured feedback remain allowed. |
| **Gemini 2.5 Flash as the integrated tutor API** | **Rejected as specified** | Violates two explicit v0.2 rules: "no Google services" and "no hardcoded provider — AI providers are adapters behind the gateway." If Gemini is ever used, it enters as one adapter behind the AI-gateway interface, swappable with Anthropic/OpenAI. Not wired into lessons. |
| **Instant Learner ⇄ Instructor/Architect switching** | **Rejected as specified** | A learner toggling into instructor mode is privilege escalation, not a feature. Breaks RBAC, tenant isolation, and audit — the institutional-trust posture LRNEX sells. A view toggle *may* be reconsidered post-MVP, but only for accounts that already hold both roles. |
| **⌘K command palette** | **Deferred (optional, post-MVP)** | No conflict; genuinely nice. Cut from the 30-day scope only to protect the timeline. Any future palette entry that triggers AI must respect the same gating as the tutor. |
| **Skill-vector / radar mastery meters** | **Deferred (optional presentation layer)** | Compatible — it's a visualization over `mastery_records`, not new data. The MVP ships mastery as defined in §14.1; radar visualization is a fast follow if desired. |
| **Verified capstone project submissions** | **Deferred** | Real added scope: new submission entity, artifact upload/storage, teacher verification workflow, badges (~3–5 build days). Not in the 30-day boundary. Modeled cleanly if added later (a new assignment *type* with a teacher-verification gate). |

**Net effect:** the MVP is exactly the v0.2 spine. Nothing consumer-facing-AI was added.

---

## 2. Critical Correction (from v0.2, unchanged)

This build must **not** be described as fully production-ready on day one.

**Target:** *A pilot-ready, compliance-aligned MVP that demonstrates the LRNEX learning loop, teacher utility, admin visibility, tenant isolation, and AI-governance architecture — without overclaiming legal, security, or district-procurement readiness.*

Production readiness requires additional work after MVP: legal review, FERPA/COPPA/student-privacy review, DPA template, security policy set, incident-response plan, accessibility audit, pen test, vendor risk review, hosting hardening, SOC 2 readiness plan, LMS/SIS sandbox validation, live pilot consent workflow.

The MVP is built so those controls can be added cleanly. It is **not** itself a certified compliance product.

---

## 3. Product Stance

LRNEX is a K-12 math and STEM learning platform for **mastery learning, institutional trust, measurable growth, and teacher/admin usefulness.**

It is not a generic chatbot, not a lightweight tutoring app. It is a structured learning operating system with: learner profile, teacher dashboard, content engine, assessment loop, admin reporting, integration foundation, auditability, tenant isolation, and a future-safe AI gateway.

The first MVP proves the **learning loop** before expanding into full LMS replacement, SIS sync, transcript engine, parent portal, mobile apps, or unrestricted student-facing AI.

---

## 4. MVP Spine

### 4.1 Learner Profile
**Must:** student identity; tenant/school/class relationship; grade band; active courses/paths; standards mastery state; assessment attempt history; time-on-task; intervention flags; accessibility/accommodation flags; learning preferences; basic interest profile; activity timeline.
**Should:** diagnostic placement score; confidence/self-reflection check-ins; recommended next activity.
**Do not build yet:** full personality engine; demographic/culturally-responsive model; parent-facing profile; portable mastery transcript; employer-readable ledger; student social graph.

### 4.2 Teacher Dashboard
**Must:** teacher login; class roster; student progress overview; assignment creation; standards mastery heatmap; recent attempts; intervention queue; student detail view; export to CSV; basic content-assignment workflow.
**Should:** PDF export; filter by standard/class/mastery/risk flag; teacher notes.
**Do not build yet:** full AI lesson planner; family-comms automation; gradebook replacement; cross-school teacher community; PD credentialing suite.

### 4.3 Content Engine
**Entities:** Standard, Subject, GradeBand, Unit, Lesson, QuestionItem, Hint, Rubric, Assignment, ContentVersion.
**Capabilities:** create/edit draft lessons; publish content versions; attach standards; create objective questions; create short-response questions; assign to class; render student activity flow.
**Do not build yet:** curriculum marketplace; AI content-generation pipeline; AR/VR; full Mission Studio; multi-author publishing workflow.

### 4.4 Assessment Loop (heart of the MVP)
Loop: teacher assigns → student completes → system records attempt → auto-scores objective items → teacher reviews short-response → system updates mastery → system recommends next step → teacher sees intervention signals.
**Must:** attempt records; auto-scored MC/numeric; short-response for teacher review; mastery update rules (see §14.1); attempt history; basic recommendation logic (§14.5); student feedback screen; teacher review queue.
**Do not build yet:** AI essay scoring; high-stakes mode; district benchmark testing; psychometric calibration; adaptive testing; full mastery transcript.

### 4.5 Admin Reporting
**Must:** tenant dashboard; active users; classes; teachers; students; assessment completion; standards mastery summary; usage by class; audit logs; feature flags; data-export request placeholder; deletion-request placeholder.
**Should:** school-level drilldown; CSV export; admin-only incident log.
**Do not build yet:** ROI dashboard; grant dashboard; consortium reporting; board-ready PDF packets; research-pod reporting.

### 4.6 Integrations
**Must:** email/password auth; RBAC; CSV roster import; manual class creation; provider-ready auth abstraction.
**Should:** Microsoft/Google SSO later via adapter; LTI 1.3 data-model placeholders; OneRoster data-model placeholders.
**Do not build yet:** full LTI 1.3 launch; full OneRoster sync; SIS bidirectional; SCIM; LMS grade passback; identity federation.

---

## 5. Final Stack Decision

### MVP Stack
Next.js 15 · TypeScript · React · Tailwind · shadcn/ui (Radix + lucide-react) · PostgreSQL · Prisma · Supabase Auth · Supabase Storage · Zod · Recharts · Vitest (+ Playwright optional) · internal event table for analytics · Vercel + Supabase deploy · GitHub · **AI provider gateway stub only, disabled for learners by default.**

Roles: `learner`, `teacher`, `school_admin`, `platform_admin`.

### Production Upgrade Stack (post-MVP)
AWS App Runner / ECS Fargate · RDS PostgreSQL · S3 · CloudFront · WAF · Secrets Manager · CloudWatch + Sentry · Cognito/Auth.js/Supabase-enterprise per procurement · compliance posture (DPA, retention, deletion/export, accessibility audit, pen test, SOC 2 roadmap).

**Architecture:** modular monolith. No microservices in the first 30 days. No Google-specific services. Clean domain modules, backend logic separated from UI.

---

## 6. Compliance-Ready Framework (build framework, not legal certification)

**Core principles:** data minimization; tenant isolation; least-privilege access; age-aware AI controls; human review for consequential educational decisions; auditability; exportability; deletion readiness; accessibility by design; no hidden model training on student data; no unrestricted student-facing generative AI in MVP.

### 6.1 Tenant Isolation
Every applicable record carries `tenantId`. Every query is scoped by `tenantId` + role + permissions + class/school relationship. No global access except `platform_admin`.

### 6.2 RBAC
Four roles (above). Permission checks live in **one centralized authorization module** — never inline, never duplicated.

### 6.3 Audit Logging
Every sensitive action writes an audit event.
Fields: `id, tenantId, actorUserId, actorRole, action, entityType, entityId, metadata, ipAddress, userAgent, createdAt`.
Audited actions: login; role change; user creation; roster import; assignment creation; assessment submission; teacher score override; mastery update; content publish; data-export request; deletion request; feature-flag change; AI interaction (when enabled).

### 6.4 Data Retention
Placeholder controls for: export student data; delete/deactivate account; anonymize records; retention-policy table. Actual policy text requires legal review.

### 6.5 AI Safety
MVP: gateway exists; learner-facing AI **disabled by default**; teacher-facing AI disabled or stubbed; rule-based hints allowed; AI provider keys **not required** for the core app to run.
When enabled later: all AI requests go through the backend gateway (no direct client calls); redact PII where possible; log prompt/response metadata; store full content only if policy allows; per-tenant admin disable; unsafe-output reports create incidents; teacher override always available.

### 6.6 Accessibility
Keyboard nav; semantic HTML; sufficient contrast; form labels; error states; readable font sizes; responsive mobile; no essential color-only indicators.

### 6.7 Security
Server-side validation; Zod schemas; DB constraints; RLS (Supabase); secure env vars; no frontend secrets; rate limiting on auth-sensitive endpoints; password reset; protected routes; basic security headers; dependency scanning; Sentry/error logging.

---

## 7. Architecture Brief

**Frontend shells:** learner · teacher · admin · shared component library.
**Application modules:** auth · tenancy · users/roles · roster · content · assignment · assessment · mastery · reporting · audit · feature-flags · ai-gateway.
**Database:** PostgreSQL · Prisma migrations · tenant-scoped relational schema.
**Storage:** object storage for curriculum files, exports, future media.
**Deployment:** Vercel + Supabase (MVP) → AWS path (hardened production).

---

## 8. Data Model (core tables)

`tenants` (id, name, type, status, settings, createdAt, updatedAt)
`schools` (id, tenantId, name, ncesId?, createdAt, updatedAt)
`users` (id, tenantId, email, firstName, lastName, role, status, authProviderId, createdAt, updatedAt)
`learner_profiles` (id, tenantId, userId, schoolId, gradeBand, accommodations, interests, placementLevel, createdAt, updatedAt)
`teacher_profiles` (id, tenantId, userId, schoolId, subjects, createdAt, updatedAt)
`classes` (id, tenantId, schoolId, teacherId, name, subject, gradeBand, status, createdAt, updatedAt)
`enrollments` (id, tenantId, classId, learnerUserId, status, createdAt, updatedAt)
`standards` (id, code, framework, subject, gradeBand, description)
`units` (id, tenantId, title, description, subject, gradeBand, status, createdAt, updatedAt)
`lessons` (id, tenantId, unitId, title, description, contentJson, status, currentVersionId, createdAt, updatedAt)
`content_versions` (id, tenantId, lessonId, versionNumber, contentJson, createdBy, publishedAt, createdAt)
`question_items` (id, tenantId, lessonId, type, prompt, choicesJson, correctAnswerJson, explanation, difficulty, createdAt, updatedAt)
`question_standards` (id, questionItemId, standardId)
`assignments` (id, tenantId, classId, lessonId, title, instructions, dueAt, createdBy, status, createdAt, updatedAt)
`assessment_attempts` (id, tenantId, assignmentId, learnerUserId, status, startedAt, submittedAt, score, createdAt, updatedAt)
`assessment_responses` (id, tenantId, attemptId, questionItemId, responseJson, isCorrect, score, teacherReviewed, feedback, createdAt, updatedAt)
`mastery_records` (id, tenantId, learnerUserId, standardId, masteryLevel, evidenceCount, lastEvidenceAt, updatedAt)
`intervention_flags` (id, tenantId, learnerUserId, classId, type, severity, reason, status, createdAt, resolvedAt)
`audit_events` (id, tenantId, actorUserId, actorRole, action, entityType, entityId, metadataJson, ipAddress, userAgent, createdAt)
`feature_flags` (id, tenantId, key, enabled, configJson, updatedBy, updatedAt)
`app_events` (id, tenantId, userId, eventType, propertiesJson, createdAt)

---

## 9. Feature Boundary

**In scope (30 days):** authentication; RBAC; tenant-aware schema; learner dashboard + profile; teacher dashboard; roster management; CSV import; content engine; standards mapping; assignment flow; assessment attempt flow; objective scoring; teacher-reviewed short response; mastery update logic; admin dashboard; audit logs; feature flags; AI gateway stub; seed data; demo content; basic tests; deployment.

**Out of scope (30 days):** full student-facing AI tutor; voice AI; parent portal; payments; mobile apps; full LTI 1.3; full OneRoster; SIS sync; full PD suite; mastery transcript; Mission Studio full build; AR/VR; full research dashboard; SOC 2 certification; full legal compliance package; marketplace; teacher community/forum. *(Plus the deferred items in §1: ⌘K palette, radar meters, capstone submissions.)*

---

## 10. Production Readiness Gates

**Security:** auth hardened; tenant isolation tested; RBAC tested; RLS enabled; secrets managed; audit logs working; rate limiting; dependency scan passing; error monitoring; backup/restore tested.
**Compliance:** privacy policy drafted; DPA drafted; student-data map; retention policy; deletion/export workflows tested; AI data policy drafted; vendor review; accessibility review; incident-response plan.
**Product:** learner flow tested; teacher assignment flow tested; assessment loop tested; admin reporting tested; CSV import tested; seed demo ready; pilot demo script ready.
**Operational:** runbook; env vars documented; deployment steps; migration procedure; backup procedure; support intake.

---

## 11. Claude Code Build Non-Negotiables

Strict TypeScript · Prisma migrations · PostgreSQL · role-based access checks · every tenant-owned query scoped by `tenantId` · no direct AI calls from frontend · no secrets in frontend · no fake production claims · no student-facing AI tutor in MVP · modular system · tests for tenant isolation, auth guards, and assessment scoring.

---

## 12. 30-Day Budget

- **Recommended ceiling:** $15,000 (Claude Code heavy, tight scope).
- **Stretch:** $25,000 (external eng/design help).
- **Do not exceed:** $30,000 before signed pilot interest, grant movement, or partner commitment.
- **Lean founder-led:** $5,000–$8,000. **Serious MVP:** $12,000–$15,000. **External support:** $20,000–$25,000.

The goal is a credible pilot artifact that unlocks school/district conversations, grant readiness, demo calls, pilot LOIs, and investor/research credibility — not a perfect LMS.

---

## 13. Required Frontend Routes

`/login` · `/learner` · `/learner/profile` · `/learner/assignments` · `/learner/assignments/[id]` · `/teacher` · `/teacher/classes` · `/teacher/classes/[id]` · `/teacher/assignments/new` · `/teacher/review` · `/admin` · `/admin/users` · `/admin/reports` · `/admin/audit` · `/admin/settings`.

Every protected page redirects unauthenticated users. A learner cannot reach teacher/admin routes. A teacher cannot reach another tenant's data. A `school_admin` cannot reach `platform_admin`-only controls.

---

## 14. Resolved Build Decisions (NEW — the review targets)

These five were underspecified in v0.2 and are the most likely cause of a mid-build stall. Proposed resolutions below — **please review and adjust each; they are meant to be argued with.**

### 14.1 Mastery algorithm
Mastery is per `(learnerUserId, standardId)`, stored in `mastery_records.masteryLevel` as an enum, derived from scored evidence on questions tagged to that standard (via `question_standards`).

**Levels & rule (proposed):**

| Level | Meaning | Rule |
|---|---|---|
| `not_started` | no evidence | `evidenceCount = 0` |
| `developing` | early, low accuracy | rolling accuracy < 60% |
| `approaching` | partial | 60–79% |
| `proficient` | meets bar | ≥ 80% across **≥ 3** evidence items |
| `mastered` | sustained | ≥ 90% across **≥ 5** evidence items, most recent 3 all correct |

- **Rolling accuracy** = weighted over the last *N = 8* evidence items for that standard, recency-weighted (most recent counts ~2×). Full attempt history is retained; the window only governs the level.
- Mastery **never silently downgrades** below `proficient` on a single bad attempt; a drop below the bar for 2 consecutive attempts is what lowers a level (prevents demo whiplash and matches how teachers think).
- Every recompute writes a `mastery update` **audit event** and updates `evidenceCount` / `lastEvidenceAt`.
- Short-response items only contribute evidence **after** the teacher scores them.

*Open question for review: are 5 levels right, or do you want a simpler 3-level (developing / proficient / mastered) for a cleaner heatmap?*

### 14.2 `contentJson` / `responseJson` schema
Both lesson `contentJson` and question rendering are governed by **explicit Zod schemas** (not free-form blobs), so renderer and editor share one contract.

- **Lesson `contentJson`:** an ordered array of typed blocks — `{ type: "rich_text" | "image" | "callout" | "question_ref", ... }`. `question_ref` points at a `question_items.id`; questions are **first-class rows**, not embedded, so scoring and standards-tagging work.
- **Question `type` enum (MVP):** `multiple_choice`, `multiple_select`, `numeric`, `short_response`. `choicesJson` / `correctAnswerJson` shapes are defined per type in Zod.
- **`assessment_responses.responseJson`:** typed per question type (`{selectedChoiceId}`, `{selectedChoiceIds[]}`, `{value, unit?}`, `{text}`).
- Rich text stored as a constrained subset (headings, bold/italic, lists, inline math) — **not** raw HTML — to avoid an XSS surface. Recommend a small, serializable JSON doc format; final pick made in the pre-build spike.

*Open question for review: is inline math (e.g., LaTeX/KaTeX) needed in the MVP, or is plain text + images enough for the first pilot content?*

### 14.3 Standards data source
`standards` is seeded from **structured public Common Core Math (CCSS-M) data**, imported — not hand-typed — as `{code, framework: "CCSS-M", subject, gradeBand, description}`. The seed covers only the grade bands and clusters the demo content actually touches (≈5 standards for the demo, expandable). Framework field exists so TEKS/other state frameworks can be added later without schema change.

*Open question for review: which grade band should the demo center on (drives which CCSS-M cluster we import)? Suggest one middle-grades band, e.g. Grade 6–7, for relatable demo math.*

### 14.4 CSV roster import format
**MVP ships a rigid, documented LRNEX template only** — not a flexible SIS mapper.
Columns: `role, email, firstName, lastName, gradeBand, schoolName, className`. Import is transactional (all-or-nothing per file), validates every row with Zod, reports row-level errors, and writes a `roster import` audit event. PowerSchool/Infinite Campus/OneRoster mappers are explicitly **out of scope** (§9) and deferred to the integration phase.

*Open question for review: confirm the column set — anything a pilot teacher would need on day one that's missing (e.g., a student ID column)?*

### 14.5 Numeric scoring + recommendation logic
- **Numeric answers** are scored with an explicit tolerance model, never naive float equality: `correctAnswerJson = { value, tolerance, unit? }`; correct iff `|response − value| ≤ tolerance`. Default tolerance `0` for integers, author-set for decimals. Handles the `0.1 + 0.2 ≠ 0.3` class of bugs and lets authors allow rounding.
- **`multiple_select`** scored all-or-nothing in MVP (exact set match); partial credit deferred.
- **Recommendation logic (basic):** after an attempt, "next step" = the lowest-mastery standard among the learner's active assignments that has available unattempted/retry content; ties broken by due date. Pure rules, no AI. Surfaced on the learner feedback screen and the teacher intervention queue.

*Open question for review: for numeric, do you want author-defined tolerance per item (flexible, more authoring effort) or a single global rule (simpler)? Proposed: per-item with a sane default.*

---

## 15. Pre-Build Gate (process — read before approving)

The 30-day clock should **not** start at first commit. It starts after:

1. **This document is approved.**
2. A **2-day pre-build spike** resolves anything still open in §14 (final rich-text format, the CCSS-M import file, the demo grade band) and stands up the skeleton (repo, Prisma init, Supabase project, CI, empty module folders).

Entering the build with §14 unresolved is the single biggest schedule risk. Resolve first, then run the clock. If §14 is entered as-is, expect a ~1-week loss around build-day 10.

---

## 16. Acceptance Criteria (unchanged from v0.2)

- Learner can log in, see profile, see assignments, complete an assignment, and receive basic feedback.
- Teacher can log in, see roster, create assignment, view progress, review short responses, and see intervention flags.
- Admin can log in, see tenant reporting, manage users at a basic level, view audit logs, and manage feature flags.
- Every protected page redirects unauthenticated users.
- A learner cannot access teacher/admin routes.
- A teacher cannot access another tenant's data.
- A `school_admin` cannot access `platform_admin`-only controls.
- Audit events are created for sensitive writes.
- The app runs locally from documented setup steps.

**Demo data:** one tenant "LRNEX Demo District"; one school; two teachers; twenty learners; two classes; five standards; two units; four lessons; objective + short-response items; assignments and attempts with mixed mastery.

---

## 17. Known Limitations (state plainly, always)

- Not production-ready; not legally certified; not a completed compliance package.
- Student-facing generative AI is intentionally absent (gateway stub only).
- CSV import supports the LRNEX template only.
- Standards seed covers the demo's grade band, not a full framework.
- No SSO/LTI/OneRoster/SIS in MVP (placeholders only).
- Accessibility is designed-in but not audited; security is designed-in but not pen-tested.

---

## 18. Notes

Accurate for a build window starting on approval. After the 30-day window, treat as a snapshot, not a live spec — update only after piloting, legal review, or major architectural change. **This is a product and engineering specification, not a compliance certification, legal opinion, or procurement checklist.**
