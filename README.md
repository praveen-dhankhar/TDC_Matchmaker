# TDC Matchmaker Platform

AI-assisted matrimonial matchmaker console for The Date Crew. The application gives a matchmaker one place to review assigned customer biodata, search and filter customers, generate rule-based and AI-enriched match recommendations, send match introductions, update journey status, and record quick meeting notes.

The project is intentionally built as an MVP with production-shaped boundaries: a Next.js frontend, an Express API, shared TypeScript types, seeded profile data, encrypted PII fields, JWT cookie sessions, validation, rate limiting, and a Gemini fallback strategy.

## Demo Login

- Email: `matchmaker@thedatecrew.com`
- Password: `TDC2024!`

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Auth | JWT in `httpOnly` cookies, bcrypt password hashing |
| Validation | Zod request schemas |
| Security | Helmet, CORS allowlist, login rate limiting, AES-256-GCM PII encryption |
| AI | Gemini REST API using `gemini-flash-latest` |
| Data | In-memory MVP store seeded with 120 Indian matrimonial profiles |
| Tests | Vitest |
| Linting | ESLint flat config |

## Repository Layout

```text
.
|-- backend/
|   |-- src/
|   |   |-- config/          # Environment and runtime config
|   |   |-- data/            # In-memory store, seeded users, profile generator
|   |   |-- middleware/      # Auth, validation, error handling
|   |   |-- routes/          # REST API routes
|   |   |-- services/        # Auth, profile, matching, AI, notes, email services
|   |   `-- utils/           # Encryption, age, income, overlap helpers
|   |-- package.json
|   `-- tsconfig.json
|-- frontend/
|   |-- src/
|   |   |-- app/             # Next.js app routes: login, dashboard, customer detail
|   |   |-- components/      # Dashboard, customer, matching, layout, UI components
|   |   `-- lib/             # API client, types, frontend utilities
|   |-- package.json
|   `-- next.config.mjs
|-- shared/
|   `-- types/               # Shared Profile, MatchResult, Note, User, API types
|-- implementation_plan.md
`-- TDC_Matchmaker_System_Design.md
```

## Core User Flow

1. Matchmaker signs in with email and password.
2. Backend validates credentials and sets a JWT in an `httpOnly` cookie.
3. Dashboard loads assigned customers from `/api/customers`.
4. Matchmaker can search, filter, sort, and open a customer biodata page.
5. Customer detail view shows 30+ biodata fields and status controls.
6. Matching panel requests `/api/customers/:id/matches`.
7. Backend applies hard filters, rule-based scoring, and Gemini enrichment.
8. Matchmaker reviews a candidate and confirms "Send Match".
9. Backend records the sent match in memory and logs a mock email.
10. Matchmaker can add meeting/call notes, stored in memory for the MVP.

## Feature Summary

### Authentication

- Demo matchmaker account seeded at backend startup.
- Passwords are hashed with bcrypt.
- Login issues a JWT with an 8-hour expiry.
- JWT is stored in an `httpOnly` cookie.
- Login endpoint is rate-limited to 5 attempts per 15 minutes.
- Logout clears the cookie.

### Dashboard

- Lists all customers assigned to the authenticated matchmaker.
- Shows name, age, city, marital status, and status tag.
- Supports search by name, filter by city/status, and sort by name/age/status.
- Empty state is shown when no assigned customers match the filters.

### Customer Biodata

The detail view exposes the full profile model, including:

- Personal: name, gender, date of birth, computed age
- Location: country, city, relocation preference
- Physical: height, body type, disability
- Contact: decrypted email and phone for authenticated matchmaker
- Education and career: colleges, degrees, company, designation, profession, income
- Family: marital status, siblings, parents' occupations, family type
- Cultural: religion, caste, sub-caste, mother tongue, languages
- Lifestyle: kids, pets, diet, drinking, smoking, hobbies
- Preferences: age range, preferred cities/religion, dealbreakers
- Profile: bio, profile photo, verification date

