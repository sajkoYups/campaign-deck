# CampaignDeck

Open-source, self-hosted campaign link management.

CampaignDeck is the source of truth for marketing links — organized by workspace, client, and campaign. It is **not** Bitly, analytics, or marketing automation.

Think: GitHub Issues for marketing links.

## Features (MVP)

- Email/password authentication
- Workspace → Client → Campaign → Link hierarchy
- Automatic and custom short URL slugs
- Fast redirects at `/r/:slug` (no tracking)
- QR code generation and PNG download
- Global search across clients, campaigns, and links
- Docker Compose self-hosting

## Quick start (Docker)

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET to a long random value
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000), register, and create your first client.

Install time target: under 10 minutes.

## Environment

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | Public base URL of the app |
| `APP_URL` | Yes | Public base URL (used for short links) |
| `SHORT_URL_BASE` | No | Defaults to `{APP_URL}/r` |

## Local development

Requirements: Node.js 22+, Docker (for Postgres).

```bash
cp .env.example .env
docker compose up db -d
npm install
npx prisma migrate dev
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

### Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run test         # Vitest unit tests
npm run lint         # ESLint
npm run db:migrate   # Prisma migrate (dev)
npm run db:generate  # Prisma generate
```

## Product model

```
Workspace
  └── Client
        └── Campaign
              └── Link
```

Campaigns are the primary object. Links never exist on their own.

Public redirects:

```
GET /r/summer/facebook  →  302 destinationUrl
```

No analytics. No cookies. No tracking.

## API overview

Authenticated REST endpoints:

- `GET/POST /api/clients`
- `GET/PATCH/DELETE /api/clients/:id`
- `GET/POST /api/campaigns`
- `GET/PATCH/DELETE /api/campaigns/:id`
- `GET/POST /api/links`
- `GET/PATCH/DELETE /api/links/:id`
- `GET /api/links/:id/qr`
- `GET /api/search?q=`
- `GET/PATCH /api/workspace`

Responses use `{ data }` on success and `{ error: { message } }` on failure.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- Better Auth (email/password)
- Docker Compose

## Contributing

1. Keep the MVP focused — see out-of-scope list in the product brief.
2. Prefer small, deep modules over shallow wrappers.
3. Add tests for validation and slug helpers when changing those areas.
4. Open a PR with a clear summary and test plan.

## License

MIT — see [LICENSE](LICENSE).
