# Axelri — Automated Cold Email Outreach System
### Solution Architecture Plan | estradigital.co.uk | Budget: <$10/month

---

## Overview

A fully automated pipeline that:
1. **Scrapes** businesses from Google Maps by location + category *(targets & queries set via Dashboard)*
2. **Filters** for rating ≥ 3.5 + missing/weak website *(configurable via Dashboard)*
3. **Enriches** each lead into a full business profile — contact info, domain details, services offered, opening hours, social presence, and a plain-English business summary fed directly into the email writer
4. **Generates** a personalised cold email using Axelri's positioning
5. **Sends** via your domain (hello@estradigital.co.uk) on a drip schedule
6. **Tracks** opens, clicks, link interactions, and replies per lead
7. **Follows up** automatically — no-reply leads get a generic follow-up; leads that clicked a specific service link get a targeted follow-up referencing that exact service
8. **Respects unsubscribes** — one-click unsubscribe on every email; unsubscribed addresses are permanently suppressed and never contacted again

All managed from a single web dashboard. Running on free/near-free tiers, costing **$0–$3/month**.

---

## Full Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Dashboard frontend** | Next.js 14 + TypeScript | Best-in-class Vercel support, App Router, server components |
| **Dashboard hosting** | Vercel (free tier) | Native Next.js platform, auto-deploy from GitHub, zero config |
| **API routes** | Next.js API Routes (TypeScript) | Built into Next.js — no separate backend needed for dashboard |
| **Pipeline scripts** | Python 3.11 | Best ecosystem for scraping, WHOIS, Playwright, AI |
| **Pipeline hosting** | Render (free tier) | Persistent background workers + cron jobs — Vercel can't do this |
| **Database** | MongoDB Atlas M0 (free, 512MB) | Flexible documents for varied lead/event data, free forever tier |
| **ODM / DB client** | `pymongo` (Python) + `mongoose` (Next.js) | Standard clients for each layer |
| **Scraper** | Python + `playwright-python` | Full browser automation for Google Maps |
| **Enricher** | Python — GMB + WHOIS + Hunter.io + Claude | Multi-source profile builder |
| **AI writer** | Anthropic Claude API — Haiku model | ~$0.001/email for personalisation |
| **Email sender** | Brevo free tier (300/day) | Free outbound, webhooks, open/click tracking |
| **Tracking endpoint** | Next.js API Route on Vercel | Click redirect + event write to MongoDB |
| **Unsubscribe endpoint** | Next.js API Route on Vercel | Token lookup + suppression write to MongoDB |
| **Cron jobs** | Render Cron Jobs (built-in) | Runs Python pipeline on schedule — free |
| **Styling** | Tailwind CSS | Ships with Next.js, utility-first, fast to build |
| **Email domain** | hello@estradigital.co.uk | Already owned |

**Total estimated monthly cost: $0.50–$3** (almost entirely Claude API for email personalisation)

---

## Architecture — How the Two Halves Connect

The application is split into two independently deployed parts that share one MongoDB Atlas database:

