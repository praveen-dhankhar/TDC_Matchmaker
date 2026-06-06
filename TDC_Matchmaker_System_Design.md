# TDC Matchmaker Platform — System Design

---

## Requirements

### Functional
- Matchmaker login with session auth
- Dashboard: customer list with Name, Age, City, Status tag
- Detailed biodata view (30+ fields per spec)
- Gender-specific matching algorithm + pool of 100+ dummy profiles
- AI match scoring with explanation (Gemini / LLM)
- Send Match action — modal/toast + mock email trigger
- Quick notes per customer from meetings/calls

### Non-functional
- **Latency:** Dashboard load <1s, match scoring <3s (AI call)
- **Security:** JWT sessions, HTTPS only, PII encryption at rest
- **UI:** Clean, emotionally aligned, mobile-responsive
- **Scalability:** Modular services, ready to grow from 100 → 100K profiles
- **Availability:** 99.9% uptime; stateless API enables horizontal scaling
- **Code quality:** Modular, readable, well-commented per evaluation criteria

---

## Scale Estimation (MVP → Growth)

| Metric | Value |
|---|---|
| Dummy profiles (MVP) | 100+ |
| Active matchmakers | ~10 |
| Match requests / day | ~50 |
| AI API calls / day | ~50 |

> MVP uses static JSON / mock DB. Growth path: Firebase Firestore → PostgreSQL + pgvector for embedding-based matching. AI cost at 50 calls/day with Gemini Flash remains small at MVP scale. Bottleneck at scale: Gemini latency per match scoring call — mitigate with async scoring + result caching.

---

## Architecture Layers

```
┌──────────────────────────────────────────────────────────────┐
│           Frontend — React / Next.js (Vercel)                │
│  Login page · Dashboard list · Customer detail view          │
│  Match results panel · Send Match modal · Notes widget       │
└──────────────────────────────┬───────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│           Backend API — Node.js / Express (Render)           │
│  Auth service · Profile service · Matching engine            │
│  AI scoring service · Notes service · Email trigger          │
└──────────────────────────────┬───────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│           Data Layer — Firebase / Static JSON (MVP)          │
│  Profiles collection · Matches collection                    │
│  Notes collection · Users (matchmakers)                      │
└──────────────────────────────┬───────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│                     External Services                        │
│        Gemini API · Email (mock / SMTP)                      │
│              Hosting: Vercel + Render                        │
└──────────────────────────────────────────────────────────────┘
```

---

## API Design

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Matchmaker login → JWT token |
| GET | `/customers` | List all customers for logged-in matchmaker |
| GET | `/customers/:id` | Full biodata for one customer |
| GET | `/customers/:id/matches` | Run matching algo → ranked list with AI scores |
| POST | `/customers/:id/send-match` | Trigger mock email / modal for a match |
| GET | `/customers/:id/notes` | Fetch notes for a customer |
| POST | `/customers/:id/notes` | Add a new note |
| PATCH | `/customers/:id/status` | Update journey stage / status tag |
| GET | `/profiles/pool?gender=` | Fetch opposite-gender pool for matching |

---

## Database Design

### Collections / Tables

- **profiles** — all biodata fields from spec (firstName, gender, dob, city, income, caste, religion, wantKids, relocate, pets …)
- **users** — matchmaker accounts (id, email, hashed_password, assigned_customer_ids[])
- **matches** — (customer_id, candidate_id, ai_score, label, sent_at, status)
- **notes** — (id, customer_id, matchmaker_id, body, created_at)
- **dummy_pool** — 100+ synthetic profiles seeded at startup, gender-split

### Data Strategy

- **MVP:** Static JSON files loaded at server start — zero infra, instant deploy
- **Stage 2:** Firebase Firestore — real-time updates, no schema migration
- **Stage 3:** PostgreSQL + pgvector for embedding-based similarity search at scale
- PII fields (email, phone) encrypted at rest; only accessible to assigned matchmaker
- Matches table is append-only — full history preserved, status updated by column

---

## Caching

### Profile pool cache
Dummy pool loaded once into memory on server start. TTL refresh every 24h or on manual seed update. Eliminates repeated DB reads for the matching engine hot path.

### AI score cache
Cache Gemini response keyed on `(customer_id, candidate_id)` — same pair always gets same score. Cuts API cost and latency on re-render of the matches panel.

### Session cache
JWT stored in `httpOnly` cookie client-side. Server validates via secret — no DB hit on each request. Token expiry 8h; matchmaker re-authenticates per shift.

---

## Message Queue

