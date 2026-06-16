import type { LeadDocument } from "@/lib/models/Lead";

export interface EmailDiscoveryAttempt {
  strategy: string;
  success: boolean;
  reason: string;
  email?: string | null;
  pagesChecked?: number;
  pagesVisited?: string[];
  candidatesSeen?: string[];
}

export interface SectionsFound {
  overview?: boolean;
  about?: boolean;
}

export interface LeadRow {
  _id: string;
  businessName: string;
  category: string;
  city: string;
  country: string;
  searchTerm?: string;
  scrapeQuery?: string;
  mapsPlaceId?: string | null;
  mapsUrl?: string | null;
  rating: number;
  reviewCount: number;
  phone: string;
  fullAddress: string;
  website?: string | null;
  email?: string | null;
  emailSource?: string | null;
  emailDiscoveryStatus?: string | null;
  gmbServices?: string[];
  digitalGap?: string | null;
  enrichmentStatus?: string;
  status?: string;
  businessSummary?: string | null;
  scrapedAt?: string;
  enrichedAt?: string | null;
  updatedAt?: string;
}

export interface LeadDetail extends LeadRow {
  gmbDescription?: string | null;
  openingHours: Record<string, string>;
  topReviewSnippet?: string | null;
  domainName?: string | null;
  domainAgeYears?: number | null;
  websiteTechStack: string[];
  socialProfiles: Record<string, string>;
  sectionsFound?: SectionsFound | null;
  pagesChecked?: number | null;
  emailCandidatesTried?: number | null;
  emailDiscoveryLog: EmailDiscoveryAttempt[];
}

type LeadInput = LeadDocument & { _id: { toString(): string } };

function normalizeStringMap(
  value: Map<string, string> | Record<string, string> | null | undefined,
): Record<string, string> {
  if (!value) return {};
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  return { ...value };
}

function normalizeEmailDiscoveryLog(value: unknown): EmailDiscoveryAttempt[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      strategy: String(entry.strategy ?? ""),
      success: Boolean(entry.success),
      reason: String(entry.reason ?? ""),
      email: entry.email != null ? String(entry.email) : null,
      pagesChecked:
        typeof entry.pagesChecked === "number" ? entry.pagesChecked : undefined,
      pagesVisited: Array.isArray(entry.pagesVisited)
        ? entry.pagesVisited.map(String)
        : undefined,
      candidatesSeen: Array.isArray(entry.candidatesSeen)
        ? entry.candidatesSeen.map(String)
        : undefined,
    }));
}

function normalizeSectionsFound(value: unknown): SectionsFound | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    overview: Boolean(record.overview),
    about: Boolean(record.about),
  };
}

export function serializeLead(lead: LeadInput): LeadRow {
  return {
    _id: String(lead._id),
    businessName: lead.businessName,
    category: lead.category ?? "",
    city: lead.city ?? "",
    country: lead.country ?? "",
    searchTerm: lead.searchTerm ?? "",
    scrapeQuery: lead.scrapeQuery ?? "",
    mapsPlaceId: lead.mapsPlaceId ?? null,
    mapsUrl: lead.mapsUrl ?? null,
    rating: lead.rating ?? 0,
    reviewCount: lead.reviewCount ?? 0,
    phone: lead.phone ?? "",
    fullAddress: lead.fullAddress ?? "",
    website: lead.website ?? null,
    email: lead.email ?? null,
    emailSource: lead.emailSource ?? null,
    emailDiscoveryStatus: lead.emailDiscoveryStatus ?? "pending",
    gmbServices: lead.gmbServices ?? [],
    digitalGap: lead.digitalGap ?? null,
    enrichmentStatus: lead.enrichmentStatus ?? "pending",
    status: lead.status ?? "scraped",
    businessSummary: lead.businessSummary ?? null,
    scrapedAt: lead.scrapedAt?.toISOString(),
    enrichedAt: lead.enrichedAt?.toISOString() ?? null,
    updatedAt: lead.updatedAt?.toISOString(),
  };
}

export function serializeLeadDetail(lead: LeadInput): LeadDetail {
  return {
    ...serializeLead(lead),
    gmbDescription: lead.gmbDescription ?? null,
    openingHours: normalizeStringMap(lead.openingHours),
    topReviewSnippet: lead.topReviewSnippet ?? null,
    domainName: lead.domainName ?? null,
    domainAgeYears: lead.domainAgeYears ?? null,
    websiteTechStack: lead.websiteTechStack ?? [],
    socialProfiles: normalizeStringMap(lead.socialProfiles),
    sectionsFound: normalizeSectionsFound(lead.sectionsFound),
    pagesChecked: lead.pagesChecked ?? null,
    emailCandidatesTried: lead.emailCandidatesTried ?? null,
    emailDiscoveryLog: normalizeEmailDiscoveryLog(lead.emailDiscoveryLog),
  };
}