```
┌──────────────────────────────────────────────────────────────────┐
│                         VERCEL (free)                            │
│                                                                  │
│  Next.js 14 + TypeScript App                                     │
│  https://axelri-outreach.vercel.app                              │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Dashboard UI    │  │  API Routes (/api/...)               │  │
│  │  - Scraped Leads │  │  GET  /api/leads                     │  │
│  │  - Emails Sent   │  │  GET  /api/emails                    │  │
│  │  - Settings      │  │  GET  /api/events                    │  │
│  │  - Unsub List    │  │  POST /api/settings                  │  │
│  │                  │  │  GET  /api/track?lead=&service=      │  │
│  │  React + TSX     │  │  GET  /api/unsubscribe?token=        │  │
│  │  Tailwind CSS    │  │  POST /api/webhook/brevo             │  │
│  └──────────────────┘  └──────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ read / write
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MONGODB ATLAS M0 (free)                       │
│                                                                  │
│  Collections:                                                    │
│  - leads          (scraped + enriched business profiles)         │
│  - emails_sent    (every email dispatched)                       │
│  - email_events   (open / click / reply / bounce events)         │
│  - unsubscribed   (permanent suppression list)                   │
│  - config         (settings — single document)                   │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ read / write
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                        RENDER (free)                             │
│                                                                  │
│  Python Pipeline (Background Worker + Cron Jobs)                 │
│                                                                  │
│  Cron 1: 0 2 * * *  →  python main.py                           │
│    scraper.py → filter.py → enricher.py → email_writer.py        │
│    → sender.py                                                   │
│                                                                  │
│  Cron 2: 0 3 * * *  →  python follow_up.py                      │
│    Checks MongoDB for follow-up candidates → sends via Brevo     │
└──────────────────────────────────────────────────────────────────┘
```

> **Why split?** Vercel handles the Next.js dashboard perfectly but can't run persistent background processes. Render handles Python workers and cron jobs perfectly. MongoDB Atlas is the shared data layer both can read and write — no API bridge needed.

---

## Pipeline Stages (Python on Render)

```
┌─────────────────────────────────────────────────────────┐
│                   STAGE 1: SCRAPER                       │
│  scraper.py — Google Maps via Playwright                 │
│  Input: cities + search queries (from MongoDB config)   │
│  Output: business name, address, phone, rating, website  │
│  Writes raw leads to MongoDB `leads` collection          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   STAGE 2: FILTER                        │
│  filter.py                                               │
│  → Rating >= threshold (from config doc in MongoDB)      │
│  → No website OR social-only OR weak website             │
│  → Not in `unsubscribed` collection                      │
│  → Not already emailed (dedup check on `emails_sent`)    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   STAGE 3: ENRICHMENT                    │
│  enricher.py — builds full business profile              │
│  → Email (Hunter.io → Google scrape → site contact page) │
│  → Opening hours + services + description (GMB)          │
│  → Domain age (WHOIS via python-whois)                   │
│  → Website tech stack (Wappalyzer-lite)                  │
│  → Social profiles (Google search)                       │
│  → Top review snippet (GMB reviews tab)                  │
│  → Claude Haiku business summary + digital_gap tag       │
│  Updates lead document in MongoDB with enrichment fields │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   STAGE 4: EMAIL WRITER                  │
│  email_writer.py — Claude Haiku                          │
│  Full enriched profile passed as context                 │
│  → Personalised subject + body per lead                  │
│  → Service links tagged (?ref=web-design etc.)           │
│  → Unsubscribe token embedded in footer link             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   STAGE 5: SENDER                        │
│  sender.py — Brevo API                                   │
│  300 emails/day free, drip-limited to 50/day             │
│  Sends from hello@estradigital.co.uk                     │
│  Writes email record to MongoDB `emails_sent`            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   STAGE 6: TRACKER                       │
│  Vercel API routes (Next.js) handle all events:          │
│  /api/track    → click redirect + writes email_events    │
│  /api/webhook/brevo → open/bounce events → email_events  │
│  /api/unsubscribe → token lookup → unsubscribed doc      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   STAGE 7: FOLLOW-UP ENGINE              │
│  follow_up.py — runs daily on Render (Cron Job)          │
│  Queries MongoDB email_events for follow-up signals:     │
│  → No open after N days → generic follow-up              │
│  → Opened, no reply after N days → soft nudge            │
│  → Clicked [service] → targeted follow-up via Claude     │
│  → Unsubscribed → skip permanently                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   STAGE 8: DASHBOARD                     │
│  Next.js 14 + TypeScript on Vercel                       │
│  Live data from MongoDB via Mongoose                     │
│  Tabs: Scraped Leads / Emails Sent / Settings /          │
│        Unsubscribe List                                  │
└─────────────────────────────────────────────────────────┘
```

---

