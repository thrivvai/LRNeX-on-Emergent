# D2D Confidence Score Research Design

**Status:** Working specification for instructor review and telemetry validation  
**Product:** D2D Student Growth Platform  
**Date:** 2026-09-26  
**Decision owner:** Whitney, with instructor validation before research use

> This document defines hypotheses and an implementation sequence. It does not establish validated score weights. The first pilot should log the raw signals, expose the uncertainty, and tune only after comparing the outputs with teacher judgment.

## 1. Product truth

D2D's primary measure is **how a scholar works**, not the test score. Assessment correctness is supporting context. The confidence result should answer:

> **How secure and self-directed does this scholar's work appear on this task, given the behavioral evidence we can reliably observe?**

It should not answer:

- How intelligent the scholar is.
- How fast the scholar is compared with other scholars.
- Whether a scholar is compliant or attentive in a general sense.
- Whether a scholar's disability, language background, or accommodation makes their work less valuable.

The output should remain an ordinal research signal:

- **Shaky** — behavior suggests unresolved uncertainty, but should trigger investigation rather than a judgment.
- **Building** — behavior shows partial security or mixed signals.
- **Secure** — multiple signals converge on self-directed, stable work.
- **Insufficient signal** — data is sparse, unreliable, interrupted, or unsafe to interpret.

The current `emerging / building / secure` labels and `behavior-band-0` thresholds are implementation placeholders. They should not be presented as validated confidence categories.

---

## 2. Signal dictionary

### 2.1 Primary behavioral signals

| Signal | What it measures | Alternative explanations | Evidence needed before weighting |
|---|---|---|---|
| **Active work persistence** | Whether the scholar continues meaningful work through the assessment/lesson rather than abandoning it | Device sharing, connectivity loss, reading load, fatigue, external interruption, inaccessible content | Reliable active/away intervals across Android, iPad, backgrounding, and screen lock; compare with completion and teacher judgment |
| **Answer reconsideration** | Whether and how a scholar revises an initial response | Productive reflection, accidental tap, guessing, language correction, motor error, interface confusion | Every revision captured with item ID, prior value, new value, timestamp, and reason/context; compare change direction with final correctness and teacher judgment |
| **Repair behavior** | Whether a revision moves from incorrect to correct, correct to incorrect, or one plausible response to another | Answer key ambiguity, poorly designed distractors, new evidence from the lesson, random switching | Valid answer keys, item-level difficulty, repeated items or parallel forms, and revision sequences from enough scholars |
| **Revisits** | Whether the scholar returns to an earlier item, lesson step, or evidence source | Confusion, navigation problems, rereading preference, accessibility use, accidental navigation | Distinguish deliberate revisit from browser back/forward and re-render; log item/step entry and exit; compare with eventual response quality |
| **Evidence-seeking** | Whether the scholar returns to relevant content before answering or changing an answer | Content layout, required navigation, inability to remember, screen-reader behavior | Item/lesson linkage, content exposure events, support metadata, and instructor review of representative sessions |
| **Pacing stability** | Whether work proceeds with a stable rhythm relative to the scholar's own baseline | Reading speed, device performance, network delay, anxiety, unfamiliar interface | Client monotonic timestamps, server receipt timestamps, active-time correction, per-scholar normalization, and device/network quality flags |
| **Completion/persistence** | Whether the scholar starts, resumes, and completes the intended learning sequence | Access problems, session expiry, schedule constraints, transportation/home interruptions | Resume events, delivery status, session continuity, and staff-coded interruption reasons |
| **Cross-item consistency** | Whether behavior and response patterns are reasonably stable across items measuring the same objective | Item wording, cultural familiarity, language demands, fatigue, content misalignment | Objective tags, parallel items, item-level DIF review, and minimum item counts |
| **Transfer behavior** | Whether the scholar carries the lesson process into the posttest or new scenario | Posttest similarity, memorization, scaffolding differences, instruction quality | Pre/post item mapping, scenario-level coding, and teacher judgment of transfer examples |

### 2.2 Supporting score signals

