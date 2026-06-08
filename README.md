# TDC Matchmaker Platform

TDC Matchmaker Platform is an AI-assisted matrimonial matchmaker dashboard for The Date Crew. It helps a matchmaker review assigned customer biodata, generate ranked match recommendations, understand why profiles may fit, create short personalized email introductions, send a match, update customer journey status, and record internal notes.

This repository is an MVP with production-shaped boundaries:

- Next.js frontend
- Express backend
- Shared TypeScript contracts
- Zod validation
- JWT authentication
- Encrypted contact PII at rest
- Deterministic rule-based matching
- AI enrichment through Gemini REST API
- 24-hour in-memory AI caching
- Fallback behavior when AI is unavailable
- Vitest coverage for the matching AI and email-intro services

The AI layer enhances the deterministic matching engine. It does not replace the rule engine.

## Demo Login

```text
Email:    matchmaker@thedatecrew.com
Password: TDC2024!
```

## Current Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Shared contracts | TypeScript types in `shared/types` |
| Auth | JWT in `httpOnly` cookies, bcrypt password hashing |
| Validation | Zod request schemas |
| Security middleware | Helmet, CORS allowlist, rate limiting |
| PII encryption | AES-256-GCM for seeded email and phone fields |
| AI provider | Gemini REST API |
| Default AI model | `gemini-3-flash-live` |
| Data store | In-memory MVP store seeded with 120 matrimonial profiles |
| Tests | Vitest |
| Linting | ESLint flat config |
| Deployment targets | Backend on Render, frontend on Vercel |

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
|   |-- tsconfig.json
|   `-- vitest.config.ts
|-- frontend/
|   |-- src/
|   |   |-- app/             # Next.js app routes
|   |   |-- components/      # Dashboard, customer, matching, layout, UI
|   |   `-- lib/             # API client, frontend types, utilities
|   |-- package.json
|   |-- next.config.mjs
|   `-- tailwind.config.ts
|-- shared/
|   `-- types/               # Shared Profile, MatchResult, API response types
|-- TDC_Matchmaker_System_Design.md
|-- package.json
`-- README.md
```

## Product Flow

1. A matchmaker signs in with the demo account.
2. The backend validates credentials and sets a JWT session cookie.
3. The dashboard loads assigned customers from `/api/customers`.
4. The matchmaker opens a customer detail page.
5. The detail page shows full biodata, notes, status controls, and match recommendations.
6. The matching panel calls `/api/customers/:id/matches`.
7. The backend applies deterministic hard filters and rule scoring.
8. The backend enriches each selected match with AI scoring, explanation, strengths, concerns, reasoning, and suggested next step.
9. The matchmaker can generate a short personalized email introduction for a match.
10. The matchmaker can send the match through the existing send-match flow.
11. The backend records sent matches and logs a mock email for MVP purposes.
12. Notes and sent match records stay in memory for the server lifetime.

## Main Features

### Authentication

- Seeded demo matchmaker users.
- Passwords are hashed with bcrypt.
- Login issues a JWT with an 8-hour expiry.
- JWT is stored in an `httpOnly` cookie.
- Login is rate-limited to 5 attempts per 15 minutes.
- Logout clears the cookie.
- Protected routes require a valid cookie or bearer token.

### Dashboard

- Shows assigned customer summaries.
- Displays name, computed age, city, marital status, and journey status.
- Supports search by name.
- Supports filtering by city and status.
- Supports sorting by name, age, and status.
- Shows an empty state when no customers match the current filters.

### Customer Biodata

The customer detail page exposes the full profile model to the authenticated matchmaker:

- Personal: first name, last name, gender, date of birth, computed age
- Location: country, city, relocation preference
- Physical: height, body type, physical disability if present
- Contact: decrypted email and phone number
- Education: undergraduate college, degree, postgraduate degree
- Career: income range, current company, designation, profession
- Family: marital status, siblings, parents' occupations, family type
- Cultural: religion, caste, sub-caste, mother tongue, known languages
- Lifestyle: kids, pets, diet, drinking, smoking, hobbies
- Preferences: age range, preferred cities, preferred religion, dealbreakers
- Profile: bio, profile photo URL, verification date

Contact PII is decrypted only for authenticated matchmaker-facing responses. It is not sent to Gemini.

