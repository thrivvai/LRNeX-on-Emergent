# Security Baseline — LRNEX & D2D

**Version:** 0.1
**Status:** Binding baseline for all scaffolding and build work
**Applies to:** LRNEX MVP **and** D2D Student Growth Platform (same stack; both handle student data on minors)
**Stack:** Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL · Supabase Auth + Storage · Zod · Vercel

> **Read before writing the first line of scaffold.** These are not post-hoc hardening tasks — several must be true on commit zero (secrets hygiene, RLS-on, server-side auth). Both products serve minors, so FERPA/COPPA make every control here mandatory, not optional. Nothing here waits for "later."

---

## How to use this

Each control below preserves the requester's own phrasing as its name, then gives:
- **Do** — the concrete requirement in this stack.
- **Done when** — the acceptance check a reviewer (or CI) can verify.

A control is not "done" because the code exists — it's done when the **Done when** line is verifiable. Tests for auth guards, tenant/record isolation, and input validation are required (per both PRDs), not optional.

Two rules override convenience everywhere below:
1. **Never trust the client.** Every security decision (identity, role, tenant/program scope, ownership, allowed fields) is made and enforced **server-side**. Client checks are UX only.
2. **Defense in depth.** App-layer authorization **and** database RLS both enforce access. Either alone is insufficient; a bug in one is caught by the other.

---

## A. Secrets & keys

### 1. Hide API key
- **Do:** All secrets live in server-only env vars. **Never** prefix a secret with `NEXT_PUBLIC_`. The Supabase `service_role` key, any provider keys, and DB URLs are read only in server code (route handlers, server actions, server components) — never imported into a client component. AI provider keys are not required for the core app to run (per LRNEX §Model Strategy).
- **Done when:** grep of the client bundle shows no secret; no secret is referenced under a `"use client"` boundary; `service_role` appears only in server modules.

### 2. Purge Git secret
- **Do:** `.gitignore` covers `.env`, `.env.*` (keep `.env.example` with placeholder values only). No real secret is ever committed. If one lands in history, **rotate it immediately** and scrub history (`git filter-repo`/BFG) — rotation first, because a pushed secret is compromised. Enable secret scanning + push protection on the repo.
- **Done when:** `.env*` is ignored, `.env.example` has only placeholders, secret-scanning is on, and no secret exists in tracked files or history.

### 3. Use public database key
- **Do:** The browser client is created **only** with the Supabase URL + **anon/publishable** key. That key is safe to ship *because* RLS (control 4) is the real gate. The `service_role` key bypasses RLS and is server-only, used sparingly and never in anything reachable by the client.
- **Done when:** client Supabase init uses the anon key only; every `service_role` usage is server-side and justified.

---

## B. Data protection & access

### 4. Enable RLS
- **Do:** Row-Level Security is **ON for every table**, default-deny. Policies scope every row by `tenantId` (LRNEX) / `programId` (D2D) **and** the actor's role/persona relationship (own child / assigned cohort / assigned school / all). `platform_admin` / `super_admin` are the only cross-scope readers. RLS is written and tested as part of the migration that creates each table — not added afterward.
- **Done when:** no table has RLS disabled; a test proves a user of tenant/program A cannot read or write tenant/program B's rows via the anon client.

### 5. Encrypt sensitive data
- **Do:** TLS in transit everywhere (control 19); Postgres/Supabase encryption at rest. For the most sensitive fields — accommodations/IEP flags, and any PII beyond name/email — apply application-layer or `pgcrypto` field encryption with keys held in the secrets manager, not the DB. Data minimization first: don't store what the program doesn't need.
- **Done when:** sensitive fields are enumerated in the data map; each is either justified as low-sensitivity or encrypted; keys are not in the database.