| Signal | What it measures | Alternative explanations | Evidence needed before weighting |
|---|---|---|---|
| **First-attempt correctness** | Whether the first submitted answer was correct without revision | Prior exposure, guessing, item simplicity, reading comprehension | Enough parallel items and a distinction between first-attempt correctness and final correctness |
| **Final correctness** | Whether the final answer matches the validated answer key | Ambiguous key, partial understanding, culturally or linguistically loaded item | Instructor-reviewed answer keys, item difficulty, objective alignment, and accommodation review |
| **Correctness change** | Difference between pretest and posttest performance | Instruction exposure, test familiarity, regression to the mean, item mismatch | Matched standards/objectives, parallel forms, minimum exposure, and retained attempt history |
| **Attempt history** | Number and pattern of attempts | Motivation, technical problems, retake policy, scheduling | Explicit attempt reason and session-quality data; never treat more attempts as automatically weaker |

### 2.3 Context and safety variables

| Variable | What it measures | Alternative explanations | Evidence needed before weighting |
|---|---|---|---|
| **Accommodation profile** | Conditions under which the scholar is working and permitted supports | Incomplete profile, changed support plan, staff entry error | Instructor/IEP/EL review, active dates, and policy-specific scoring rules |
| **Support level** | Whether work was independent, prompted, or supported | Support may be the intended instructional design, not lower confidence | Standardized support taxonomy and observation of how support is delivered |
| **Away interval** | Time likely outside active work | Screen lock may be missed, tab may remain focused while scholar is away, shared device | Cross-device validation and explicit uncertainty when event delivery is incomplete |
| **Telemetry quality** | Whether the event stream is complete and chronologically coherent | Offline buffering, clock skew, duplicate events, browser throttling | Event IDs, sequence checks, delivery attempts, client/server timestamps, and QA logs |
| **Teacher judgment** | Whether the result matches an instructor's professional read | Teacher familiarity, halo effects, inconsistent rubric use | One-click judgment plus optional structured reason, inter-rater checks, and calibration examples |

### 2.4 Signals that must not be interpreted alone

Do not independently label a scholar Shaky based on:

- Long dwell time.
- Short dwell time.
- Number of answer changes.
- Number of revisits.
- Blur/focus count.
- Device type.
- Raw elapsed time.
- Number of attempts.

These are **signals**, not conclusions. A confidence band requires convergence across multiple signals and sufficient data quality.

---

## 3. Provisional formula

### 3.1 Notation

For scholar `s`, administration `a`, and item/objective set `I`:

- `K` = correctness context, normalized to `0–1`.
- `P` = active persistence component.
- `R` = reconsideration/repair component.
- `V` = revisit/evidence-seeking component.
- `T` = pacing stability component.
- `C` = completion/transfer component.
- `Q` = telemetry quality multiplier.
- `A` = accommodation/safety rule.
- `M` = minimum-data gate.

Each behavioral component is computed only from **validated, item-linked, active-time-corrected events** and normalized primarily against the scholar's own baseline or the item's expected range—not against a universal speed norm.

### 3.2 First research version

Start with a behavior-primary internal score:

```text
BehaviorIndex =
    0.20 * P +
    0.20 * R +
    0.15 * V +
    0.15 * T +
    0.15 * C +
    0.15 * Consistency
```

Then combine it with correctness as supporting context:

```text
ConfidenceIndex =
    Q * (0.70 * BehaviorIndex + 0.20 * K + 0.10 * Trajectory)
```

Where:

- `BehaviorIndex` carries the majority of the signal.
- `K` is final correctness, not the whole confidence score.
- `Trajectory` captures change across comparable administrations or objectives.
- `Q` reduces confidence when the event stream is incomplete or contaminated by away time.
- Teacher judgment is **not silently folded into the live score**; it is the validation target used to tune the formula.

If `Trajectory` is not yet available, redistribute its 10% proportionally across the behavioral components rather than inventing a trajectory value.

### 3.3 Recommended initial component definitions