## MongoDB — Collections & Schemas

```typescript
// ── leads collection ────────────────────────────────────────────
interface Lead {
  _id: ObjectId;
  // From scraper
  businessName: string;
  category: string;
  city: string;
  country: string;
  rating: number;
  reviewCount: number;
  phone: string;
  fullAddress: string;
  website: string | null;
  // From enricher
  email: string | null;
  emailSource: 'hunter' | 'google_scrape' | 'website_contact' | null;
  openingHours: Record<string, string>;   // { "Mon": "7am-7pm", ... }
  gmbDescription: string | null;
  gmbServices: string[];
  domainName: string | null;
  domainAgeYears: number | null;
  websiteTechStack: string[];             // ["WordPress", "WooCommerce"]
  socialProfiles: Record<string, string>; // { "facebook": "https://..." }
  topReviewSnippet: string | null;
  businessSummary: string | null;         // Claude-generated
  digitalGap: 'no_website' | 'social_only' | 'weak_site' | null;
  enrichmentStatus: 'pending' | 'complete' | 'failed';
  status: 'scraped' | 'enriched' | 'emailed' | 'replied' | 'unsubscribed';
  scrapedAt: Date;
  enrichedAt: Date | null;
  updatedAt: Date;
}

// ── emails_sent collection ───────────────────────────────────────
interface EmailSent {
  _id: ObjectId;
  leadId: ObjectId;
  emailType: 'initial' | 'followup_generic' | 'followup_targeted';
  subject: string;
  body: string;
  serviceClicked: string | null;  // for targeted follow-ups
  sentAt: Date;
  brevoMessageId: string;
}

// ── email_events collection ──────────────────────────────────────
interface EmailEvent {
  _id: ObjectId;
  emailId: ObjectId;
  leadId: ObjectId;
  eventType: 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed';
  serviceTag: string | null;  // "web-design" | "seo" | "automation" etc.
  occurredAt: Date;
}

// ── unsubscribed collection ──────────────────────────────────────
interface Unsubscribed {
  _id: ObjectId;
  email: string;          // unique index
  businessName: string;
  token: string;          // unique token embedded in email footer link
  unsubscribedAt: Date;
  source: 'link_click' | 'brevo_webhook' | 'manual';
}

// ── config collection (single document) ─────────────────────────
interface Config {
  _id: ObjectId;
  // Filter settings
  minRating: number;
  requireNoWebsite: boolean;
  weakWebsiteDomains: string[];
  // Sending settings
  maxEmailsPerDay: number;
  sendDays: string[];
  sendHourStart: number;
  sendHourEnd: number;
  followUpDelayDays: number;
  maxFollowUps: number;
  targetedFollowUpDelayDays: number;
  // Target markets
  searchTargets: {
    country: string;
    countryCode: string;
    enabled: boolean;
    cities: {
      city: string;
      enabled: boolean;
      searchQueries: string[];
    }[];
  }[];
  // Sender identity
  fromEmail: string;
  fromName: string;
  updatedAt: Date;
}
```

---

## Target Markets Configuration

All target countries, cities, and search queries are fully configurable from the Dashboard — no code changes needed. The table below shows the defaults stored in the MongoDB `config` document.

| Country | Default Cities | Default Search Queries | Configurable? |
|---------|---------------|------------------------|---------------|
| Sri Lanka | Colombo, Kandy, Galle | "restaurants Colombo", "hotels Galle", "retail Kandy" | ✅ Yes |
| UK | London, Manchester, Birmingham, Leeds | "salons Manchester", "clinics Birmingham", "gyms Leeds" | ✅ Yes |
| Canada | Toronto, Vancouver, Calgary | "retail shops Toronto", "gyms Calgary", "lawyers Vancouver" | ✅ Yes |
| UAE | Dubai, Abu Dhabi, Sharjah | "restaurants Dubai", "real estate Abu Dhabi", "retail Sharjah" | ✅ Yes |
| Australia | Sydney, Melbourne, Brisbane | "cafes Sydney", "lawyers Melbourne", "clinics Brisbane" | ✅ Yes |

