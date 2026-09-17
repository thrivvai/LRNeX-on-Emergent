# Provisioning Checklist — D2D Pilot (shared foundation)

**Version:** 0.1
**Status:** Ready to execute — account/service setup before scaffolding
**Region (everywhere selectable):** **US East — `us-east-1`**
**Companion to:** `docs/HOSTING.md`, `docs/SECURITY-BASELINE.md`, `docs/SUBPROCESSORS.md`
**Owner:** D2D / repo admin (these steps need account access I don't have)

> This is the human hand-off list: create the accounts, projects, and settings below, capture the keys into the right places, and the scaffold can then run against real services. **Do the steps roughly in order** — a few depend on earlier ones (Resend domain → Supabase SMTP; Turnstile keys → Supabase Auth).

---

## Ground rules (read first)

1. **Never paste secret values into chat.** Secrets go into **Vercel environment variables** and **GitHub Actions secrets** (or a secrets manager) — not to me and not into the repo. I only need to know *choices* (region, project names), never the keys themselves.
2. **US region everywhere:** `us-east-1` for Supabase, Vercel functions, and Upstash. It's the answer to "where is student data stored?"
3. **Separate environments:** stand up **dev / staging / prod** as separate Supabase projects and Vercel environments, so **real student data never lands in a preview/dev deploy.** For the pilot you can start with **prod + preview**; add staging when needed.
4. **`NEXT_PUBLIC_` = shipped to the browser.** Only truly public values (Supabase URL, anon key, Turnstile *site* key) get that prefix. Everything else is server-only.
5. Sign the **DPA** with each vendor as you create the account (tracked in `docs/SUBPROCESSORS.md`).

---

## 1. GitHub — code, CI, and security settings

The repo (`thrivvai/lrnex-on-emergent`) already exists. Turn on:

- [ ] **Secret scanning + Push protection** — Settings → Code security and analysis → enable both. (Blocks commits that contain secrets.)
- [ ] **Dependabot** — enable *alerts*, *security updates*, and *version updates*. (A `dependabot.yml` gets added at scaffold time.)
- [ ] **Branch protection on `main`** — require a PR before merge; require status checks to pass once CI exists; no force-push.
- [ ] **Actions secrets** — add the server-only keys captured below as **repository (or environment) secrets** for CI/deploys (names in §7).
- [ ] *(Optional)* **GitHub Environments** `production` / `preview` to scope secrets and add deploy approvals.

*No region applies to GitHub.*

---

## 2. Supabase — Postgres (system of record) + Auth + Storage

- [ ] Create an **organization** and a **project**: name `d2d-pilot-prod`. **Region: East US (`us-east-1`).** (Add `d2d-pilot-dev` later for a separate dev DB.)
- [ ] **Capture** (from Project Settings → API):
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL` *(public)*
  - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(public — safe because RLS is the gate)*
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(**secret, server-only** — bypasses RLS)*
- [ ] **Database connection** (Settings → Database) for Prisma:
  - Pooled connection string → `DATABASE_URL` *(secret)*
  - Direct connection string → `DIRECT_URL` *(secret, used for migrations)*
- [ ] **Auth settings:** enable email confirmations; set a password policy; (after §4) point **custom SMTP at Resend**; (after §5) enable **Turnstile CAPTCHA** on auth.
- [ ] **Storage:** create **private** buckets — `curriculum`, `exports`, `activities` (for the Money Hub HTML + uploads). No public buckets.
- [ ] **RLS** is enabled per-table in the first migration (not a dashboard step) — see `SECURITY-BASELINE.md` control 4.
- [ ] Sign the Supabase **DPA**.

---

## 3. Vercel — app hosting

- [ ] Create a **team** and a **project**; **link the GitHub repo**.
- [ ] Set the **Functions region to `us-east-1` (iad1)**.
- [ ] Add **Environment Variables** (Production + Preview + Development) — the full set in §7, each marked public vs secret. Give Preview/Development their **own** (dev) Supabase values so previews never touch prod data.
- [ ] Confirm **HTTPS** and **HSTS** (HSTS header is set in app config at scaffold time).
- [ ] Sign the Vercel **DPA**.

---

## 4. Resend — transactional email

- [ ] Create an account (**US**).
- [ ] **Verify a sending domain** — recommend a subdomain like `mail.d2dmoneyhub.com`. Add the **SPF, DKIM, and DMARC** DNS records Resend provides. *(This is the DNS you can do now regardless of the pending Cloudflare-DNS decision — it's email records, not the whole domain move.)*
- [ ] **Capture** the API key → `RESEND_API_KEY` *(secret)*; set `EMAIL_FROM` (e.g., `no-reply@mail.d2dmoneyhub.com`).
- [ ] **Wire Supabase Auth → Resend SMTP** so password-reset/invite emails are deliverability-grade (Supabase Auth → SMTP settings).
- [ ] Sign the Resend **DPA**.

---

## 5. Cloudflare Turnstile — bot protection

- [ ] Create a Cloudflare account; add a **Turnstile site** (you do *not* need to move DNS to Cloudflare for this — that decision stays pending with Whitney).
- [ ] **Capture:**
  - Site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` *(public)*
  - Secret key → `TURNSTILE_SECRET_KEY` *(secret)*
- [ ] It will guard **login, signup, and password reset** — verified server-side and wired into Supabase Auth CAPTCHA (§2).
- [ ] Sign the Cloudflare **DPA**.

---

## 6. Upstash — Redis for rate limiting

- [ ] Create an account; create a **Redis database**. **Region: `us-east-1`.**
- [ ] **Capture** (REST API):
  - REST URL → `UPSTASH_REDIS_REST_URL` *(secret)*
  - REST token → `UPSTASH_REDIS_REST_TOKEN` *(secret)*
- [ ] Used by `@upstash/ratelimit` on custom auth-sensitive endpoints (Supabase covers its own auth rate limits).
- [ ] Sign the Upstash **DPA**.

---

## 7. Environment variable master list

These become `.env.example` (placeholders, committed) and real values in Vercel + GitHub secrets at scaffold time. **Public** = may ship to the browser; **Secret** = server-only, never `NEXT_PUBLIC_`, never committed.

| Variable | Service | Class |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | **Secret** |
| `DATABASE_URL` | Supabase (pooled) | **Secret** |
| `DIRECT_URL` | Supabase (direct, migrations) | **Secret** |
| `RESEND_API_KEY` | Resend | **Secret** |
| `EMAIL_FROM` | Resend | Config |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile | Public |
| `TURNSTILE_SECRET_KEY` | Turnstile | **Secret** |
| `UPSTASH_REDIS_REST_URL` | Upstash | **Secret** |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | **Secret** |
| `NEXT_PUBLIC_APP_URL` | App | Config |

*(Sentry `SENTRY_DSN` is in the security baseline for error monitoring but isn't one of the six services in scope here — add it when you're ready; it needs PII scrubbing before production, per `SUBPROCESSORS.md`.)*

---

## 8. Definition of done

Provisioning is complete when:
- [ ] All six services exist, pinned to `us-east-1` where applicable.
- [ ] Every variable in §7 is set in **Vercel** (prod + preview) and, where CI needs it, in **GitHub Actions secrets** — with dev/preview using separate Supabase values.
- [ ] Resend sending domain is verified (SPF/DKIM/DMARC green) and Supabase Auth sends through it.
- [ ] Turnstile keys are in place; Upstash DB is reachable.
- [ ] GitHub secret scanning, push protection, Dependabot, and `main` branch protection are on.
- [ ] A DPA is signed (or in progress) with each vendor.

**Tell me when this is done** (just "provisioning done" — *not* the secret values). Then the scaffold runs against real services, starting from the day-0 security order in `SECURITY-BASELINE.md`.

---

## Notes

A setup checklist, not a security or compliance certification. Regions, DPAs, and environment separation here are the technical basis the sub-processor register and district DPAs are written from. Update if a service or region choice changes.