At MVP scale (50 match actions/day), a full message queue like Redis Pub/Sub or BullMQ is overkill. A lightweight async job runner suffices.

### MVP approach
**Fire-and-forget async:** `POST /send-match` returns 202 immediately; email and AI intro generation run in a background `Promise`. Toast/modal shown client-side optimistically. No blocking.

### Growth path
**BullMQ + Redis:** Queue `send-match-email` and `generate-ai-intro` as separate jobs. Retry on Gemini failure. Monitor via Bull Board UI. Enables rate limiting AI calls and batching email sends.

---

## Security

| Layer | Approach |
|---|---|
| Auth | JWT in httpOnly cookie. Bcrypt password hashing. Login rate-limited (5 attempts / 15 min). |
| Transport | HTTPS enforced via Vercel / Render. HSTS headers. No PII in URL query strings. |
| Data access | Matchmaker can only read profiles assigned to them. Server enforces ownership on every `/customers/:id` route. |
| PII protection | Email, phone encrypted at rest (AES-256). Decrypted only at response time for authenticated owner. |
| API key safety | Gemini API key stored as server env var only — never exposed to frontend bundle. |
| CORS | Origin whitelist: only the deployed Vercel frontend domain. Rejects all other origins. |
| Input validation | Zod schema validation on all POST/PATCH bodies. Rejects malformed or oversized payloads. |

---

## Monitoring

### Uptime & errors
Render health-check endpoint `GET /health`. Auto-restart on crash. Logs to stdout → Render Log Stream.

### AI usage
Log each Gemini call: latency, tokens used, cache hit/miss. Alert if daily spend exceeds threshold.

### Product metrics
Track matches sent per matchmaker, AI score distribution, note frequency — reveals product usage patterns.

---

## Tradeoffs

### Static JSON vs live DB
**Pro:** Zero infra setup, instant deploy, perfect for demo/evaluation. 100 profiles load in <10ms.

**Con:** No persistence for notes/matches across restarts. Must migrate to Firestore/Postgres for production use.

---

### LLM scoring vs rule engine
**Pro:** LLM gives rich natural language explanations ("High Potential — shared values on relocation and profession"). Meets the mandatory AI requirement.

**Con:** ~1–2s latency per score, non-deterministic, costs money. Rule engine fallback needed for offline/demo mode.

---

### Gender-asymmetric matching logic
**Pro:** Mirrors stated Indian matrimonial conventions from the spec. Directly addresses evaluation criterion "realistic, gender-specific logic".

**Con:** Hardcoded social assumptions create bias and limit product addressable market. Should be configurable, not fixed in code.

---

### React SPA vs Next.js SSR
**Pro:** Next.js adds SSR for faster initial dashboard load and better SEO (if public profiles ever needed). Aligns with listed tech stack.

**Con:** Internal tool — SEO irrelevant. SSR adds complexity. Plain React + Vite deploys faster for MVP with same UX.

---

## Summary of Key Decisions

Each decision maps directly to the spec:

- **Requirements** — split into functional (login, dashboard, biodata view, matching algo, AI, send match, notes) and non-functional (latency, security, scalability, code quality from the evaluation criteria).
- **Scale estimation** — MVP is tiny: 100 profiles, ~10 matchmakers, ~50 AI calls/day. This anchors every other decision. Don't over-engineer for a demo.
- **API design** — RESTful, nine endpoints covering every user flow the spec describes. The `/customers/:id/matches` endpoint is the core — it runs both the matching algo and the AI scoring in one call.
- **Database** — Static JSON for MVP (zero infra, deploys in seconds), with a clear migration path to Firestore → PostgreSQL+pgvector as the product scales. The `matches` table is append-only by design — preserves full history.
- **Caching** — three layers: profile pool in memory (eliminates DB reads on the hot path), AI score cache keyed on `(customer_id, candidate_id)` (cuts Gemini cost on re-renders), JWT in httpOnly cookie (no DB hit per request).
- **Message queue** — fire-and-forget async `Promise` at MVP scale. BullMQ + Redis when you need retry logic and rate limiting for Gemini calls.
- **Security** — the spec handles real PII (phone, email, income, caste). That demands AES-256 at rest, httpOnly JWTs, CORS whitelist, and server-side ownership enforcement on every profile route.
- **Monitoring** — three axes: uptime/crashes, AI spend/latency, and product usage metrics (matches sent, score distribution).
- **Tradeoffs** — the trickiest call is the gender-asymmetric matching logic. The spec explicitly defines it, but hardcoding social assumptions into the engine is a liability at scale. The right move is to implement it as specified for the submission, then document it as configurable logic in the write-up.