> All values live in the `config` MongoDB document and are edited from **Dashboard → Settings → Target Markets**. The Python pipeline reads this document at the start of every run.

---

## Business Enrichment — Building the Lead Profile

After a business passes the filter, `enricher.py` builds a complete profile before any email is written. All enriched data is stored in the lead's MongoDB document and passed as context to Claude when generating the email.

### What Gets Collected

| Data Point | Source | Method |
|------------|--------|--------|
| Email address | Hunter.io → Google scrape → website contact page | Tried in order, first found wins |
| Phone number | Google Maps GMB listing | Already scraped in Stage 1 |
| Opening hours | GMB listing | Playwright scrape |
| Business description | GMB "About" section | Playwright scrape |
| Services listed | GMB "Services" tab | Playwright scrape |
| Domain name | GMB website field | Extracted from listing |
| Domain age | WHOIS lookup (`python-whois`) | If domain exists |
| Website tech stack | Wappalyzer-lite | Detects CMS, e-commerce platform |
| Social profiles | Google: `"[name]" site:facebook.com OR site:instagram.com` | Search scrape |
| Top review snippet | GMB reviews tab | Playwright scrape |
| Business summary | Claude Haiku | Generated from all above fields |
| Digital gap tag | Claude Haiku | `no_website` / `social_only` / `weak_site` |

### How the Summary Is Generated

```python
# enricher.py — summary generation step
prompt = f"""
Analyse this business for B2B outreach. Write a 2-3 sentence summary covering:
1. What they do and who they serve
2. Their exact digital gap (no website / social-only / outdated site)
3. Which Axelri services are most relevant

Business data:
Name: {lead['businessName']}
Category: {lead['category']}
Location: {lead['city']}, {lead['country']}
Rating: {lead['rating']} ({lead['reviewCount']} reviews)
Hours: {lead['openingHours']}
GMB description: {lead['gmbDescription']}
Services listed: {', '.join(lead['gmbServices'])}
Website: {lead['website'] or 'None'}
Social profiles: {lead['socialProfiles']}
Top review: {lead['topReviewSnippet']}

Also output a digital_gap tag: one of no_website / social_only / weak_site
"""
```

The generated summary and gap tag are stored on the MongoDB lead document and fed directly into the email writer prompt.

---

## Email Strategy

### Filtering Logic

```
INCLUDE if:
  ✓ rating >= minRating (from config)
  ✓ no website OR social-only OR weak website
  ✓ email NOT in `unsubscribed` collection
  ✓ email NOT already in `emails_sent` collection (dedup)
  ✓ email address found during enrichment

EXCLUDE if:
  ✗ rating below threshold
  ✗ already emailed
  ✗ on unsubscribe list
  ✗ large chain / franchise
  ✗ proper website with clear investment
```

### Email Template Logic (AI-Personalised from Business Profile)

```
Context passed to Claude per lead:
  businessName, category, city, country
  gmbServices (what they actually offer)
  digitalGap (their exact gap — no_website / social_only / weak_site)
  domainAgeYears (if they have a site, how old)
  topReviewSnippet (what their customers say)
  businessSummary (Claude-generated enrichment summary)

Generated email structure:

Subject: Quick question about [Business Name]'s online presence

Hi [Owner/Team],

[1 sentence referencing something specific — a service they list,
 their location, or their review snippet]

[1 sentence naming their exact digital gap]

[2 sentences mapping Axelri services to their specific gap]
— e.g. "Website + online ordering for bakeries"    ← tracked link (?ref=web-design)
— e.g. "Local SEO in [city] = more walk-in traffic" ← tracked link (?ref=seo)
— e.g. "WhatsApp automation for [their service]"   ← tracked link (?ref=automation)

[1 CTA — reply or quick call, no pressure]

[Axelri signature]

---
Don't want to hear from us? Unsubscribe → https://axelri-outreach.vercel.app/api/unsubscribe?token=[unique_token]
```

