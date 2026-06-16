import {
  DEFAULT_SCRAPE_QUERY_TEMPLATE,
  defaultSearchTerms,
  defaultTargetCountries,
} from "./targetMarkets";

export const defaultEmailPrompts = {
  enrichmentSummary: `Analyse this business for B2B outreach. Write a 2-3 sentence summary covering:
1. What they do and who they serve
2. Their exact digital gap (no website / social-only / outdated site)
3. Which Estra services are most relevant

Business data:
{business_data}

Also output on the last line: digital_gap: one of no_website / social_only / weak_site`,
  // Legacy keys kept for MongoDB schema compatibility — outbound emails are template-driven.
  initialEmail: "",
  followupGeneric: "",
  followupTargeted: "",
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
