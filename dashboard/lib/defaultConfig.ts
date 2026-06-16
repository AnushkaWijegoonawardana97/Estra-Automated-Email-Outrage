import {
  DEFAULT_SCRAPE_QUERY_TEMPLATE,
  defaultSearchTerms,
  defaultTargetCountries,
} from "./targetMarkets";

export const defaultEmailPrompts = {
  initialEmail: `Generate personalised email content slots for a B2B cold outreach email from Estra Digital.
Return ONLY valid JSON with no markdown fences or extra text.

Business context:
{business_context}

Required JSON keys:
- subject: short, specific subject line (no spam words, no ALL CAPS)
- greeting: friendly greeting using the business name
- opening_hook: one sentence referencing something specific about the business
- gap_insight: one or two sentences naming their digital gap clearly and personally
- service_pitch: one or two sentences on how Estra can help
- cta_line: one soft CTA sentence

Rules:
- Sound human and personal, not templated
- Do not include sign-off, footer, links, or HTML
- British English spelling`,
  followupGeneric: `Generate personalised follow-up email content slots. The recipient did not open the first email.
Return ONLY valid JSON with no markdown fences or extra text.

Business: {business_name}
Original subject: {original_subject}

Required JSON keys:
- subject: short follow-up subject line
- greeting: friendly greeting
- body: 2-3 sentences, friendly and concise

Rules:
- No sign-off, footer, links, or HTML
- British English spelling`,
  followupTargeted: `Generate personalised targeted follow-up content slots. The recipient clicked our service page but did not reply.
Return ONLY valid JSON with no markdown fences or extra text.

Business context:
{business_context}
Service clicked: {service}

Required JSON keys:
- subject: short subject referencing their interest
- greeting: friendly greeting
- service_reference: one sentence tying their click to a relevant outcome
- body: 2-3 sentences with a concrete offer for their business type

Rules:
- No sign-off, footer, links, or HTML
- British English spelling`,
  enrichmentSummary: `Analyse this business for B2B outreach. Write a 2-3 sentence summary covering:
1. What they do and who they serve
2. Their exact digital gap (no website / social-only / outdated site)
3. Which Estra services are most relevant

Business data:
{business_data}

Also output on the last line: digital_gap: one of no_website / social_only / weak_site`,
};

export const defaultConfigValues = {
  minRating: 3.5,
  requireNoWebsite: false,
  weakWebsiteDomains: ["facebook.com", "instagram.com", "linktr.ee", "wixsite.com"],
  maxEmailsPerDay: 50,
  sendDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
  sendHourStart: 9,
  sendHourEnd: 11,
  followUpDelayDays: 4,
  maxFollowUps: 2,
  targetedFollowUpDelayDays: 3,
  openedFollowUpDelayDays: 5,
  stopFollowUpAfterDays: 3,
  fromEmail: "hello@estradigital.co.uk",
  fromName: "Estra",
  targetCountries: defaultTargetCountries,
  searchTerms: defaultSearchTerms,
  scrapeQueryTemplate: DEFAULT_SCRAPE_QUERY_TEMPLATE,
  emailPrompts: defaultEmailPrompts,
  maxWebsitePagesPerLead: 8,
  enableDomainEmailSearch: true,
  enableSocialEmailScrape: true,
  enableGenericGoogleEmailSearch: true,
  franchiseKeywords: ["mcdonald", "starbucks", "subway", "kfc", "domino"],
};