**No spam words. No caps. Reads like a human who actually looked them up.**

---

## Click Tracking & Behaviour-Based Follow-Ups

### How Click Tracking Works

Every service link in the email routes through a Next.js API route first, then redirects:

```
Recipient clicks link
        │
        ▼
https://axelri-outreach.vercel.app/api/track?lead=<id>&service=web-design
        │  Writes to MongoDB email_events: { leadId, eventType: "clicked", serviceTag: "web-design" }
        ▼
Redirect → https://axelri.com/services/web-design
```

Brevo also fires webhook events (opens, bounces) to `/api/webhook/brevo` which writes to `email_events`.

### Follow-Up Logic Tree

```
follow_up.py queries MongoDB daily:

Sent → no open after 4 days
  └─ Generic follow-up: "Just checking this reached you..."
     Still no reply 3 days later → stop

Sent → opened, no reply after 5 days
  └─ Soft nudge: "Wanted to make sure you saw this..."
     Still no reply 3 days later → stop

Sent → clicked [service] → no reply after 3 days
  └─ Targeted follow-up (Claude-generated):
     "Hi [Name], we noticed you took a look at our [service] page —
      happy to share a few examples relevant to [their business type]..."
     Still no reply 3 days later → stop

Any stage → unsubscribed → STOP permanently
Any stage → replied → STOP, flag lead as replied in MongoDB
```

All timing values are read from the MongoDB `config` document and configurable from the Dashboard.

---

## Unsubscribe System

Every email footer contains:
```
Unsubscribe → https://axelri-outreach.vercel.app/api/unsubscribe?token=<unique_token>
```

When clicked:
1. Next.js API route looks up the token → finds the email address → writes to `unsubscribed` collection
2. Shows a simple confirmation page (Next.js page component): *"You've been removed."*
3. Brevo's own unsubscribe webhook also fires to `/api/webhook/brevo` → double suppression
4. All pipeline stages query `unsubscribed` collection before sending anything

---

## Sending Rules (Critical for Deliverability)

1. **Max 50 emails/day** during warm-up — scale gradually over 3 weeks
2. **Unsubscribe link** in every email footer — legally required in all target markets
3. **SPF + DKIM + DMARC** on estradigital.co.uk (see DNS setup below)
4. **Plain text style** — no heavy HTML, no image-only emails
5. **Personalisation** in subject + first line — significantly reduces spam score
6. **Send window**: Mon–Thu, 9am–11am recipient's local timezone

---

## Domain Email Setup (One-Time)

```
# SPF Record (TXT on estradigital.co.uk)
v=spf1 include:sendinblue.com ~all

# DKIM — get exact value from Brevo dashboard after domain connection

# DMARC (TXT on _dmarc.estradigital.co.uk)
v=DMARC1; p=none; rua=mailto:hello@estradigital.co.uk
```

---

## Folder Structure