```text
P = active meaningful work completed / expected meaningful work

R = weighted repair quality:
    productive revision > stable first response > unresolved switching

V = relevant revisits and evidence returns,
    capped so repeated navigation cannot inflate confidence

T = stable, scholar-normalized pacing after away intervals are removed

C = completion plus transfer behavior,
    not mere page completion

Consistency = agreement across parallel items measuring the same objective

K = final correctness across validated scored items

Trajectory = change from the scholar's own prior comparable performance
```

These are hypotheses. The implementation should log each numerator, denominator, cap, and missingness reason so the team can inspect how a result was formed.

### 3.4 Abstention and insufficient-signal rules

Return **Insufficient signal** rather than a band when any of the following is true:

1. Fewer than the configured minimum number of valid scored items.
2. Fewer than three independent behavioral components are available.
3. Active/away reconstruction is not reliable for the administration.
4. Event ordering is invalid, duplicate, or substantially missing.
5. An active accommodation has `score_policy = 'abstain'`.
6. The assessment or lesson has not been reviewed for accessibility and item validity.
7. The confidence interval around the index crosses multiple bands.
8. A teacher judgment or research flag marks the result as unsafe to interpret.

A high correctness score with weak behavioral evidence should remain **Insufficient signal** or **Building**, not be promoted to Secure.

### 3.5 Weight-tuning plan

Do not tune weights by intuition alone. For each administration:

1. Preserve raw events and derived features.
2. Produce the provisional score with a `model_version`.
3. Collect one instructor judgment: matches / partly matches / does not match / insufficient context.
4. Compare the score against final correctness, later comparable performance, and teacher judgment.
5. Review false positives and false negatives by accommodation, language, device, and objective.
6. Change one configuration version at a time.
7. Keep prior configurations so reports remain reproducible.

The first useful output is not the most accurate-looking number. It is a score whose failures are inspectable.

---

## 4. Instrumentation repair plan

The current UI logs assessment start/submit and lesson progress, but it does not yet reliably log answer revisions, item entry/exit, or validated active intervals. Fix instrumentation before using the new formula.

### Step 1 — Define an append-only event contract

Add versioned event types:

```text
assessment_item_entered
assessment_item_exited
answer_selected
answer_changed
answer_finalized
assessment_navigation
visibility_hidden
visibility_visible
window_blur
window_focus
page_hidden
page_visible
page_freeze
page_resume
idle_started
idle_ended
heartbeat
telemetry_flush_succeeded
telemetry_flush_failed
```

Every event should include:

- `event_id`
- `event_seq`
- `session_id`
- `assessment_id` / `attempt_id`
- `item_id` where applicable
- `scene_id` where applicable
- `occurred_at_client`
- `client_monotonic_ms`
- `server_received_at`
- `app_version`
- `event_version`
- `payload`

### Step 2 — Log answer revisions as immutable records

On every answer change:

1. Read the previous answer from local state.
2. Write an `answer_changed` event with `previous_value`, `next_value`, and `revision_number`.
3. Insert an immutable `assessment_responses` revision.
4. Mark only the final response `is_final = true` at submission.
5. Never overwrite the only record of the prior answer.
6. Use a client-generated idempotency key so retries cannot duplicate a revision.

The scorer should use the latest final response for correctness while retaining every revision for research.

### Step 3 — Add item-level dwell and revisit events

When an item becomes visible/active:

- Emit `assessment_item_entered`.
- Store item ID and entry timestamp.
- Close the previous item with `assessment_item_exited`.

When a scholar returns to an earlier item:

- Emit `assessment_navigation` with `from_item_id`, `to_item_id`, and `revisit = true`.
- Do not infer revisits only from answer timestamps.

Dwell should be derived from entry/exit pairs after subtracting away intervals. Store raw boundaries, not only a computed duration.

### Step 4 — Make visibility telemetry robust

Use all relevant browser lifecycle signals:

- `document.visibilitychange`
- `window.blur` / `window.focus`
- `pagehide` / `pageshow`
- `freeze` / `resume` where supported
- periodic heartbeat while active

Rules:

