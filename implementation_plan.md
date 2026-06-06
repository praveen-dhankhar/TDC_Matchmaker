# TDC Matchmaker Platform — Implementation Plan

## Phase 1: Requirements Analysis

---

## Goal

Decompose the assignment specification and system design into an actionable, phase-gated implementation plan that leaves zero ambiguity for execution. Every feature, field, API endpoint, data structure, and quality gate is mapped here before a single line of code is written.

---

## 1. Functional Requirements Breakdown

### FR-1: Matchmaker Authentication
| Requirement | Detail |
|---|---|
| Login screen | Username (email) + password form |
| Auth mechanism | JWT issued on successful login, stored in `httpOnly` cookie |
| Session duration | 8 hours, then re-auth |
| Rate limiting | 5 login attempts per 15 minutes per IP |
| Credentials for demo | `matchmaker@thedatecrew.com` / `TDC2024!` |
| Logout | Clear JWT cookie, redirect to login |

### FR-2: Dashboard — Customer List
| Requirement | Detail |
|---|---|
| Data displayed | Name, Age (computed from DOB), City, Marital Status, Status Tag |
| Status tags | `New Lead`, `In Progress`, `Matched`, `On Hold`, `Closed` |
| Sorting | By name (A-Z), by age, by status |
| Search/filter | By name substring, by city, by status tag |
| Click action | Navigate to `/customers/:id` detailed view |
| Empty state | Graceful "No customers assigned" message |
| Load time | < 1 second |

### FR-3: Customer Detailed Biodata View
Full biodata with **30+ fields** as specified:

| Category | Fields |
|---|---|
| **Personal** | firstName, lastName, gender, dateOfBirth, age (computed) |
| **Location** | country, city, openToRelocate (Yes/No/Maybe) |
| **Physical** | height (cm), bodyType, physicalDisability (if any) |
| **Contact** | email (encrypted), phoneNumber (encrypted) |
| **Education** | undergraduateCollege, degree, postgraduateDegree |
| **Career** | income (range), currentCompany, designation, profession |
| **Family** | maritalStatus, siblings, fatherOccupation, motherOccupation, familyType (Joint/Nuclear) |
| **Cultural** | caste, subCaste, religion, motherTongue, languagesKnown[] |
| **Lifestyle** | wantKids (Yes/No/Maybe), openToPets (Yes/No/Maybe), diet (Veg/Non-Veg/Eggetarian/Vegan), drinking, smoking |
| **Preferences** | preferredAgeRange, preferredCities[], preferredReligion[], dealbreakers[] |
| **Profile** | bio (short paragraph), hobbies[], profilePhotoUrl, verifiedAt |

> [!NOTE]
> Indian matchmaking-specific fields added beyond the spec: `subCaste`, `motherTongue`, `familyType`, `fatherOccupation`, `motherOccupation`, `diet`, `drinking`, `smoking`, `bodyType`, `postgraduateDegree`, `profession`, `preferredAgeRange`, `preferredCities`, `preferredReligion`, `dealbreakers`, `hobbies`, `bio`.

### FR-4: Dummy Profile Pool
| Requirement | Detail |
|---|---|
| Count | 120 profiles (60 male, 60 female) |
| Generation | Seeded at server start from static JSON |
| Realism | Indian names, cities (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata, Jaipur, Ahmedabad, Lucknow), realistic income ranges, actual college names |
| Diversity | Mix of religions, castes, professions, age ranges (22–38) |
| Gender split | Used for opposite-gender matching pool |

### FR-5: Gender-Specific Matching Algorithm
| Gender | Logic |
|---|---|
| **Male customer** | Match with women who are: younger (1–5 years), earn less or equal, shorter (by at least 2cm), have matching views on children, same or compatible religion/caste preferences |
| **Female customer** | Match on: profession compatibility (stable career), shared values on relocation, lifestyle alignment (diet, pets, kids), education parity or higher, city proximity, caste/religion compatibility |
| **Shared filters** | Marital status compatibility, language overlap, no dealbreaker conflicts |
| **Scoring** | Rule-based compatibility score (0–100) computed first, then top-N sent to AI for enrichment |