### Notes

- Notes are scoped to a customer.
- Each note stores body, timestamp, matchmaker ID, and matchmaker name.
- Notes are returned reverse chronologically.
- Note body is required.
- Note body is capped at 1000 characters.
- Notes are stored in memory and reset on backend restart.

### Status Updates

Customer journey statuses:

- `New Lead`
- `In Progress`
- `Matched`
- `On Hold`
- `Closed`

Status updates are handled by `PATCH /api/customers/:id/status`.

### Send Match

- Match cards keep the existing `Send Match` button.
- The frontend opens a confirmation modal before sending.
- The backend validates ownership and candidate existence.
- Duplicate sends for the same customer/candidate pair return `409 Conflict`.
- Successful sends return `202 Accepted`.
- The backend records the sent match in memory.
- A mock email is logged to the backend console.

## Matching Engine

The matching pipeline is intentionally split into deterministic matching plus AI enrichment:

```text
Rule-based hard filters
-> Rule-based compatibility scoring
-> AI enrichment
-> Weighted final score
-> Ranked match cards
```

### Hard Filters

Candidates are filtered before scoring:

- Opposite gender
- Marital status compatibility
- No direct dealbreaker conflict
- Candidate age inside the customer's preferred age range

### Rule Scoring

Rule scores are deterministic and remain part of the final score.

For male customers, the rule engine emphasizes:

- Age gap preference
- Candidate income compared with customer income
- Height compatibility
- Children preference alignment
- Religion compatibility
- Caste compatibility
- City proximity
- Language overlap
- Lifestyle alignment

For female customers, the rule engine emphasizes:

- Profession and career stability
- Kids, relocation, and pets alignment
- Education parity or higher
- Religion compatibility
- City or relocation compatibility
- Age compatibility
- Caste compatibility
- Lifestyle alignment
- Language overlap

### Final Score Formula

The final score is calculated in `backend/src/services/matching.service.ts`:

```text
finalScore = round(0.4 * ruleScore + 0.6 * aiScore)
```

Scores are clamped to the 0-100 range before the weighted calculation.

## AI Match Scoring

The AI scoring service lives in:

```text
backend/src/services/ai.service.ts
```

Each enriched match returns this shape:

```ts
{
  aiScore: number;
  label: "High Potential" | "Good Match" | "Worth Exploring" | "Low Compatibility";
  explanation: string;
  strengths: string[];
  concerns: string[];
  reasoning: string;
  suggestedNextStep: string;
  aiUnavailable?: boolean;
}
```

### AI Score Labels

The deterministic fallback label mapping is:

| Score | Label |
| --- | --- |
| 80-100 | `High Potential` |
| 60-79 | `Good Match` |
| 40-59 | `Worth Exploring` |
| 0-39 | `Low Compatibility` |

### AI Prompt Rules

Gemini prompts are built to:

- Return valid JSON only.
- Avoid markdown and code fences.
- Use only provided profile data.
- Ignore missing fields.
- Avoid deterministic claims about compatibility.
- Avoid casteist, sexist, offensive, or unsupported assumptions.
- Treat religion and caste only as supplied preference data.
- Phrase recommendations as matchmaker-supportive suggestions.
- Exclude contact PII, session data, internal notes, and private hidden fields.

### AI Fallback Behavior

If Gemini is unavailable, the API key is missing, the response is empty, or JSON parsing fails:

- The backend does not crash.
- `aiScore` falls back to the deterministic `ruleScore`.
- `label` is derived from the score.
- `explanation`, `strengths`, `concerns`, `reasoning`, and `suggestedNextStep` are generated deterministically.
- `aiUnavailable: true` is returned.

## Email Intro Generation

The email intro AI service lives in:

```text
backend/src/services/emailIntroAi.service.ts
```

It generates a short, matchmaker-friendly introduction for a customer/candidate pair.

Input context:

```ts
{
  customerProfile;
  candidateProfile;
  matchExplanation;
  strengths;
}
```

Response shape:

```ts
{
  subject: string;
  intro: string;
  cached: boolean;
  aiUnavailable?: boolean;
}
```

### Email Intro Rules

The generated intro must:

