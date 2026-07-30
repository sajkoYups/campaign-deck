# CampaignDeck

Open-source, self-hosted campaign link management and lightweight campaign analytics.

CampaignDeck is the source of truth for marketing links — and for basic campaign performance.

Think: GitHub Issues for marketing links.

## Features

- Email/password authentication
- Workspace → Client → Campaign → Link hierarchy
- Automatic and custom short URL slugs
- Fast redirects at `/r/:slug` with non-blocking click tracking
- QR code generation, placement metadata, and PNG download
- UTM builder + workspace UTM naming rules
- Campaign and link analytics (clicks, uniques, countries, referrers, devices)
- Daily pre-aggregated statistics for fast dashboards
- CSV export for campaign analytics
- Global search (including UTM fields and QR placement)
- Docker Compose self-hosting

## Quick start (Docker)

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET to a long random value
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000), register, and create your first client.

## Local development

```bash
cp .env.example .env
docker compose up db -d
npm install
npx prisma migrate deploy
npm run dev
```

## Analytics notes

- Redirects stay fast: click recording runs in `after()` after the 302 response.
- Visitor identity is a hash of IP + User-Agent. Raw IPs are never stored.
- Obvious bots (Googlebot, Slack, Discord, social crawlers, etc.) are ignored.
- Dashboards read from `DailyLinkStatistic`; breakdowns sample `ClickEvent`.

## API overview

- `GET/POST /api/clients`
- `GET/POST /api/campaigns`
- `GET/POST /api/links`
- `GET /api/analytics/dashboard`
- `GET /api/analytics/campaign/:id`
- `GET /api/analytics/link/:id`
- `GET /api/export/campaign/:id`
- `POST /api/utm/validate`
- `GET/PATCH /api/settings/utm`
- `GET /api/search?q=`
- `GET /r/:slug`

## License

MIT — see [LICENSE](LICENSE).
