import type { LeadDocument } from "@/lib/models/Lead";

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

export function serializeLead(lead: LeadDocument & { _id: { toString(): string } }): LeadRow {
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