- Close an active interval on hidden, blur, pagehide, or freeze.
- Reopen only after visible/focus/pageshow/resume plus a fresh heartbeat.
- Deduplicate events caused by multiple browser signals for the same transition.
- Treat screen lock and OS suspension as an **unknown gap**, not automatically as cognitive idle.
- Use `navigator.sendBeacon` or an offline queue for terminal events.
- Retry queued events after reconnection with the original client timestamp and a delivery attempt count.

### Step 5 — Add telemetry quality checks

At ingestion/analysis time, flag:

- Missing sequence numbers.
- Duplicate event IDs.
- Client timestamps moving backward.
- Excessive client/server clock skew.
- Long gaps without an explicit away event.
- Events arriving after submission.
- Events missing attempt/item/session linkage.
- Mobile browser backgrounding without a closing event.

A flagged administration should receive a lower `Q` or Insufficient signal; it should not silently become a low-confidence scholar result.

### Step 6 — Test the real conditions before scoring

Run a telemetry spike with scripted test cases on:

- Cheap Android phone.
- iPad Safari.
- School Wi-Fi with temporary disconnect.
- App backgrounding.
- Screen lock and unlock.
- Browser tab switch.
- Orientation change.
- Reload and resume.
- Offline response followed by reconnection.
- Multiple rapid answer changes.

Acceptance criterion: the reconstructed event timeline must correctly distinguish **active work**, **away/unknown time**, **answer revision**, and **revisit** for every test case. If it cannot, do not use timing-based signals in the confidence result.

---

## 5. Hardened pretest design

The current two-item pretest is too short and too easy to support the research questions. It is a demo, not yet an instrument.

### Proposed first pilot pretest

Use **12–16 items** for the first content-aligned pilot, with:

- 3–4 items per priority objective.
- At least two difficulty levels per objective.
- One or two scenario-based items requiring interpretation rather than recognition.
- Plausible distractors representing common reasoning patterns.
- One transfer item that changes the surface context.
- Clear item-level standards/objective tags.
- A small number of constructed or explanation prompts only if the scoring plan is ready.
- No countdown timer.
- No artificial “gotcha” difficulty.
- Accessibility- and language-reviewed wording.

### Behavioral coverage needed

The pretest should make it possible to observe:

- First response.
- Answer changes.
- Time before first response.
- Return to earlier items.
- Item-level dwell after away time is removed.
- Completion and resume behavior.
- Consistency across items measuring the same objective.
- Confidence self-report, if Whitney agrees to add a lightweight “How sure are you?” measure.

### Assessment quality gates

Before using the pretest in the pilot:

1. Instructor reviews every item and distractor.
2. Standards/objective mapping is recorded.
3. Accommodations and language supports are reviewed.
4. A small usability tryout checks whether students understand the interface.
5. A telemetry QA run confirms item-level logs.
6. A pilot version is frozen and assigned a version identifier.
7. Every revision creates a new assessment version rather than changing historical meaning.

### Data we need from Whitney or the program team

Please provide, when available:

- Target grade band and age range.
- Maryland Personal Financial Literacy standards or adopted framework version.
- MCCR Math standards relevant to the lesson.
- MCAP blueprint or tested domains if math alignment is in scope for this pilot.
- Which objectives the first lesson is expected to change.
- Expected student supports for IEP, EL, and neurodivergent scholars.
- One instructor willing to review items and later provide judgments.
- Whitney's plain-language definition of what “confidence” should mean in a scholar's work.

We can start from the supplied FAST and financial-literacy materials, but state standards and the assessment blueprint are needed before making claims about alignment or readiness.

---

## 6. Lesson expansion roadmap

Do not add a large curriculum library yet. Add a small, instrumented sequence that creates repeated opportunities to observe behavior.

### Recommended first sequence

1. **The Money You Pay** — credit-card statement, balance, minimum payment, APR.
2. **Banking and the Financial Field Trip** — account choice, questions to ask, evidence-seeking.
3. **Credit Card Interest** — compare options, explain tradeoffs, revisit assumptions.
4. **Investors Club / decision activity** — choose among scenarios and observe transfer/persistence.

Each lesson should follow FAST's instructional arc where applicable:

```text
Notice → Try → Carry
```

