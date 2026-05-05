# LexaAI — Legal Judgment Board Backend

## Project Structure
```
legal-ai/
├── server.js               ← Express app, sessions, Passport, route mounting
├── config/
│   ├── db.js               ← MongoDB connection
│   └── passport.js         ← Local + Google strategies, serialize/deserialize
├── models/
│   ├── User.js             ← roles: public / lawyer / admin
│   ├── Judgment.js         ← judgment data + AI summary + ratings
│   └── Review.js           ← reviews + replies + upvotes
├── routes/
│   ├── auth.js             ← register, login, logout, /me, Google OAuth
│   ├── judgments.js        ← list, detail, rate, add (admin), summarize
│   └── reviews.js          ← post review, reply, upvote, delete
├── middleware/
│   └── auth.js             ← isLoggedIn, isAdmin, isLawyerOrAdmin
└── scripts/
    ├── summarize.js        ← OpenAI summarization + IndianKanoon fetcher
    └── seedJudgments.js    ← Seed sample data for dev
```

## Setup
```bash
cp .env.example .env      # fill in your values
npm install
npm run seed              # populate dev DB with sample judgments
npm run dev               # nodemon server.js
```

## API Reference

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | Public | Register (name, email, password, role?) |
| POST | /api/auth/login | Public | Login (email, password) |
| POST | /api/auth/logout | Any | End session |
| GET | /api/auth/me | 🔒 Login | Get current user |
| GET | /api/auth/google | Public | Google OAuth start |

### Judgments
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/judgments | Public | List (filter: court, month, year, subject, sort) |
| GET | /api/judgments/:id | Public | Get detail + AI summary |
| POST | /api/judgments/:id/rate | 🔒 Login | Rate 1–10 |
| POST | /api/judgments | 🔐 Admin | Add judgment |
| POST | /api/judgments/:id/summarize | 🔐 Admin | Re-run AI summary |

### Reviews
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/judgments/:id/reviews | Public | Get reviews (sort: recent/top/highest/lowest) |
| POST | /api/judgments/:id/reviews | 🔒 Login | Post a review (body + rating required) |
| POST | /api/judgments/:id/reviews/:rid/reply | 🔒 Login | Reply to a review |
| POST | /api/judgments/:id/reviews/:rid/upvote | 🔒 Login | Toggle upvote |
| DELETE | /api/judgments/:id/reviews/:rid | 🔒 Owner/Admin | Soft delete |

## How AI Summaries Work

### Step 1 — Get the judgment text
- **Easiest (MVP):** Admin pastes the text manually when adding a judgment
- **Better:** Use IndianKanoon API (`INDIANKANOON_API_KEY` in .env) — see `scripts/summarize.js`
- **Best (later):** Scheduled cron job that auto-fetches last month's judgments weekly

### Step 2 — Summarization pipeline
When `rawText` is present, `generateAISummary(judgmentId)` is called:
1. Text is truncated to ~12,000 chars (context-safe)
2. Sent to GPT-4o with a strict Indian legal prompt
3. Response is JSON: `{ summary, keyPoints, precedentsCited }`
4. Saved to `judgment.aiSummary` in MongoDB
5. Frontend reads `aiSummary.text` — never `rawText`

### Step 3 — Hallucination protection
- `temperature: 0.2` — low creativity, high factualness
- Prompt says: "Never fabricate case names"
- `response_format: json_object` — forces structured output
- Later: add RAG so the LLM reads from stored judgment text, not memory

## Role System
- `public` — read summaries, rate, post reviews, reply, upvote
- `lawyer` — same as public + future: access AI contract review tool
- `admin` — add/edit judgments, trigger AI summarization, delete any review
