import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const leadSchema = new Schema(
  {
    businessName: { type: String, required: true },
    category: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    searchTerm: { type: String, default: "" },
    scrapeQuery: { type: String, default: "" },
    mapsPlaceId: { type: String, default: null },
    mapsUrl: { type: String, default: null },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    phone: { type: String, default: "" },
    fullAddress: { type: String, default: "" },
    website: { type: String, default: null },
    email: { type: String, default: null },
    emailSource: {
      type: String,
      enum: [
        "google_scrape",
        "website_contact",
        "website_home",
        "website_sitemap",
        "domain_search",
        "social_profile",
        "gmb_listing",
      ],
      default: null,
    },
    emailDiscoveryStatus: {
      type: String,
      enum: ["pending", "found", "not_found"],
      default: "pending",
    },
    openingHours: { type: Map, of: String, default: {} },
    gmbDescription: { type: String, default: null },
    gmbServices: { type: [String], default: [] },
    domainName: { type: String, default: null },
    domainAgeYears: { type: Number, default: null },
    websiteTechStack: { type: [String], default: [] },
    socialProfiles: { type: Map, of: String, default: {} },
    topReviewSnippet: { type: String, default: null },
    businessSummary: { type: String, default: null },
    digitalGap: {
      type: String,
      enum: ["no_website", "social_only", "weak_site", null],
      default: null,
    },
    enrichmentStatus: {
      type: String,
      enum: ["pending", "complete", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["scraped", "enriched", "emailed", "replied", "unsubscribed"],
      default: "scraped",
    },
    unsubscribeToken: { type: String, default: null },
    scrapedAt: { type: Date, default: Date.now },
    enrichedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "leads" },
);

leadSchema.index({ businessName: 1, fullAddress: 1 }, { unique: true });
leadSchema.index({ mapsPlaceId: 1 }, { unique: true, sparse: true });
leadSchema.index({ businessName: 1, city: 1, country: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ city: 1, country: 1 });
leadSchema.index({ searchTerm: 1 });
leadSchema.index({ scrapeQuery: 1 });

export type LeadDocument = InferSchemaType<typeof leadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Lead: Model<LeadDocument> =
  mongoose.models.Lead ?? mongoose.model<LeadDocument>("Lead", leadSchema);
