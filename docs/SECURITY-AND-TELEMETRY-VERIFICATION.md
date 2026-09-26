# D2D Security and Telemetry Verification

**Date:** 2026-09-26
**Isolated project:** `D2D Security Test` (`vofgsmnzwabcsgdyapzs`)
**Cost:** $0/month

## 1. Isolated migration replay

The checked-in baseline, deterministic seed, hardening, telemetry, release-fix, and teacher-policy migrations were replayed against the isolated project. The first replay exposed a real source-order gap: the baseline reconstruction needed the original `app.redeem_access_code` function before the release wrapper could be created. That dependency was repaired explicitly rather than bypassed.

The replay also exposed five RLS-enabled tables without explicit policies and client-visible SECURITY DEFINER RPC warnings. Explicit policies were added for accommodation profiles, audit events, lesson progress, memberships, and access codes. Rate-limit/redemption RPC privileges are now explicitly revoked from `public`, `anon`, and `authenticated`, with execution reserved for `service_role`.

Supabase security advisors after remediation: **0 lints**.

## 2. Authenticated-role RLS verification

Because the dashboard login was unavailable and anonymous Auth was disabled in the isolated project, tests used PostgreSQL’s real `authenticated` role with synthetic JWT subject claims via the SQL test harness. This exercises the RLS role and policy predicates without creating real accounts.

| Test principal | Expected result | Observed |
|---|---|---|
| Instructor in D2D program | 1 program, 1 lesson, 4 answer keys, 1 scholar, 1 judgment | Passed |
| Instructor | No access-code rows | Passed: 0 |
| Non-member | No program, lesson, or answer-key visibility | Passed: all 0 |
| Enrolled scholar | 2 assessments, 4 items, 1 scholar; no answer keys or access codes | Passed |
| Cross-program isolation | Other program hidden from D2D instructor | Passed after removing an intentionally malformed synthetic membership |

## 3. Concurrent redemption test

A temporary `anon` grant was applied **only** to the isolated test project and revoked immediately after the test. Two invalid redemption calls were issued concurrently against the atomic wrapper:

- Concurrent request 1: `invalid_or_expired_code`
- Concurrent request 2: `invalid_or_expired_code`
- Third request: still allowed and recorded the third failure
- Fourth request: `too_many_attempts`, `retry_after_seconds = 900`

The first run exposed an actual production defect: `retry_after_seconds` was ambiguous inside the PL/pgSQL wrapper. The production and isolated functions were patched to qualify the result alias (`rl.retry_after_seconds`), then the race was rerun successfully.

## 4. Real-device telemetry spike

A dedicated route is available at `/telemetry-spike`. It records synthetic, pseudonymous events in local storage and attempts delivery through the same telemetry queue path. It provides:

- Visibility/focus/online lifecycle events.
- Item dwell-boundary capture.
- Answer selection and revision numbering.
- Heartbeat events.
- Queue count and delivery state.
- JSON export for comparison with the server-side event stream.

### Device matrix

Run the same protocol on:

1. Cheap Android phone, Chrome, school Wi-Fi.
2. iPad, Safari, school Wi-Fi.
3. Android with Wi-Fi interrupted for 60–120 seconds.
4. iPad with Safari backgrounded and restored.
5. Both devices with screen lock during an active item.

### Protocol

1. Open `/telemetry-spike`; export the initial log.
2. Select an answer; change it twice; export the log.
3. Wait at least 20 seconds; record the dwell boundary.
4. Switch apps for 30 seconds; return; export.
5. Lock the screen for 30 seconds; unlock; export.
6. Toggle airplane mode or leave Wi-Fi for 60–120 seconds; interact once; restore network.
7. Close/reopen the browser tab and export the same session log.
8. Compare event sequence, client timestamps, monotonic times, revision numbers, and queued/delivered status.

### Acceptance gates

- No duplicate `event_id` values after retries.
- Answer revisions remain ordered and immutable.
- Dwell intervals never cross a hidden/blurred interval without an explicit boundary.
- Client timestamps and server receipt timestamps are both present.
- Offline events remain queued and are not silently lost after reload.
- A screen-lock/background transition produces a visible lifecycle boundary.

**Important:** this harness validates browser/runtime behavior; it does not substitute for the physical-device run. No timing-based signal should enter a confidence report until this matrix passes and differential-impact review is complete.