### FR-6: AI Match Scoring (Gemini)
| Requirement | Detail |
|---|---|
| Model | `gemini-flash-latest` |
| Input | Customer profile + candidate profile (JSON summaries) |
| Output | Score (0–100), label (`High Potential` / `Good Match` / `Worth Exploring` / `Low Compatibility`), explanation (2–3 sentences) |
| Caching | Cache by `(customer_id, candidate_id)` — same pair always returns cached score |
| Fallback | If Gemini fails, return rule-based score with label "Score based on compatibility rules" |
| Latency target | < 3 seconds per scoring call |

### FR-7: Send Match Action
| Requirement | Detail |
|---|---|
| Trigger | "Send Match" button on each match card |
| Action | Fire-and-forget POST → server returns 202 |
| UI feedback | Success toast with match name + "Match sent successfully!" |
| Modal | Show match profile summary before confirming send |
| Mock email | Log email content to console (no real SMTP in MVP) |
| Content | Customer name, match name, AI score, explanation, basic profile info |

### FR-8: Quick Notes
| Requirement | Detail |
|---|---|
| View | Collapsible notes panel on customer detail page |
| Create | Text area + "Add Note" button |
| Display | Reverse chronological, with timestamp and matchmaker name |
| Persistence | In-memory for MVP (lost on server restart) |
| Validation | Non-empty body, max 1000 characters |

### FR-9: Status Update
| Requirement | Detail |
|---|---|
| Action | Dropdown/tag selector on customer detail page |
| Options | `New Lead`, `In Progress`, `Matched`, `On Hold`, `Closed` |
| Persistence | PATCH request, updates in-memory store |

---

## 2. Non-Functional Requirements

| NFR | Target | Implementation |
|---|---|---|
| Dashboard load | < 1 second | Static JSON in memory, no DB calls |
| Match scoring | < 3 seconds | Gemini `gemini-flash-latest` + result caching |
| Security — Auth | JWT + bcrypt | `httpOnly` cookie, 8h expiry |
| Security — PII | AES-256 at rest | Email, phone encrypted in static data |
| Security — CORS | Whitelist | Only deployed frontend domain |
| Security — Input | Zod validation | All POST/PATCH bodies validated |
| UI/UX | Clean, emotionally aligned | Tailwind + shadcn/ui, warm color palette, responsive |
| Code quality | Modular, readable | Clean architecture, SOLID, TypeScript strict mode |
| Monitoring | Health check | `GET /health` endpoint |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend — Next.js 14 + TypeScript + Tailwind + shadcn │
│  Pages: /login, /dashboard, /customers/[id]             │
│  Deployed on: Vercel                                    │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS (REST API calls)
┌─────────────────────▼───────────────────────────────────┐
│  Backend — Express + TypeScript                         │
│  Services: auth, profiles, matching, ai, notes, email   │
│  Deployed on: Render                                    │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
   Static JSON    Gemini API    In-Memory Cache
   (profiles,     (Gemini)      (scores, sessions)
    users)
```

---

## 4. Project Structure (Monorepo)

```
matchmaker/
├── frontend/                 # Next.js app
│   ├── src/
│   │   ├── app/              # App router pages
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   └── customers/[id]/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/           # shadcn components
│   │   │   ├── layout/       # Header, Sidebar, etc.
│   │   │   ├── dashboard/    # Customer list, filters
│   │   │   ├── customer/     # Biodata view, notes
│   │   │   └── matching/     # Match cards, scoring
│   │   ├── lib/              # API client, utils, types
│   │   ├── hooks/            # Custom React hooks
│   │   └── styles/           # Global styles
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
│
├── backend/                  # Express API
│   ├── src/
│   │   ├── config/           # env, cors, constants
│   │   ├── middleware/       # auth, validation, error
│   │   ├── routes/           # Express route handlers
│   │   ├── services/         # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── profile.service.ts
│   │   │   ├── matching.service.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── notes.service.ts
│   │   │   └── email.service.ts
│   │   ├── data/             # Static JSON files
│   │   │   ├── profiles.json
│   │   │   ├── users.json
│   │   │   └── seed.ts       # Profile generator
│   │   ├── types/            # Shared TypeScript types
│   │   ├── utils/            # Helpers, encryption
│   │   └── server.ts         # Express app entry
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                   # Shared types between FE/BE
│   └── types/
│       ├── profile.ts
│       ├── match.ts
│       ├── auth.ts
│       └── api.ts
│
└── README.md
```

---

## 5. API Contract

| # | Method | Path | Auth | Request Body | Response | Status |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/auth/login` | No | `{ email, password }` | `{ token, user }` | 200 / 401 |
| 2 | `POST` | `/api/auth/logout` | Yes | — | `{ message }` | 200 |
| 3 | `GET` | `/api/customers` | Yes | — | `{ customers: Profile[] }` | 200 |
| 4 | `GET` | `/api/customers/:id` | Yes | — | `{ customer: Profile }` | 200 / 404 |
| 5 | `GET` | `/api/customers/:id/matches` | Yes | `?limit=10` | `{ matches: MatchResult[] }` | 200 |
| 6 | `POST` | `/api/customers/:id/send-match` | Yes | `{ candidateId }` | `{ message }` | 202 |
| 7 | `GET` | `/api/customers/:id/notes` | Yes | — | `{ notes: Note[] }` | 200 |
| 8 | `POST` | `/api/customers/:id/notes` | Yes | `{ body }` | `{ note: Note }` | 201 |
| 9 | `PATCH` | `/api/customers/:id/status` | Yes | `{ status }` | `{ customer }` | 200 |
| 10 | `GET` | `/api/health` | No | — | `{ status: "ok" }` | 200 |