```
axelri-outreach/
│
├── pipeline/                     # Python — runs on Render
│   ├── main.py                   # Orchestrator — runs all pipeline stages in order
│   ├── scraper.py                # Google Maps scraper via Playwright
│   ├── filter.py                 # Rating + website + unsubscribe filter
│   ├── enricher.py               # Full business profiler
│   ├── email_writer.py           # Claude Haiku email generator
│   ├── sender.py                 # Brevo API sender
│   ├── follow_up.py              # Daily follow-up engine (Render Cron Job)
│   ├── db.py                     # pymongo client — shared MongoDB connection
│   ├── requirements.txt          # Python dependencies
│   └── prompts/
│       ├── initial_email.txt     # Claude prompt — first email
│       ├── followup_generic.txt  # Claude prompt — no-reply follow-up
│       ├── followup_targeted.txt # Claude prompt — click-based follow-up
│       └── enrichment_summary.txt # Claude prompt — business profile summary
│
└── dashboard/                    # Next.js 14 + TypeScript — runs on Vercel
    ├── app/
    │   ├── page.tsx              # Dashboard home — redirects to /leads
    │   ├── leads/
    │   │   └── page.tsx          # Scraped Leads view
    │   ├── emails/
    │   │   └── page.tsx          # Emails Sent view
    │   ├── settings/
    │   │   └── page.tsx          # Settings (all 5 tabs)
    │   ├── unsubscribed/
    │   │   └── page.tsx          # Unsubscribe List view
    │   └── unsubscribe/
    │       └── page.tsx          # Unsubscribe confirmation page (public)
    ├── app/api/
    │   ├── leads/route.ts        # GET /api/leads
    │   ├── emails/route.ts       # GET /api/emails
    │   ├── events/route.ts       # GET /api/events
    │   ├── settings/route.ts     # GET + POST /api/settings
    │   ├── track/route.ts        # GET /api/track (click redirect + event write)
    │   ├── unsubscribe/route.ts  # GET /api/unsubscribe (token lookup + suppression)
    │   └── webhook/
    │       └── brevo/route.ts    # POST /api/webhook/brevo (Brevo event receiver)
    ├── lib/
    │   ├── mongodb.ts            # Mongoose connection (singleton pattern)
    │   └── models/
    │       ├── Lead.ts           # Mongoose Lead model + TypeScript interface
    │       ├── EmailSent.ts      # Mongoose EmailSent model
    │       ├── EmailEvent.ts     # Mongoose EmailEvent model
    │       ├── Unsubscribed.ts   # Mongoose Unsubscribed model
    │       └── Config.ts         # Mongoose Config model
    ├── components/
    │   ├── LeadsTable.tsx
    │   ├── EmailsTable.tsx
    │   ├── SettingsTabs.tsx
    │   └── UnsubscribedTable.tsx
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## Dashboard — Full Specification

### Section 1 — Scraped Leads

Searchable, filterable table of every business the scraper has found. Clicking a row opens a full profile panel showing all enriched data fields and the Claude-generated business summary.

| Column | Source |
|--------|--------|
| Business Name | MongoDB `leads.businessName` |
| Category | `leads.category` |
| City / Country | `leads.city`, `leads.country` |
| Rating | `leads.rating` (+ `leads.reviewCount`) |
| Website | `leads.website` or "None" / "Facebook only" |
| Services Found | `leads.gmbServices` (comma-separated) |
| Email Found | `leads.email` ✅ / ❌ |
| Digital Gap | `leads.digitalGap` badge |
| Enrichment | `leads.enrichmentStatus` badge |
| Status | `leads.status` badge |

Filters: country, city, status, rating range, date range. Export to CSV.

### Section 2 — Emails Sent

Full log of every email with engagement data.

| Column | Source |
|--------|--------|
| Business Name | via `leads` lookup |
| Email Address | `emails_sent.leadId → leads.email` |
| Sent At | `emails_sent.sentAt` |
| Email Type | `emails_sent.emailType` badge |
| Opened | `email_events` lookup ✅ / ❌ + timestamp |
| Clicked | service tag(s) from `email_events` + timestamp |
| Replied | `leads.status === 'replied'` |
| Unsubscribed | `unsubscribed` collection check |
| Follow-up Status | derived from `email_events` |

Clicking a row shows the full email subject + body. Stats bar at top: total sent, open rate, click rate, reply rate, unsubscribe rate.

### Section 3 — Settings (5 Tabs)

All values read from and saved to the MongoDB `config` document via `/api/settings`.

- **Tab 1 — Target Markets**: add/remove countries, cities, search queries; toggle on/off
- **Tab 2 — Filter Rules**: rating slider, website filter toggle, weak domain list
- **Tab 3 — Sending Rules**: daily cap, send days, send window, follow-up timing
- **Tab 4 — API Keys & Sender**: masked inputs for all API keys + from email/name
- **Tab 5 — Email Prompts**: editors for all 3 Claude prompts with live preview

### Section 4 — Unsubscribe List

Full suppression list from the `unsubscribed` MongoDB collection. Columns: email, business name, date, source. Manual add + CSV export.

---

## Hosting Setup

### Vercel (Dashboard — Next.js)

```bash
# 1. Push dashboard/ to GitHub

