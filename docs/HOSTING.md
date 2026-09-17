# Hosting & Infrastructure Decision — LRNEX & D2D

**Version:** 0.1
**Status:** Recommended decision — for confirmation
**Applies to:** LRNEX MVP and D2D Student Growth Platform
**Companion to:** `docs/PRD.md`, `docs/D2D-PRD.md`, `docs/SECURITY-BASELINE.md`

---

## 1. The decision

**Pilot / MVP:** host the Next.js app on **Vercel**, with **Supabase** for Postgres, Auth, and Storage.
**Production (district-scale):** keep a clean path to **AWS** (App Runner or ECS Fargate · RDS Postgres · S3 · CloudFront · WAF · Secrets Manager · CloudWatch).

This matches both PRDs. Do **not** build AWS infrastructure in the first 30 days unless a pilot partner's procurement requires it.

### Why — and clearing up the question
"Next.js" is the framework the app is **built in**; it is not a host. The real choice is *where the Next.js app runs*: **Vercel** (a managed platform built by Next.js's creators — zero-config deploys, preview environments, edge CDN, automatic TLS/HSTS) or **AWS** (you assemble and operate compute, database, storage, CDN, secrets, and monitoring yourself).

**Key fact:** Vercel and Supabase both run on **AWS** underneath. So this is not "Vercel vs AWS" as rival clouds — it is *a managed convenience layer on AWS* (Vercel + Supabase) vs *raw AWS you operate yourself*. For a 30-day pilot with a lean team, the managed layer wins on speed and operational burden. Moving to raw AWS later is a **re-host, not a re-write**, because the app is a modular monolith.

### When to move to AWS (trigger conditions — business/compliance, not technical)
- A pilot district's security review requires your **own cloud account / VPC**, or contractual terms Vercel/Supabase won't sign.
- You need **SOC 2 Type II** with a hardened, auditable, single-tenant deployment.
- You outgrow the managed tiers on **cost or scale**.

Until one of these is real, staying on Vercel + Supabase is the correct call.

---

## 2. Where everything lives (the full map)

| # | Component | What it holds | MVP host | Production host | Notes |
|---|---|---|---|---|---|
| 1 | **Source code** | The app | **GitHub** | GitHub | Add branch protection, secret scanning + push protection, Dependabot |
| 2 | **App / compute** | Next.js runtime | **Vercel** | AWS App Runner / ECS Fargate | Pin functions to a US region |
| 3 | **Primary database** | System of record — all relational data | **Supabase Postgres** | AWS RDS Postgres | US region; RLS on (see baseline) |
| 4 | **Object storage** | Curriculum files, exports, KB-library docs, uploads | **Supabase Storage** | AWS S3 | Signed, expiring URLs; not the app server |
| 5 | **Auth** | Identity, sessions, password hashes | **Supabase Auth** | Cognito / Supabase enterprise | Cookies HttpOnly/Secure/SameSite |
| 6 | **Cache / rate-limit store** | Rate-limit counters | **Upstash (Redis)** | Upstash / ElastiCache | Confirmed; US region |
| 7 | **Bot protection** | Challenge tokens | **Cloudflare Turnstile** | Cloudflare Turnstile | Confirmed |
| 8 | **Secrets** | API keys, DB URLs, service-role key | **Vercel encrypted env vars** | AWS Secrets Manager | Never `NEXT_PUBLIC_`; per-environment |
| 9 | **Error monitoring** | Exceptions, traces | **Sentry** | Sentry | Scrub PII from events |
| 10 | **Logs** | Request/app logs | Vercel logs | CloudWatch | Retention policy |
| 11 | **Analytics** | Product events | **Internal `app_events` table** | Internal table → PostHog later | Per PRD; no warehouse in MVP |
| 12 | **Transactional email** | Password reset, invites, notices | **Resend** (chosen) | Resend / SES | Required for auth; Postmark is the prod upgrade path |
| 13 | **DNS / domain** | `d2dmoneyhub.com` + app subdomain | **Cloudflare DNS** *(recommended)* | Cloudflare / Route 53 | App on `app.d2dmoneyhub.com`; pairs with Turnstile |
| 14 | **CDN / WAF / DDoS** | Edge delivery + filtering | Vercel edge (+ Cloudflare front) | CloudFront + WAF | |
| 15 | **Backups / DR** | DB + storage backups | **Supabase automated backups + PITR** | RDS snapshots + PITR | **Was underspecified — set retention + test restore** |
| 16 | **CI/CD** | Build, test, scan, deploy | **GitHub Actions** | GitHub Actions | Typecheck, tests, `npm audit`, Dependabot |
| 17 | **AI provider APIs** (later) | Model calls | Anthropic/OpenAI, server-side only | same | Behind the AI gateway; off for learners |

---

## 3. What was missing — now surfaced

These weren't in the "code / compute / DB / storage" picture and each needs an owner:

1. **Transactional email provider (#12).** Auth flows (password reset, magic links, roster invites) cannot ship without one. Supabase's built-in email is dev-grade and rate-limited. **Recommend Resend** (simplest) or Postmark (best deliverability). Required, not optional.
2. **Backups & disaster recovery (#15).** Define the retention window and run a **tested restore** — a backup you've never restored is a guess. Ties directly to the FERPA retention/deletion controls.
3. **Data residency.** Explicitly pin **US regions** for Vercel, Supabase, and Upstash. Districts will ask "where is student data physically stored?" — you need a one-line answer, and it should be US.
4. **Sub-processor list + DPAs.** Every vendor above that touches student data (Vercel, Supabase, Upstash, Cloudflare, Sentry, the email provider) is a **sub-processor**. You need (a) a signed DPA with each, and (b) a sub-processor list to attach to your own DPA with districts. This is the "who holds the data" answer in procurement terms — currently absent.
5. **Environment separation.** Stand up **separate Supabase projects and Vercel environments** for dev / staging / prod, so **real student data never lands in a preview or dev deployment**. Vercel preview builds pointed at prod data are a subtle leak path — don't.
6. **Domain plan.** Put the app on a subdomain (`app.d2dmoneyhub.com`, or a dedicated LRNEX domain). Route DNS through **Cloudflare** so Turnstile, WAF, and DDoS protection sit in one place.

---

## 4. Rough MVP cost (estimate, monthly)

Order-of-magnitude only — comfortably inside the pilot budget:

| Item | Est. / mo |
|---|---|
| Vercel (Pro) | ~$20 / seat |
| Supabase (Pro) | ~$25 |
| Upstash (pay-as-you-go) | ~$0–10 |
| Cloudflare (Turnstile free; DNS free) | $0 |
| Sentry (Team) | ~$0–26 |
| Transactional email (Resend/Postmark) | ~$0–20 |
| Domain | negligible |
| **Rough total** | **~$90–150 / mo** |

AWS production hosting is materially more (RDS, NAT, CloudFront, WAF, ops time) — another reason to defer it until a partner requires it.

---

## 5. Confirmed vendor decisions

- **Bot protection:** Cloudflare Turnstile ✅
- **Dependency scanner:** GitHub Dependabot ✅ (native to the repo)
- **Field-level encryption:** yes, for accommodations/IEP + sensitive PII (`pgcrypto`/app-layer) ✅
- **Rate limiting on custom endpoints:** Upstash (`@upstash/ratelimit`) ✅

---

## 6. Open choices remaining

1. **Transactional email provider** — **Resolved: Resend** for the pilot (React Email fit, free tier covers pilot volume, SOC 2 + DPA). Postmark remains the production upgrade path if deliverability or procurement demands it.
2. **DNS through Cloudflare** — recommended (pairs with Turnstile). **Open — pending discussion with Whitney** before moving `d2dmoneyhub.com` DNS. Turnstile is confirmed and stays either way; it works standalone in the meantime.
3. **US region** — **Resolved: `us-east-1`.** Pin Supabase, Vercel functions, and Upstash to it.

Vendor DPAs, the sub-processor list, data-residency, and the FERPA data chain are tracked in `docs/SUBPROCESSORS.md`.

---

## 7. Notes

A hosting decision and data map for a pilot build — not a signed DPA, a completed data-processing inventory, or a compliance certification. It provides the technical basis those artifacts are written from. Update when a pilot partner's procurement adds a requirement, or when moving to the AWS path.
