# Deployment Guide

## Vercel (Dashboard)

1. Push repo to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. **Root Directory:** `dashboard`
4. **Install Command:** `cd .. && pnpm install`
5. Environment variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DASHBOARD_USER` | Basic auth username |
| `DASHBOARD_PASSWORD` | Basic auth password |
| `NEXT_PUBLIC_APP_URL` | Production URL, e.g. `https://your-app.vercel.app` |
| `CSC_API_KEY` | Country State City API key for Settings geo pickers ([app.countrystatecity.in](https://app.countrystatecity.in)) |

6. Deploy, then run seed once locally: `pnpm seed`

## Render (Pipeline)

Option A — Blueprint:

```bash
# Connect repo in Render dashboard and apply render.yaml
```

Option B — Manual cron jobs:

| Name | Schedule | Root Dir | Start Command |
|------|----------|----------|---------------|
| estra-daily-pipeline | `0 2 * * *` | `pipeline` | `python main.py` |
| estra-pipeline-jobs | `*/5 * * * *` | `pipeline` | `python job_runner.py` |
| estra-daily-follow-up | `0 3 * * *` | `pipeline` | `python follow_up.py` |

Environment variables: `MONGODB_URI`, `ANTHROPIC_API_KEY`, `BREVO_API_KEY`, `APP_URL`

Build command: `pip install -r requirements.txt && playwright install chromium`

## Brevo Webhook

After Vercel deploy:

1. Brevo → Settings → Webhooks
2. URL: `https://<vercel-url>/api/webhook/brevo`
3. Events: opened, unsubscribed, hard_bounce, soft_bounce

## E2E Checklist

- [ ] `pnpm seed` inserts config document
- [ ] Dashboard loads with basic auth
- [ ] Settings save target markets
- [ ] `pnpm pipeline` scrapes → enriches → sends immediately (no send-hour window)
- [ ] Activity page → Run pipeline → job completes
- [ ] Click tracked link → event in `/emails`
- [ ] Unsubscribe link → suppression list updated
- [ ] `pnpm follow-up` sends follow-up when delays met

## Email Warm-up

| Week | Daily volume |
|------|--------------|
| 1 | 10–20 |
| 2 | 30 |
| 3+ | up to `maxEmailsPerDay` (50) |

Pause sending if Brevo bounce rate exceeds 5%.