# 2. Import repo into Vercel
#    Framework preset: Next.js (auto-detected)
#    Root directory: dashboard/

# 3. Add environment variables in Vercel dashboard:
#    MONGODB_URI=mongodb+srv://...@cluster.mongodb.net/axelri
#    NEXTAUTH_SECRET=<random string>   # optional, for future auth

# 4. Deploy — auto-deploys on every git push to main
#    Dashboard live at: https://axelri-outreach.vercel.app
```

### Render (Python Pipeline)

```bash
# 1. Push pipeline/ to GitHub (same or separate repo)

# 2. On render.com — create Background Worker
#    Runtime: Python 3
#    Build: pip install -r requirements.txt
#    Start command: python main.py
#    Environment variables:
#      MONGODB_URI=mongodb+srv://...
#      ANTHROPIC_API_KEY=sk-ant-...
#      BREVO_API_KEY=xkeysib-...
#      HUNTER_API_KEY=...

# 3. Create Cron Jobs:
#    Daily pipeline:   0 2 * * *   python main.py
#    Daily follow-ups: 0 3 * * *   python follow_up.py

# 4. Point Brevo webhook to:
#    https://axelri-outreach.vercel.app/api/webhook/brevo
```

### MongoDB Atlas

```bash
# 1. Create free M0 cluster at cloud.mongodb.com
# 2. Create database user + whitelist Render + Vercel IPs
#    (or use 0.0.0.0/0 for free tier — acceptable for this use case)
# 3. Copy connection string → paste as MONGODB_URI in both Vercel + Render
# 4. Collections are auto-created on first write — no schema migration needed
```

### Local Development

```bash
# .env.local (for Next.js dashboard)
MONGODB_URI=mongodb+srv://...
# or use local: MONGODB_URI=mongodb://localhost:27017/axelri

# .env (for Python pipeline)
MONGODB_URI=mongodb+srv://...
ANTHROPIC_API_KEY=sk-ant-...
BREVO_API_KEY=xkeysib-...
HUNTER_API_KEY=...

# Run dashboard locally
cd dashboard && npm run dev   # http://localhost:3000