### Matching Engine

Matching is intentionally split into deterministic rules plus Gemini enrichment.

Hard filters:

- Opposite gender
- Marital status compatibility
- No direct dealbreaker conflicts
- Candidate age within the customer's preferred range

Male-customer scoring emphasizes:

- 1-5 year age gap preference
- Candidate income less than or equal to customer income
- Candidate shorter by at least 2 cm
- Children preference alignment
- Religion and caste compatibility
- City proximity
- Language overlap
- Lifestyle alignment

Female-customer scoring emphasizes:

- Stable profession and career strength
- Kids, relocation, and pets alignment
- Education parity or higher
- City or relocation compatibility
- Religion and caste compatibility
- Age compatibility
- Lifestyle alignment
- Language overlap

The backend ranks candidates by rule score first, asks Gemini to enrich the top results, and computes a final score:

```text
finalScore = 0.4 * ruleScore + 0.6 * aiScore
```

### Gemini AI Scoring

The AI service uses the Gemini REST API:

```text
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent
```

Gemini receives concise profile summaries with no contact PII and returns:

- `aiScore`: 0-100
- `label`: `High Potential`, `Good Match`, `Worth Exploring`, or `Low Compatibility`
- `explanation`: short matchmaker-readable explanation

The service caches AI responses by `(customerId, candidateId)` so the same pair does not repeatedly call Gemini. If Gemini is unavailable, returns malformed JSON, or the API key is missing/rejected, the backend falls back to the deterministic rule score and a generated explanation.

### Notes

- Notes are stored per customer.
- Notes include body, timestamp, matchmaker ID, and matchmaker name.
- Notes are returned reverse chronologically.
- Note body is required and capped at 1000 characters.
- Notes are in memory and reset on backend restart.

### Send Match

- The frontend opens a confirmation modal before sending.
- `POST /api/customers/:id/send-match` returns `202 Accepted`.
- Backend records the sent match in memory.
- A mock email is logged to the backend console.
- Duplicate sends for the same customer/candidate pair return conflict.

## API Reference

All app routes are mounted under `/api`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Health check and in-memory stats |
| `POST` | `/api/auth/login` | No | Login and set JWT cookie |
| `POST` | `/api/auth/logout` | Yes | Clear JWT cookie |
| `GET` | `/api/auth/me` | Yes | Current session user |
| `GET` | `/api/customers` | Yes | Assigned customer summaries |
| `GET` | `/api/customers/:id` | Yes | Full customer biodata |
| `PATCH` | `/api/customers/:id/status` | Yes | Update journey status |
| `GET` | `/api/customers/:id/matches?limit=10` | Yes | Generate ranked matches |
| `POST` | `/api/customers/:id/send-match` | Yes | Send a match introduction |
| `GET` | `/api/customers/:id/notes` | Yes | Fetch notes |
| `POST` | `/api/customers/:id/notes` | Yes | Add note |
| `GET` | `/api/profiles/pool?gender=Male` | Yes | Fetch opposite-gender matching pool |

## Local Setup

Install dependencies in each package:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

Create backend environment:

```bash
cp backend/.env.example backend/.env
```

Recommended local backend values:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=replace-with-local-secret
JWT_EXPIRES_IN=8h
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-flash-latest
CORS_ORIGIN=http://localhost:3000
ENCRYPTION_KEY=replace-with-32-byte-or-longer-secret
```

Create frontend environment if needed:

```bash
cp frontend/.env.example frontend/.env.local
```

Recommended local frontend value:

```env
API_PROXY_TARGET=http://localhost:4000
```

Run both apps:

```bash
npm run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Backend health through frontend proxy: `http://localhost:3000/api/health`

## Frontend API Proxy

The frontend calls same-origin `/api/*` routes. `frontend/next.config.mjs` rewrites those requests to the backend:

```text
/api/:path* -> API_PROXY_TARGET/api/:path*
```

