<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme_assets/assu.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/readme_assets/assu.svg">
  <img alt="Assu" src="docs/readme_assets/assu.svg" width="250">
</picture>

<p align="center">
  <strong>automatic transfer verification — detects real bank movements and matches them against payment receipts</strong>
</p>

<p align="center">
  <a href="./docs/#">Backend</a> ·
  <a href="./docs/#">Dashboard</a> ·
  <a href="./docs/#">Testing Guide</a> ·
  <a href="./docs/#">Banks Setup</a>
</p>

<p align="center">
  <img alt="tests" src="https://img.shields.io/badge/backend-typescript-38A793?style=flat-square" />
  <img alt="stack" src="https://img.shields.io/badge/frontend-Next.js-38A793?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/database-supabase-38A793?style=flat-square" />
</p>

</div>

---

<div align="justify">

A customer sends a screenshot or PDF of a transfer over Telegram. Assu reads it, checks whether a matching movement actually happened in the bank account, and tells the merchant whether the payment is verified — without a human having to open a bank app and eyeball a list of transactions.

Assu is two cooperating services:

| | |
|---|---|
| **Movement Detection** | Logs into Nequi, Bancolombia, and Daviplata (via Playwright — no official open banking API exists for this), pulls new movements, normalizes and deduplicates them. |
| **Receipt Verification** | Receives receipts over Telegram, runs OCR, and reconciles the extracted amount/reference/time against real bank movements. |
| **Reconciliation Engine** | Deterministic scoring (reference + amount + time window) → `EXACT_MATCH`, `PROBABLE_MATCH`, `AMBIGUOUS_MATCH`, `NO_MATCH`, or `PENDING`. No ML, no guessing. |
| **Audited State Machine** | `RECEIVED → PROCESSING → PENDING_MOVEMENT → MATCHING → VERIFIED/REJECTED/AMBIGUOUS/ERROR/MANUAL_REVIEW`. Every transition is logged with an actor and a reason. |
| **Telegram Ingestion** | Built on [Telegraf](https://telegraf.js.org) and the official Telegram Bot API — free, no message limits, no ban risk from unofficial automation (the reason open-wa/WhatsApp Web automation was dropped). |
| **Administrator Panel** | Next.js ops dashboard: banks, accounts, movements, sync history, monitoring. |

---

## Use Assu

<table>
<tr>
<td width="50%" valign="top">

<h3> I'm running the backend</h3>

The engine that detects movements and verifies receipts. A NestJS microservice with its own Postgres, Redis, and BullMQ queues.

**[→ Jump to backend setup](#backend-assu-backend)**

</td>
<td width="50%" valign="top">

<h3> I need the ops dashboard</h3>

A Next.js panel that consumes the backend's Internal API — view accounts, force a sync, review a flagged payment.

**[→ Jump to frontend setup](#admin-panel-assu-frontend)**

</td>
</tr>
<tr>
<td colspan="2" valign="top">

<h3> I'm adding a new bank</h3>

Bank-specific logic is fully isolated behind a `BankAdapter` port (`login()`, `sync()`, `logout()`) — no core code changes needed for a new integration.

**[→ Jump to architecture](#how-it-works)**

</td>
</tr>
</table>

---

## How it works

```text
   Telegram (Bot API)                         Bank portals (Playwright)
           │                                            │
           ▼                                            ▼
   Receipt Ingestion                            Bank Adapter System
   (idempotent intake)                    (login → sync → logout, isolatable)
           │                                            │
           ▼                                            ▼
   Receipt Processing                              Sync Engine
   (validate · hash · OCR)                    (parse · validate · dedupe)
           │                                            │
           └──────────────────┬─────────────────────────┘
                               ▼
                   Reconciliation Engine
             reference + amount + time window
                               │
                               ▼
                   Payment Verification
              (audited state machine, CAS-guarded)
                               │
                 ┌─────────────┼──────────────┐
                 ▼             ▼              ▼
             VERIFIED      REJECTED     MANUAL_REVIEW
                               │
                               ▼
                        Internal API  ────────►  Admin Panel
                                                  (assu-frontend)
```
<div align="justify">

**A technical failure is never a rejection.** If OCR times out or the bank portal is unreachable, the submission goes to `ERROR` — never `REJECTED`. Only real evidence (a bank movement window with no matching amount/reference) produces a rejection, and even then the customer is told *"we couldn't verify this yet"*, not *"this is fake."*

**"Not found yet" is never "not real."** A movement that Assu hasn't synced yet keeps a submission in `PENDING_MOVEMENT` for retry — it's a distinct state from a genuine mismatch.

**One movement, one payment.** A `matchedMovementId` unique constraint at the database level — not just application logic — guarantees a bank movement can never verify two different receipts.

**No silent overrides.** `REJECTED` or `AMBIGUOUS` can only become `VERIFIED` through an explicit, audited manual review with a named human actor — never automatically.

</div>

---

## Backend (`assu-backend`)

<img alt="stack" src="https://img.shields.io/badge/NestJS-+10-38A793?style=flat-square" />
<img alt="stack" src="https://img.shields.io/badge/TypeScript-5.5-38A793?style=flat-square" />
<img alt="stack" src="https://img.shields.io/badge/Supabase-Prisma-38A793?style=flat-square" />
<img alt="stack" src="https://img.shields.io/badge/Redis-BullMQ-38A793?style=flat-square" />


### Quickstart

```bash
cd assu-backend
docker compose -f docker/docker-compose.yml up -d postgres redis

corepack enable
pnpm install
cp .env.example .env       # set INTERNAL_API_KEY, OCR_PROVIDER, OPENWA_* as needed

pnpm run prisma:generate
pnpm run prisma:migrate:dev

pnpm test                  # 254 tests
pnpm run start:dev         # API on :3000, docs on :3000/docs
```

### Modules

| Area | What it does |
|---|---|
| `bank`, `bank-account`, `bank-adapter` | Bank registry, connected accounts, pluggable `BankAdapter` per bank — optional dedicated/residential proxy, optional disposable Docker container per scrape |
| `session-manager`, `login-manager` | Cookie/token lifecycle, re-auth detection |
| `scheduler`, `queue` | Per-account sync frequency, BullMQ jobs with backoff |
| `sync-engine`, `movement-parser`, `movement-validator`, `movement-deduplication` | The detect → normalize → validate → dedupe → store pipeline |
| `credentials`, `audit`, `rate-limiting` | Credentials encrypted with AES-256-GCM (or AWS KMS) and a mandatory read-only attestation, full audit trail, per-bank throttling |
| `receipt-ingestion` | Telegram receipt intake via Telegraf |
| `receipt-processing` | File validation, hashing, OCR (`NullOcrAdapter` placeholder or real `TesseractOcrAdapter`) |
| `reconciliation-engine` | Deterministic receipt-to-movement matching |
| `payment-verification` | The audited state machine + manual review endpoint |
| `observability`, `monitoring` | Prometheus metrics, Grafana dashboard, staleness/error-rate alerts |

<div align="center">
<sub>
Full walkthrough (infra, smoke tests, Telegram/OCR setup, checklists) → TEST GUIDE in docs/.
</sub>
</div>

---

## Administrator Panel (`assu-frontend`)

<img alt="stack" src="https://img.shields.io/badge/Next.js-14-38A793?style=flat-square" />
<img alt="stack" src="https://img.shields.io/badge/TailwindCSS-3.4-38A793?style=flat-square" />


### Quickstart

```bash
cd assu-frontend
pnpm install
cp .env.example .env.local   # ASSU_BACKEND_API_URL, ASSU_BACKEND_API_KEY

pnpm run dev -- -p 3001      # backend already owns :3000
```

### Security note

The browser never sees `ASSU_BACKEND_API_KEY`. Every request goes to a relative `/api/backend/...` route, resolved server-side by `app/api/backend/[...path]/route.ts`, which is the only place the key is attached before forwarding to the real backend.

### Brand

- Color: `#38A793` — token `--accent`, used consistently across cards, badges, and the sidebar's active states.
- Logo: **Backline** (real brand font, `app/fonts/Backline.otf`) — wordmark only, never body text.
- Display font: **Folty Bold** (`app/fonts/Folty-Bold.woff2`) — page titles only; only the Bold cut exists, so body/table text stays on Manrope for legibility at small sizes.

---

## What's not real yet

| Gap | Why |
|---|---|
| Live bank scraping | `NequiAdapter`, `BancolombiaAdapter`, and `DaviplataAdapter` all have placeholder selectors — each needs a real account inspected with `playwright codegen`. Same methodology for all three, documented once. See [`docs/#`]("./docs/#"). |
| Cloud OCR fallback | `TesseractOcrAdapter` is real and free, but there's no Google Vision/Textract adapter yet for higher-accuracy production use. |
| Docker-isolated scraping, verified end-to-end | `DockerIsolatedAdapter` and the container entrypoint are implemented and unit-tested, but the image itself hasn't been built or run against a real bank yet. |

Everything else in the diagram above is implemented and tested — the reconciliation engine, the state machine, Telegram ingestion, and the admin panel all run end-to-end against a real database and queue.

---

## Links

- [Testing Guide](./docs/#)
- [Nequi Adapter Setup](./docs/#)
- [Backend Information](./docs/#)
- [Administrator Panel](./docs/#)

---

## Author

**Emily Monterrosa Castro - Full Stack Developer** <br>
[GitHub](https://github.com/emilymontec) · [LinkedIn](https://www.linkedin.com/in/emilymontec/) · [Portfolio](https://emilymontec.github.io/portfolio/)

---

## License

Apache License 2.0

See the [LICENSE](LICENSE) file for additional information.

---

<!--
## Appendices
See the [UserGuide](docs/MANUAL%20USUARIO%20KEISY%20MEDICAL.pdf) to learn more.

If you want to know more about the system, please check the [Documentation](docs/DOCUMENTACION%20TECNICA%20KEISY%20MEDICAL.pdf).
-->

</div>

<p align="center">
  <strong>A receipt is a claim.<br>
  A bank movement is the evidence.<br>
  Assu only says "verified" when both agree.</strong>
</p>