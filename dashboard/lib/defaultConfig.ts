import {
  DEFAULT_SCRAPE_QUERY_TEMPLATE,
  defaultSearchTerms,
  defaultTargetCountries,
} from "./targetMarkets";

export const defaultEmailPrompts = {
  initialEmail: `Write a personalised cold email for B2B outreach from Estra Digital.

Business context:
{business_context}

Rules:
- Plain text only, no HTML
- No spam words, no ALL CAPS
- Subject line included on first line as "Subject: ..."
- Reference something specific about the business
- Name their digital gap clearly
- Include 2-3 service lines with tracked placeholders: [LINK:web-design], [LINK:seo], [LINK:automation]
- End with a soft CTA (reply or quick call)
- Sign off as Estra
- Do not include unsubscribe footer (added automatically)`,
  followupGeneric: `Write a short generic follow-up email. The recipient did not open the first email.

Business: {business_name}
Original subject: {original_subject}

Rules:
- Plain text, friendly tone
- 2-3 sentences max
- Sign off as Estra
- First line: "Subject: ..."`,
  followupTargeted: `Write a targeted follow-up. The recipient clicked our {service} page but did not reply.

Business context:
{business_context}
Service clicked: {service}

Rules:
- Reference the service they viewed
- Offer relevant examples for their business type
- Plain text, 4-5 sentences
- Sign off as Estra
- First line: "Subject: ..."`,
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