- Be under 120 words.
- Use a warm, respectful, professional tone.
- Mention the candidate first name.
- Mention candidate city, profession, or designation when available.
- Mention 2 to 3 compatibility highlights.
- Avoid last names.
- Avoid email, phone, income, internal notes, JWT/session data, and private biodata.
- Return strict JSON only.

### Email Intro Fallback

If Gemini fails, the endpoint returns:

```ts
{
  subject: "A potential match we think you may like",
  intro: "We found a profile that may align well with your preferences. Please review the match details before proceeding.",
  aiUnavailable: true
}
```

The route response also includes `cached`.

## AI Privacy Rules

Before profile data is sent to Gemini, it is sanitized.

Allowed fields:

```text
firstName
age
gender
city
country
height
education
degree
profession
designation
maritalStatus
languagesKnown
religion
caste
wantKids
openToRelocate
openToPets
diet
smoking
drinking
hobbies
preferredCities
preferredReligion
dealbreakers
bio
```

Never sent to Gemini:

```text
lastName
email
phoneNumber
income
currentCompany
internal notes
JWT/session data
matchmaker data
encrypted PII
private hidden biodata
```

The sanitizer also redacts email-like and phone-like patterns if they appear inside allowed text fields such as `bio` or `dealbreakers`.

## AI Caching

The MVP uses an in-memory cache in `backend/src/data/store.ts`.

Cache keys:

```text
match_score:{customerId}:{candidateId}
email_intro:{customerId}:{candidateId}
```

TTL:

```text
24 hours
```

Cache behavior:

- Existing cached AI match scores are reused.
- Existing cached email intros are reused.
- Expired entries are ignored and removed lazily.
- Cache resets when the backend restarts.

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
| `PATCH` | `/api/customers/:id/status` | Yes | Update customer journey status |
| `GET` | `/api/customers/:id/matches?limit=10` | Yes | Generate ranked matches |
| `POST` | `/api/customers/:id/matches/:candidateId/email-intro` | Yes | Generate a personalized email intro |
| `POST` | `/api/customers/:id/send-match` | Yes | Send a match introduction |
| `GET` | `/api/customers/:id/notes` | Yes | Fetch notes |
| `POST` | `/api/customers/:id/notes` | Yes | Add note |
| `GET` | `/api/profiles/pool?gender=Male` | Yes | Fetch matching pool candidates |

### `GET /api/customers/:id/matches`

Returns:

```ts
{
  matches: MatchResult[];
  fromCache: boolean;
}
```

Each `MatchResult` includes:

```ts
{
  candidateId: string;
  candidate: Profile;
  ruleScore: number;
  aiScore: number;
  finalScore: number;
  label: MatchLabel;
  explanation: string;
  strengths: string[];
  concerns: string[];
  reasoning: string;
  suggestedNextStep: string;
  aiUnavailable?: boolean;
  sentAt?: string;
}
```

### `POST /api/customers/:id/matches/:candidateId/email-intro`

Returns:

```ts
{
  subject: string;
  intro: string;
  cached: boolean;
  aiUnavailable?: boolean;
}
```

### `POST /api/customers/:id/send-match`

Request:

```ts
{
  candidateId: string;
}
```

Returns `202 Accepted`:

```ts
{
  message: string;
  matchId: string;
}
```

## Frontend Match UI

Match cards show:

- Candidate photo and summary
- Rule score
- AI score
- Final score
- Label badge
- Short explanation
- Strengths
- Concerns
- Natural language reasoning
- Suggested next step
- `Generate Email Intro` button
- `Send Match` button

`Generate Email Intro` opens a modal with:

- Subject
- Intro body
- Cache/fallback indicator
- Copy-to-clipboard button

The existing `Send Match` modal and flow are preserved.

## Local Setup

Install dependencies:

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
GEMINI_MODEL=gemini-3-flash-live
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

Run both apps from the repo root:

```bash
npm run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health through frontend proxy: `http://localhost:3000/api/health`

## Common Commands

From the repo root:

```bash
npm run dev
npm run build
npm run lint
npm test
```

Backend only:

```bash
cd backend
npm run dev
npm run build
npm run lint
npm run test
```

Frontend only:

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

## Testing

Vitest tests currently cover:

- Helper utilities
- AI match response parsing
- Invalid Gemini JSON fallback
- Missing Gemini API key fallback
- Email intro generation
- Email intro cache hit
- Email intro cache miss
- PII sanitization
- Final score calculation