---

## 6. Data Model (TypeScript Interfaces)

```typescript
// Profile — 30+ fields
interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;          // ISO date
  country: string;
  city: string;
  height: number;               // in cm
  bodyType: string;
  email: string;                // encrypted at rest
  phoneNumber: string;          // encrypted at rest
  undergraduateCollege: string;
  degree: string;
  postgraduateDegree?: string;
  income: string;               // range bracket
  currentCompany: string;
  designation: string;
  profession: string;
  maritalStatus: 'Never Married' | 'Divorced' | 'Widowed' | 'Separated';
  languagesKnown: string[];
  siblings: number;
  caste: string;
  subCaste?: string;
  religion: string;
  motherTongue: string;
  familyType: 'Joint' | 'Nuclear';
  fatherOccupation: string;
  motherOccupation: string;
  wantKids: 'Yes' | 'No' | 'Maybe';
  openToRelocate: 'Yes' | 'No' | 'Maybe';
  openToPets: 'Yes' | 'No' | 'Maybe';
  diet: 'Vegetarian' | 'Non-Vegetarian' | 'Eggetarian' | 'Vegan';
  drinking: 'Never' | 'Occasionally' | 'Regularly';
  smoking: 'Never' | 'Occasionally' | 'Regularly';
  bio: string;
  hobbies: string[];
  profilePhotoUrl: string;
  verifiedAt: string;
  preferredAgeRange: { min: number; max: number };
  preferredCities: string[];
  preferredReligion: string[];
  dealbreakers: string[];
  // Matchmaker-assigned fields
  assignedMatchmakerId: string;
  status: 'New Lead' | 'In Progress' | 'Matched' | 'On Hold' | 'Closed';
}

interface MatchResult {
  candidateId: string;
  candidate: Profile;
  ruleScore: number;          // 0–100 from algo
  aiScore: number;            // 0–100 from Gemini
  label: 'High Potential' | 'Good Match' | 'Worth Exploring' | 'Low Compatibility';
  explanation: string;        // AI-generated
  sentAt?: string;            // null if not sent
}

interface Note {
  id: string;
  customerId: string;
  matchmakerId: string;
  body: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  assignedCustomerIds: string[];
}
```

---

## 7. Matching Algorithm Design

### Step 1: Pool Filtering (Hard Filters)
- Opposite gender
- Marital status compatibility
- No dealbreaker conflicts
- Age within preferred range

### Step 2: Compatibility Scoring (Soft Scoring — 0–100)

**For Male Customers (matching with female candidates):**

| Factor | Weight | Logic |
|---|---|---|
| Age gap | 20 | Prefer 1–5 years younger |
| Income | 10 | Candidate earns ≤ customer |
| Height | 10 | Candidate shorter by ≥ 2cm |
| Kids alignment | 15 | Exact match = full score |
| Religion match | 15 | Same religion = full |
| Caste compatibility | 10 | Same caste/sub-caste bonus |
| City proximity | 10 | Same city = full |
| Language overlap | 5 | ≥ 1 shared language |
| Lifestyle | 5 | Diet, smoking, drinking alignment |

**For Female Customers (matching with male candidates):**