This is important in production. If the browser calls Render directly from Vercel, auth cookies can fail because the backend cookie is cross-site. By proxying through Vercel, the browser sees the API as same-origin with the frontend, so the login cookie survives navigation and the dashboard session check works.

## Deployment

### Backend On Render

Create a Render Web Service from the GitHub repo.

Recommended settings:

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Render environment variables:

```env
NODE_ENV=production
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=8h
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-flash-latest
ENCRYPTION_KEY=replace-with-strong-secret
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

Do not set `PORT`; Render injects it automatically.

Test after deploy:

```bash
curl https://your-render-service.onrender.com/api/health
```

### Frontend On Vercel

Create a Vercel project from the same GitHub repo.

Recommended settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | default |

Vercel environment variable:

```env
API_PROXY_TARGET=https://your-render-service.onrender.com
```

Redeploy Vercel after changing environment variables. Next.js build-time configuration and rewrites are not updated until a new deployment is built.

## Verification

Run from the repo root:

```bash
npm run build
npm run lint
npm test
```

Backend production-install simulation:

```bash
cd backend
npm ci --omit=dev
npm run build
```

Useful deployed checks:

```bash
curl https://your-render-service.onrender.com/api/health
curl https://your-vercel-domain.vercel.app/api/health
```

## Troubleshooting

### Dashboard Stuck On "Loading Customers"

Likely causes:

- Vercel was not redeployed after changing env vars.
- `API_PROXY_TARGET` is missing or points to the wrong Render URL.
- Render backend is asleep or failing health checks.
- Render `CORS_ORIGIN` does not match the Vercel production domain.

Check:

```bash
curl https://your-vercel-domain.vercel.app/api/health
```

If that fails, the Vercel rewrite is not reaching Render.

### Login Redirects Back To Login

Likely causes:

- Frontend is calling Render directly instead of same-origin `/api`.
- Vercel deploy still has an old client bundle.
- Backend cookie settings are wrong for production.

Expected production cookie settings:

```text
HttpOnly; Secure; SameSite=None
```

Expected frontend API base in bundled code should be same-origin `/api`, not `https://render-url/api`.

### Render TypeScript Build Cannot Find Node Types

Render may build with dev dependencies omitted depending on settings. This repo keeps TypeScript and required `@types/*` packages in backend `dependencies` so `npm ci --omit=dev && npm run build` still works.

### Gemini Returns Invalid JSON

The AI service:

- asks Gemini for JSON-only output
- strips code fences if present
- extracts the JSON object if there is surrounding text
- falls back to deterministic scoring if parsing still fails

### Notes Or Sent Matches Disappear

This is expected in the MVP. Notes, sent match history, profile pool, and AI cache are in memory and reset when the backend restarts.

## Security Notes

- Never commit `backend/.env`; it may contain real secrets.
- `GEMINI_API_KEY`, `JWT_SECRET`, and `ENCRYPTION_KEY` belong in deployment environment variables.
- Email and phone are encrypted at seed time with AES-256-GCM.
- Decrypted PII is only returned through authenticated customer-detail and match endpoints.
- CORS should be restricted to the deployed Vercel frontend domain in production.
- The MVP uses static seeded data and in-memory notes/matches; use a real database before production customer usage.

## MVP Limitations

- No persistent database.
- No real SMTP provider.
- No multi-matchmaker admin console.
- AI scoring is synchronous for MVP simplicity.
- Matching logic encodes assignment-specific matrimonial assumptions and should become configurable before broader product use.

## Growth Path

Recommended next steps:

- Move profiles, notes, matches, and users into PostgreSQL or Firestore.
- Store sent match records append-only.
- Add background jobs for match email delivery and AI enrichment.
- Add audit logging for PII access.
- Add role-based access for senior matchmakers/admins.
- Add E2E tests for login, dashboard, customer detail, notes, and send-match.
- Make matching weights configurable by product/admin settings.