Run tests:

```bash
npm test
```

Run all quality checks:

```bash
npm run build
npm run lint
npm test
```

## Frontend API Proxy

The frontend calls same-origin `/api/*` routes. `frontend/next.config.mjs` rewrites those requests to the backend:

```text
/api/:path* -> API_PROXY_TARGET/api/:path*
```

This keeps browser requests same-origin with the frontend deployment. It is important for session cookies in production.

## Deployment

### Backend On Render

Create a Render Web Service from this GitHub repo.

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
GEMINI_MODEL=gemini-3-flash-live
ENCRYPTION_KEY=replace-with-strong-secret
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

Do not set `PORT`; Render injects it automatically.

Health check:

```bash
curl https://your-render-service.onrender.com/api/health
```

### Frontend On Vercel

Create a Vercel project from this GitHub repo.

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

Redeploy Vercel after changing environment variables. Next.js rewrites are resolved at build/deploy time.

## Security Notes

- Never commit `backend/.env`.
- `GEMINI_API_KEY`, `JWT_SECRET`, and `ENCRYPTION_KEY` belong in deployment environment variables.
- No frontend code reads or uses the Gemini API key.
- Email and phone fields are encrypted at seed time with AES-256-GCM.
- Decrypted contact PII is returned only through authenticated matchmaker routes.
- Contact PII is not sent to Gemini prompts.
- AI prompts are built from sanitized profile objects only.
- CORS should be restricted to the deployed frontend domain in production.
- The MVP uses static seeded data and in-memory records; use a real database before production customer usage.

## Troubleshooting

### Dashboard Stuck On Loading Customers

Likely causes:

- Vercel was not redeployed after changing env vars.
- `API_PROXY_TARGET` is missing or points to the wrong backend URL.
- Render backend is asleep or failing health checks.
- Render `CORS_ORIGIN` does not match the Vercel production domain.

Check:

```bash
curl https://your-vercel-domain.vercel.app/api/health
```

If this fails, the Vercel rewrite is not reaching the backend.

### Login Redirects Back To Login

Likely causes:

- Frontend is calling the backend directly instead of same-origin `/api`.
- Vercel deploy still has an old client bundle.
- Backend cookie settings are wrong for production.

Expected production cookie behavior:

```text
HttpOnly; Secure; SameSite=None
```

### Gemini Returns Invalid JSON

The AI service:

- Requests JSON-only output.
- Strips code fences if present.
- Extracts the first JSON object if surrounding text is present.
- Falls back to deterministic scoring if parsing still fails.

### Gemini Is Unavailable Or Rate Limited

The API should still respond:

- Match scoring returns deterministic fallback fields and `aiUnavailable: true`.
- Email intro returns the fallback subject and intro with `aiUnavailable: true`.
- The endpoint does not crash because of Gemini failures.

### Notes Or Sent Matches Disappear

This is expected in the MVP. Notes, sent matches, and AI cache entries are stored in memory and reset when the backend restarts.

### Render TypeScript Build Cannot Find Node Types

The backend keeps TypeScript and required `@types/*` packages in `dependencies`, so this should pass:

```bash
cd backend
npm ci --omit=dev
npm run build
```

## MVP Limitations

- No persistent database.
- No real SMTP provider.
- No persistent AI cache.
- No multi-matchmaker admin console.
- No real profile import pipeline.
- Matching weights are hardcoded.
- AI scoring is synchronous for MVP simplicity.
- Sent match history resets on backend restart.
- Notes reset on backend restart.

## Recommended Production Upgrades

- Move users, profiles, notes, sent matches, and AI cache to PostgreSQL or Firestore.
- Use Redis or another TTL cache for AI responses.
- Store sent match records append-only.
- Add a real email provider such as SES, SendGrid, or Resend.
- Add background jobs for email delivery and AI enrichment.
- Add audit logging for PII access.
- Add audit logging for AI prompt and response metadata without storing PII.
- Add role-based access for senior matchmakers and admins.
- Add configurable matching weights.
- Add feature flags for AI model/provider selection.
- Add E2E tests for login, dashboard, customer detail, notes, matching, email intro, and send-match.
- Add observability for AI latency, fallback rate, and cache hit rate.