Each lesson should include:

- 3–5 structured steps.
- At least one decision point.
- At least one revisit-worthy evidence panel.
- One reflection or carry-forward prompt.
- A mapped pre/post objective set.
- A teacher note field for observations.
- Explicit telemetry scenes and item IDs.

The goal is not more content for its own sake. The goal is enough meaningful work to observe the behavioral signals repeatedly and safely.

---

## 7. UI backlog, after research instrumentation

The primitive UI is a real product problem, but it should follow the signal repair so the dashboard does not make weak data look authoritative.

### Student experience — P0/P1

**P0: student home shell**

- Assigned learning path.
- Pretest / lesson / posttest status.
- Resume button.
- Clear progress without ranking.
- “What to do next” card.
- Support and accommodation-aware language.

**P1: lesson library and lesson detail**

- Assigned lessons first.
- Lesson cards with topic, estimated active work, and completion state.
- FAST phase labels.
- Resume from last confirmed step.
- Reflection history.
- Digital Dollars/rewards only if the reward rules are defined.

**P1: student evidence feedback**

- Show effort/process language, not a deficit label.
- If a result is Insufficient signal, explain that the system needs more reliable evidence.
- Do not show raw behavioral surveillance metrics to students until tested for harm and usefulness.

### Teacher experience — P0/P1

**P0: usable roster dashboard**

- Cohort filter.
- Scholar cards with latest confidence band, supporting score, data-quality state, and last activity.
- Clear “why this result?” drill-down.
- Teacher one-click judgment with optional reason.
- Accommodation-aware display and abstention explanation.

**P1: notes and instructional context**

- Private teacher notes by scholar, lesson, and attempt.
- Structured note codes plus optional free text.
- Notes are timestamped and audited.
- Notes must not silently become score inputs.

**P1: lesson/content management**

- Assigned lesson list.
- Lesson version and objective mapping.
- Preview student experience.
- Publish/archive workflow with version preservation.
- Assessment item review and answer-key review.

**P1: research view**

- Signal timeline.
- Active/away/unknown intervals.
- Answer revision sequence.
- Revisit map.
- Teacher judgment comparison.
- Exportable raw and derived data with program scope.

### Do not build yet

Do not spend the next sprint on a polished analytics wall, complex recommendations, or a large lesson catalog. Those features would make the product look more complete without answering whether the core behavioral evidence is trustworthy.

---

## 8. Immediate execution sequence

### Sprint 1 — Measurement integrity

1. Freeze the signal dictionary and event contract.
2. Implement answer revision and item entry/exit logging.
3. Implement robust visibility/away handling and offline retry.
4. Build the telemetry QA harness for Android, iPad, backgrounding, and lock.
5. Add 12–16 reviewed pretest items with objective tags.
6. Add at least one teacher judgment workflow for every pilot result.

### Sprint 2 — Research-ready journey

1. Add two additional FAST-aligned lessons.
2. Add pre/post parallel-item mapping.
3. Compute raw signal features without publishing a new band.
4. Review signal distributions and missingness.
5. Compare provisional outputs with instructor judgments.
6. Decide whether the provisional formula is useful enough for a visible research band.

### Sprint 3 — Product surface

1. Replace the student landing-after-login with a real assigned-work dashboard.
2. Add teacher roster, notes, and result drill-down.
3. Add lesson library and versioned assignment workflow.
4. Make data-quality and abstention states first-class UI states.

---

## 9. Decisions required from Whitney

1. In one sentence, what should **Secure**, **Building**, and **Shaky** mean when Whitney looks at a scholar's work?
2. Is confidence primarily about **security in the current response**, **independence of process**, **willingness to persist**, or a combination?
3. Should a scholar who is correct after productive revision be considered more or less confident than a scholar who is correct immediately?
4. Which supports should be context-only, and which should force abstention?
5. Which first 2–3 standards/objectives are most important for the pilot?
6. Which instructor will review the pretest, lessons, and weekly judgments?

Until these decisions are answered and telemetry is validated, keep the score internal, versioned, and explicitly labeled as a research prototype.
