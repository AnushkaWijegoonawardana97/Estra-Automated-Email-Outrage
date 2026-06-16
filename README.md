# Estra Cold Email Outreach

Automated cold email pipeline for **Estra** (`hello@estradigital.co.uk`).

## Monorepo structure

```
├── dashboard/     # Next.js dashboard + API (Vercel)
├── pipeline/      # Python scraper/enricher/sender (Render cron)
├── scripts/       # Shared utilities (seed config)
└── render.yaml    # Render cron job blueprint
```

## Phase 0 — External setup (manual)

Complete these before running locally:

1. **MongoDB Atlas** — M0 cluster, database `estra`, user `estra_app` → `MONGODB_URI`
2. **Brevo** — verify `estradigital.co.uk` (SPF/DKIM/DMARC), get `BREVO_API_KEY`
3. **Anthropic** — get `ANTHROPIC_API_KEY` for Claude Haiku
4. Copy [`.env.example`](.env.example) → `dashboard/.env.local` and `pipeline/.env`

### DNS (estradigital.co.uk)

```
SPF:   v=spf1 include:sendinblue.com ~all
DMARC: v=DMARC1; p=none; rua=mailto:hello@estradigital.co.uk
DKIM:  (from Brevo dashboard)
```

## Local development

```bash
# Install
pnpm install
pnpm approve-builds --all   # first-time only (pnpm 11 blocks install scripts)
cd pipeline && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Seed default config (requires MONGODB_URI in dashboard/.env.local)
pnpm seed

# Dashboard (http://localhost:3000 — basic auth)
pnpm dev

# Pipeline (manual run)
pnpm pipeline              # full: scrape → enrich → send
pnpm pipeline:send         # send only (enriched leads with email)
pnpm pipeline:retry        # retry failed enrich + unsent leads
pnpm pipeline:jobs         # process one pending dashboard job
pnpm follow-up
```

Use the **Activity** page to trigger pipeline steps from the dashboard (local dev runs jobs immediately; production uses the 5-minute Render cron).

## Deploy

### Vercel (dashboard)

- Root directory: `dashboard/`
- Env: `MONGODB_URI`, `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, `NEXT_PUBLIC_APP_URL`

### Render (pipeline)

- Use [`render.yaml`](render.yaml) or create two cron jobs
- Env: `MONGODB_URI`, `ANTHROPIC_API_KEY`, `BREVO_API_KEY`, `APP_URL`

### Brevo webhook

Point to: `https://<your-vercel-url>/api/webhook/brevo`

## Email warm-up schedule

| Week | Daily cap |
|------|-----------|
| 1    | 10–20     |
| 2    | 30        |
| 3+   | up to 50  |
