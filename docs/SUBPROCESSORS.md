# Sub-processor Register & Data-Processing Inventory — LRNEX & D2D

**Version:** 0.1 (draft — for legal review before publication)
**Status:** Procurement artifact skeleton — vendors identified, DPAs not yet signed
**Applies to:** LRNEX MVP and D2D Student Growth Platform
**Companion to:** `docs/HOSTING.md`, `docs/SECURITY-BASELINE.md`

> This is the document a school district's privacy officer asks for. It lists every vendor that touches student data, what each holds, where it lives, and where each vendor's own DPA and sub-processor list can be read. **It is a draft skeleton — the actual signed DPAs and the public-facing version require legal review.**

---

## 1. How the data chain works (the FERPA / DPA structure)

Student data moves through a chain of responsibility, and each link needs a signed agreement:

```
District (Controller / owns the student data)
        │  signs a DPA with →
D2D / Thrivv (Processor — a "school official" under FERPA)
        │  signs a DPA with each →
Vendor (Sub-processor — Supabase, Vercel, etc.)
        │  runs on →
Infrastructure (Sub-sub-processor — AWS)
```

So there are **two DPA directions**:
1. **Downstream:** you sign a DPA with **each vendor** below (you're their customer).
2. **Upstream:** you sign a DPA with **each district** (they're your customer). Your DPA with the district attaches **this sub-processor list** as an appendix.

## 2. Where you publish this for procurement

- **Public page:** publish the current sub-processor list at a stable URL — e.g., `d2dmoneyhub.com/legal/subprocessors` — so a district can read it before asking.
- **DPA appendix:** attach the same list as an exhibit to the DPA you sign with each district.
- **Change notice:** commit to notifying districts before adding or changing a sub-processor (standard DPA term).

Until legal produces the public version, **this file is the internal source of truth.**

---

## 3. The register — every vendor that touches student data

Residency target is **US (`us-east-1`)** wherever a region is selectable.

| Vendor | Role | Holds student data? | Residency | Vendor DPA | Vendor sub-processor list |
|---|---|---|---|---|---|
| **Supabase** | Postgres (system of record), Auth, Storage | **Yes — all student records, files, identities** | US (`us-east-1`) | supabase.com/legal/dpa | supabase.com/legal/subprocessors |
| **Vercel** | App hosting / compute | **Transits & processes** (requests, logs); not the store of record | US region (pin functions) | vercel.com/legal/dpa | vercel.com/legal/subprocessors |
| **Upstash** | Redis — rate-limit counters | **Metadata only** (IPs / keys, not student records) | US | upstash.com (trust/DPA page) | (on trust page) |
| **Cloudflare** | Turnstile (bot), + DNS/WAF if adopted | **Transits metadata** (IPs, request/challenge data) | Global edge | cloudflare.com/cloudflare-customer-dpa | cloudflare.com/gdpr/subprocessors |
| **Resend** (email) | Transactional email | **Yes — recipient PII + message content** (names, emails, "report ready" notices) | US | resend.com/legal/dpa | resend.com/legal (sub-processors) |
| **Sentry** | Error monitoring | **Only if not scrubbed** — see flag below | US (choose US data region) | sentry.io/legal/dpa | sentry.io/legal/subprocessors |
| **AWS** | Underlying infra for Supabase/Vercel/Upstash | Sub-sub-processor (data at rest lives here) | US (`us-east-1`) | aws.amazon.com/agreement (DPA addendum) | AWS sub-processor listings |
| **GitHub** | Source code | **No student data** — code only (enforced) | US | github.com (GitHub DPA) | GitHub sub-processor list |
| **Anthropic / OpenAI** | AI gateway (future) | **Not active** — off for learners in MVP | US | (at enablement) | (at enablement) |

> Links are the typical current locations — **confirm the exact URL and current terms at signing.** Terms and sub-processor lists change.

## 4. Flags that need action, not just a signature

- **Sentry PII scrubbing (critical).** Error events can silently capture student data in request payloads, params, or breadcrumbs. Configure server-side PII scrubbing / `beforeSend` filtering **before** Sentry sees production traffic, or Sentry becomes an unplanned student-data processor. (Cross-ref: Security Baseline control 9/17.)
- **GitHub holds no student data — keep it that way.** No student PII, real datasets, or `.env` with prod creds is ever committed. Seed/demo data only. (Cross-ref: controls 1–2.)
- **Email holds message content.** Whatever an email says about a scholar (e.g., "your child's assessment is ready") is student data in transit and at rest in the provider — keep notice content minimal and avoid embedding sensitive detail in email bodies.
- **Upstash keys.** Rate-limit keys should be IP/session identifiers, not student identifiers, so the counter store stays metadata-only.

## 5. Action checklist

- [ ] Sign a DPA with each active vendor above (Supabase, Vercel, Upstash, Cloudflare, email provider, Sentry, GitHub, AWS as applicable).
- [ ] Pin every selectable region to **US (`us-east-1`)**.
- [ ] Configure **Sentry PII scrubbing** before production traffic.
- [ ] Enforce **no student data in GitHub** (review + secret scanning).
- [ ] Have legal produce the **public sub-processor page** and the **district DPA template** with this list as an appendix.
- [ ] Stand up the **district-facing DPA** (upstream) once a pilot partner is identified.
- [ ] Add a **sub-processor change-notification** commitment to the district DPA.

---

## 6. Notes

A draft internal register, not a signed agreement or a legal opinion. The signed vendor DPAs, the public-facing sub-processor page, and the district DPA template all require legal review before they carry weight in procurement. Update whenever a vendor is added, removed, or changes its own terms.