### 6. Enforce server-side auth
- **Do:** Every protected route, server action, and API handler verifies the session **server-side** on each request. Middleware may refresh/gate sessions, but **authorization is re-checked in the handler** — never rely on middleware alone (it can be bypassed). Unauthenticated → redirect to `/login`.
- **Done when:** a test hitting a protected endpoint without a valid session is rejected server-side even if middleware is skipped.

### 7. Lock record access
- **Do:** Authorization lives in **one centralized module** (per both PRDs). Every tenant/program-owned query is scoped by `tenantId`/`programId` + role + relationship. No "get by id" without an ownership/scope check. RLS (control 4) backs it at the DB.
- **Done when:** every data-access path goes through the authz helper; a test proves a teacher/instructor cannot fetch a record outside their assigned scope; a learner/student cannot reach teacher/admin routes.

### 17. Trim API responses
- **Do:** Return only the fields the caller needs. Use explicit Prisma `select` projections / DTOs — never return whole rows by default. Never serialize password hashes, other users' data, internal flags, or another tenant's/program's fields. Errors don't leak stack traces or SQL to the client.
- **Done when:** responses are projected to named fields; a review confirms no sensitive/internal field is serialized to the client.

---

## C. Authentication & sessions

### 8. Block field tampering
- **Do:** No mass assignment. The server **never** accepts client-supplied `role`, `tier`, `tenantId`/`programId`, `isCorrect`, `score`, `masteryLevel`, reward points, or ownership fields. Zod schemas **whitelist** exactly the fields a client may send; privileged fields are derived server-side from the session and the record. Delete/core-function mutations are super-role only (D2D §3).
- **Done when:** each mutation has a Zod input schema listing only client-writable fields; a test proves posting `role: "super_admin"` (or a foreign `tenantId`) is ignored/rejected.

### 9. Secure session cookies
- **Do:** Session cookies are `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` where flows allow), signed, and short-lived with rotation/refresh. Supabase SSR handles most of this — verify the config rather than assume it. No session token in `localStorage`.
- **Done when:** cookie attributes are confirmed on the auth cookie; no auth token is stored in JS-readable storage.

### 10. Hash passwords
- **Do:** Passwords are hashed with a strong adaptive algorithm (Supabase Auth uses bcrypt; if any custom auth is added, use argon2id or bcrypt with a proper work factor). Plaintext or reversible storage is never acceptable. Enforce a minimum password policy.
- **Done when:** no plaintext password is ever stored or logged; hashing is delegated to Supabase Auth (or an approved algorithm).

### 11. Rate limit login
- **Do:** Throttle auth-sensitive endpoints — login, signup, password reset, magic-link — per IP **and** per account, with backoff/lockout on repeated failures. Use Supabase's built-in auth rate limits plus an edge limiter (e.g., Upstash) on custom endpoints.
- **Done when:** repeated failed logins are throttled; a test confirms lockout/backoff triggers.

### 12. Add bot protection
- **Do:** A CAPTCHA/challenge (Cloudflare Turnstile or hCaptcha — Supabase Auth supports both) guards signup, login, and password reset against automated abuse. *(Provider choice is an open item — Turnstile recommended.)*
- **Done when:** the challenge is enforced server-side on those endpoints; requests without a valid token are rejected.

---

## D. Input & output safety

### 13. Parameterize queries
- **Do:** Prisma parameterizes by default — keep it that way. **Never** build SQL by string concatenation; if raw SQL is unavoidable use the tagged `Prisma.sql` / `$queryRaw` (parameterized) form, never `$queryRawUnsafe` with interpolated input.
- **Done when:** no `$queryRawUnsafe`/concatenated SQL with user input exists; any raw SQL is parameterized.

### 14. Validate all input
- **Do:** **Every** mutation and route input is validated server-side with Zod before use — type, range, format, enum membership. Validation runs on the server even when the client already validated. Reject, don't coerce silently.
- **Done when:** each server action/route parses input through a Zod schema and rejects invalid payloads with a safe error.

