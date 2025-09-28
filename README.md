# Agora

A full-stack outreach tool to find relevant people, score warmth, and send personalized messages via LinkedIn or email. LinkedIn-only authentication with popup OAuth.

## Stack
- Next.js 14 (App Router) + Tailwind CSS (apps/web)
- Fastify + Prisma (apps/api)
- Redis (queues later), Postgres (optional for local demo)
- Apollo API (optional) for people search + email discovery
- AgentMail API (optional) for sending/tracking
- pgvector (optional) for semantic search/scoring

## Prerequisites
- Node.js 18+
- npm 10+
- Optional: Docker Desktop (for local Postgres/Redis)

## Quick Start (no Docker required)

1) Install dependencies
```
npm install
```

2) Configure LinkedIn OAuth (required)
Create `apps/web/.env.local` (do not commit) with:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me-long-random
LINKEDIN_CLIENT_ID=your_linkedin_app_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_app_client_secret
```
LinkedIn App settings:
- Redirect URL: `http://localhost:3000/api/auth/callback/linkedin`
- Scopes: `r_liteprofile r_emailaddress`

3) Run dev (web + api)
```
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/health

4) Sign in with LinkedIn (popup)
- Click "Sign in" in the top-right navbar. A popup opens for LinkedIn OAuth.
- On success, the popup closes and the main window refreshes as signed-in.

## Optional: Database + Redis
If you want DB-backed features locally, start infra (Postgres with pgvector + Redis):
```
npm run db:up
```
Then in another terminal:
```
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

To stop infra:
```
npm run db:down
```

## Development Modes
- If `APOLLO_API_KEY` or `AGENTMAIL_API_KEY` are missing, integrations run in mock mode.
- You can still search, score, draft messages, and simulate sending.

## Packages
- `packages/shared` – shared types and utilities
- `packages/providers/apollo` – Apollo wrapper (mock fallback)
- `packages/providers/agentmail` – AgentMail wrapper (mock fallback)
- `packages/llm` – message drafting helpers
- `packages/scoring` – feature extraction and scoring

## Chrome Extension (optional)
See `packages/extension/` for Manifest V3 code to scrape LinkedIn client-side and autofill DMs.

## Scripts
- `npm run db:up` / `npm run db:down` – start/stop infra
- `npm run dev` – run web and api in parallel
- `npm run build` / `npm start` – build and run

## Troubleshooting
- Ports in use (3000, 4000): make sure no other dev servers are running; restart terminal if needed.
- NextAuth warning `[NEXTAUTH_URL]`: set `NEXTAUTH_URL` in `apps/web/.env.local`.
- LinkedIn popup doesn’t close: ensure redirect URL is exactly `http://localhost:3000/api/auth/callback/linkedin` in your LinkedIn app.
- Module not found after installing a package: stop dev, run `npm install`, start `npm run dev` again.
# MHacks