| Factor | Weight | Logic |
|---|---|---|
| Profession/career | 20 | Stable profession bonus |
| Values alignment | 15 | Kids, relocate, pets match |
| Education parity | 15 | Equal or higher education |
| City/relocate | 10 | Same city or open to relocate |
| Religion match | 15 | Same religion = full |
| Caste compatibility | 5 | Same caste bonus |
| Age compatibility | 10 | Within preferred range |
| Lifestyle | 5 | Diet, habits alignment |
| Language overlap | 5 | ≥ 1 shared language |

### Step 3: AI Enrichment
- Top 10 candidates by rule score → sent to Gemini
- Gemini returns: AI score (0–100), label, natural language explanation
- Final ranking = `0.4 * ruleScore + 0.6 * aiScore`

---

## 8. Security Measures

| Layer | Implementation |
|---|---|
| Password hashing | bcrypt with salt rounds = 12 |
| JWT | `jsonwebtoken`, HS256, 8h expiry, `httpOnly` + `Secure` + `SameSite=Strict` cookie |
| PII encryption | AES-256-GCM for email/phone fields |
| CORS | `cors` middleware, origin whitelist |
| Rate limiting | `express-rate-limit`, 5 login attempts per 15 min |
| Input validation | Zod schemas on all request bodies |
| Helmet | `helmet` middleware for security headers |
| Ownership check | Middleware verifies matchmaker owns the customer on every `/customers/:id` route |

---

## 9. Phase Execution Plan

| Phase | Scope | Dependencies |
|---|---|---|
| **Phase 1** ✅ | Requirements Analysis (this document) | — |
| **Phase 2** | Architecture Design — finalize folder structure, dependency list, config files | Phase 1 |
| **Phase 3** | Project Structure — scaffold monorepo, install deps, configure TS/ESLint/Tailwind | Phase 2 |
| **Phase 4** | Database Design — create static JSON data files with 120 profiles, users, seed script | Phase 3 |
| **Phase 5** | API Design — implement Express routes, Zod schemas, middleware chain | Phase 4 |
| **Phase 6** | Backend Implementation — services (auth, profile, matching, AI, notes, email) | Phase 5 |
| **Phase 7** | Frontend Implementation — all pages, components, API client, responsive UI | Phase 6 |
| **Phase 8** | AI Integration — Gemini service, prompt engineering, caching, fallback | Phase 7 |
| **Phase 9** | Testing — unit tests, API tests, E2E smoke tests | Phase 8 |
| **Phase 10** | Deployment — Vercel (frontend) + Render (backend), env vars, CORS, final QA | Phase 9 |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Gemini API rate limits / downtime | Match scoring unavailable | Rule-based fallback scoring + cached results |
| Static JSON data loss on restart | Notes and match history lost | Document as MVP limitation; migration path to DB |
| PII exposure | Legal and ethical risk | AES-256 encryption, ownership middleware, no PII in logs |
| Cold start latency on Render free tier | First request slow (~30s) | Health check ping, loading spinner on frontend |
| Gender-specific logic bias | Ethical concern | Make configurable, document assumptions in write-up |
| Token budget on Gemini | Cost overrun | Cache aggressively, limit to top-10 candidates per request |

---

## 11. Verification Checklist (Phase 1)

- [x] All functional requirements from PDF spec mapped to features
- [x] All 30+ biodata fields documented with types
- [x] Indian matchmaking domain fields researched and added
- [x] Gender-specific matching logic fully specified
- [x] AI integration approach defined with fallback strategy
- [x] API contract covers all user flows
- [x] Data model supports all features
- [x] Security requirements mapped to specific implementations
- [x] Non-functional targets defined with measurable thresholds
- [x] Phased execution plan with dependencies
- [x] Risk register with mitigations

---

## Phase 1 Self-Review

### What was built
Complete requirements analysis covering all functional/non-functional requirements, data models, API contracts, matching algorithm design, security measures, and phased execution plan.

### What remains
Phases 2–10: Architecture design through deployment.

### Potential improvements
- Could add user personas and journey mapping for a richer UX design
- Could define Gemini prompt templates in this phase for earlier review
- Preference weights in matching algorithm could be configurable per matchmaker

### Technical debt introduced
None — this is a planning artifact only.

---

> [!IMPORTANT]
> **Awaiting your approval to proceed to Phase 2: Architecture Design.**
> Please review the requirements above and flag any corrections, additions, or questions before I begin implementation.