### 15. Escape user content
- **Do:** Rely on React's default escaping. **No** `dangerouslySetInnerHTML` on user content without sanitization (DOMPurify). The LRNEX lesson `contentJson` / rich text is stored as a constrained JSON subset, **not** raw HTML (per LRNEX §14.2), and rendered through a safe renderer — no arbitrary HTML/script execution.
- **Done when:** no unsanitized HTML injection path exists; rich content renders through the constrained schema, not raw HTML.

### 16. Restrict field uploads
- **Do:** File uploads (curriculum files, exports, KB-library docs, future media) are validated for MIME type + extension allowlist + size cap; stored in Supabase Storage / object storage (never the app server) behind signed, expiring URLs; served with correct `Content-Type` and `Content-Disposition`. Filenames are sanitized; content scanning is a fast-follow.
- **Done when:** uploads outside the allowlist/size cap are rejected; files live in object storage with signed access; no user-controlled path/filename reaches the filesystem raw.

---

## E. Transport & platform

### 18. Add security headers
- **Do:** Set, via `next.config` `headers()` or middleware: `Content-Security-Policy` (lock script/style/connect sources; prefer nonces), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` / CSP `frame-ancestors 'none'`, and a restrictive `Permissions-Policy`.
- **Done when:** a header scan of a deployed route shows all of the above present and sane.

### 19. Force HTTPS
- **Do:** All traffic over HTTPS; HTTP redirects to HTTPS; `Strict-Transport-Security` with a meaningful `max-age` (+ `includeSubDomains`). Vercel provides TLS + redirect — confirm HSTS is set and no mixed content is served.
- **Done when:** HTTP requests redirect to HTTPS; HSTS is present; no mixed-content warnings.

---

## F. Supply chain

### 20. Scan dependencies
- **Do:** Dependency scanning runs in CI (`npm audit` gate + Dependabot or Snyk). Commit the lockfile; keep dependencies current; review transitive advisories. A high/critical advisory blocks merge until resolved or explicitly risk-accepted.
- **Done when:** CI runs a dependency scan on every PR; high/critical findings fail the build until addressed.

---

## Scaffold order (what must be true on day 0)

Apply these **before or with** the first feature code, not after:

1. `.gitignore` for `.env*`; `.env.example` with placeholders; secret scanning + push protection on (controls 1–3).
2. Supabase client wired with the **anon key**; `service_role` server-only (controls 1, 3).
3. Prisma schema + first migration ship with **RLS ON, default-deny** policies per table (control 4).
4. Centralized authz module + server-side session check stub before any protected route exists (controls 6, 7).
5. Zod at every mutation boundary from the first mutation (controls 8, 14).
6. `next.config` security headers + HTTPS/HSTS from the first deploy (controls 18, 19).
7. CI with typecheck, lint, tests, and dependency scan before the first feature PR (control 20).

Everything after is built on top of a surface that is already locked.

---

## CI gates (map to the PRD Security Gate)

A PR touching app code is not mergeable until: auth-guard tests pass · tenant/program isolation tests pass · input-validation present on new mutations · no `NEXT_PUBLIC_` secret · dependency scan clean of high/critical · security headers present. These are the technical rows of each PRD's Security Gate; this baseline is how they're satisfied.

---

## Open items (need a choice, not blocking the baseline)

- **Bot-protection provider** (control 12): Cloudflare Turnstile (recommended) vs hCaptcha.
- **Dependency scanner** (control 20): Dependabot (free, native) vs Snyk (richer).
- **Field-level encryption scope** (control 5): confirm which fields beyond accommodations warrant `pgcrypto`/app-layer encryption.
- **Rate-limit backend** (control 11): Supabase built-ins only vs adding Upstash for custom endpoints.

---

## Notes

This is a build-governing baseline, not a security certification. It implements the technical controls each PRD's Security and Compliance gates require; it does not replace the pen test, accessibility audit, DPA, or legal/FERPA review those gates also list. Update as controls are implemented or as the stack changes.