# Run pipeline manually
cd pipeline && python main.py
```

---

## Step-by-Step Build Order

### Week 1: Foundation
- [ ] Create MongoDB Atlas M0 cluster — copy `MONGODB_URI`
- [ ] Create Vercel account — connect GitHub repo
- [ ] Create Render account — set up Background Worker + 2 Cron Jobs
- [ ] Configure SPF/DKIM/DMARC on estradigital.co.uk
- [ ] Create Brevo account, connect domain, get API key
- [ ] Get Anthropic API key (Claude Haiku)
- [ ] Build `pipeline/db.py` — pymongo singleton connection to MongoDB Atlas
- [ ] Build `dashboard/lib/mongodb.ts` — Mongoose singleton connection
- [ ] Define all 5 Mongoose models in `dashboard/lib/models/`
- [ ] Seed initial `config` document in MongoDB with default settings

### Week 2: Scraper + Filter
- [ ] Build `scraper.py` — reads `searchTargets` from MongoDB `config`, iterates all cities + queries via Playwright
- [ ] Build `filter.py` — applies `minRating`, website check, queries `unsubscribed` + `emails_sent` collections
- [ ] Test locally: one city + one query — verify lead documents written to MongoDB correctly
- [ ] Add deduplication: check `leads` collection before inserting

### Week 3: Enrichment + AI Writer
- [ ] Build `enricher.py` — GMB scrape, WHOIS, social search, Hunter.io, Claude summary + digital_gap
- [ ] Build `email_writer.py` — passes full MongoDB lead document as context to Claude Haiku, embeds tracked service links + unsubscribe token
- [ ] Write all 4 Claude prompt templates
- [ ] Test: enrich 5 real leads, generate emails — verify each email references real business-specific details

### Week 4: Sender + Tracker
- [ ] Build `sender.py` — Brevo API, drip limits, writes to `emails_sent` collection
- [ ] Build `dashboard/app/api/track/route.ts` — click redirect + writes to `email_events`
- [ ] Build `dashboard/app/api/webhook/brevo/route.ts` — Brevo event receiver → `email_events`
- [ ] Build `dashboard/app/api/unsubscribe/route.ts` — token lookup → `unsubscribed` collection
- [ ] Deploy dashboard to Vercel, point Brevo webhook URL
- [ ] Test full cycle: send → click → webhook → MongoDB

### Week 5: Follow-Up Engine
- [ ] Build `follow_up.py` — queries `email_events` for all 3 follow-up scenarios, generates emails via Claude, sends via Brevo
- [ ] Test all 3 scenarios locally (simulate MongoDB documents)
- [ ] Deploy to Render Cron Job — verify it fires at 3am daily

### Week 6: Dashboard UI
- [ ] Build `LeadsTable.tsx` — fetches `/api/leads`, renders with filters + drill-down panel
- [ ] Build `EmailsTable.tsx` — fetches `/api/emails` + `/api/events`, renders engagement columns
- [ ] Build `SettingsTabs.tsx` — 5-tab settings UI, reads/writes `/api/settings`
- [ ] Build `UnsubscribedTable.tsx` — renders suppression list + manual add
- [ ] Build public `/unsubscribe` page — shown after unsubscribe link click
- [ ] Final end-to-end test on Vercel + Render + MongoDB Atlas

---

## Pitching Logic Per Country

| Market | Key Pitch Angle | Compliance Note |
|--------|----------------|-----------------|
| Sri Lanka | "Most competitors have no site yet — first mover advantage" | No specific cold email law |
| UK | "Your Google listing has no website — losing customers to competitors" | GDPR: legitimate interest, must include unsubscribe |
| Canada | "Booking + automation = fewer no-shows, more revenue" | CASL: publicly listed emails only, full sender ID |
| UAE | "Multilingual site + WhatsApp automation for tourist-facing businesses" | No federal B2B cold email law |
| Australia | "Local SEO + Google Business = more walk-ins without ad spend" | SPAM Act 2003: unsubscribe mechanism required |

---

## Expected Results

| Metric | Conservative | Realistic |
|--------|-------------|-----------|
| Leads scraped/week | 500 | 1,500 |
| Leads with email found | 150 (30%) | 500 (33%) |
| Emails sent/week | 150 | 350 |
| Open rate | 25% | 40% |
| Click rate (service links) | 5% | 15% |
| Reply rate | 2% | 5% |
| Targeted follow-up reply rate | 5% | 12% |
| Warm leads per month | 3–5 | 10–20 |

---

## Monthly Cost Summary

| Item | Cost |
|------|------|
| Vercel (Next.js dashboard) | $0 (free tier) |
| Render (Python pipeline + cron) | $0 (free tier) |
| MongoDB Atlas M0 (512MB) | $0 (free forever) |
| Brevo (300 emails/day) | $0 |
| Claude Haiku API (~500 emails/month) | ~$0.50 |
| Hunter.io (25 searches/month free) | $0 |
| **Total** | **~$0.50/month** |

> Volume scaling: at 2,000 emails/month Claude API cost is ~$2. At 5,000 emails/month ~$5. Still under $10 at all realistic volumes.

---

*Built for Axelri | estradigital.co.uk | Human Expertise. AI Speed. Engineered Outcomes.*
