# TDC Matchmaker Platform

AI-assisted matrimonial matchmaker console for The Date Crew.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Express, TypeScript, JWT cookies, Zod validation
- Data: in-memory MVP store seeded with 120 Indian matrimonial profiles
- AI: Gemini `gemini-flash-latest` with cached scoring and rule-based fallback

## Demo Login

- Email: `matchmaker@thedatecrew.com`
- Password: `TDC2024!`

## Local Setup

Install dependencies in each package:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

Optional backend environment:

```bash
PORT=4000
JWT_SECRET=replace-me
JWT_EXPIRES_IN=8h
ENCRYPTION_KEY=replace-with-strong-secret
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-latest
CORS_ORIGIN=http://localhost:3000
```

Run both apps:

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`; backend runs at `http://localhost:4000`.

## Verification

```bash
npm run build
npm run lint
npm test
```

## MVP Notes

- Notes, sent matches, profile pool, and AI cache are in memory and reset on server restart.
- Email is mocked and logged to the backend console.
- If `GEMINI_API_KEY` is missing or rejected, match scoring falls back to deterministic rule-based explanations.
