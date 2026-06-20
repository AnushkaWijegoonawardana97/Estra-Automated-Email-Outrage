import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import mongoose from "mongoose";
import { Lead } from "../dashboard/lib/models/Lead";

loadEnv({ path: resolve(__dirname, "../dashboard/.env.local") });
loadEnv({ path: resolve(__dirname, "../dashboard/.env") });
loadEnv({ path: resolve(__dirname, "../pipeline/.env") });
loadEnv({ path: resolve(__dirname, "../.env") });

const SEARCH_TERM = "steak house";
const SCRAPE_QUERY = "steak house in Manchester, United Kingdom";

type LeadSeed = {
  mapsPlaceId: string;
  businessName: string;
  category: string;
  city: string;
  country: string;
  email: string;
  fullAddress: string;
  website?: string | null;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  businessSummary?: string;
  digitalGap?: "no_website" | "social_only" | "weak_site" | null;
  status?: "scraped" | "enriched" | "emailed";
  emailSource?: string;
};

const HAWKSMOOR_LEADS: LeadSeed[] = [
  {
    mapsPlaceId: "manual:hawksmoor-air-street",
    businessName: "Hawksmoor Air Street",
    category: "Steak house",
    city: "London",
    country: "United Kingdom",
    email: "Airstreet@thehawksmoor.com",
    fullAddress: "5A Air Street, London W1J 6AD, United Kingdom",
    website: "https://thehawksmoor.com/locations/air-street",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-borough",
    businessName: "Hawksmoor Borough",
    category: "Steak house",
    city: "London",
    country: "United Kingdom",
    email: "Borough@thehawksmoor.com",
    fullAddress: "8 Southwark Street, London SE1 1TL, United Kingdom",
    website: "https://thehawksmoor.com/locations/borough",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-dublin",
    businessName: "Hawksmoor Dublin",
    category: "Steak house",
    city: "Dublin",
    country: "Ireland",
    email: "Dublin@thehawksmoor.com",
    fullAddress: "34-35 Dawson Street, Dublin 2, Ireland",
    website: "https://thehawksmoor.com/locations/dublin",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-edinburgh",
    businessName: "Hawksmoor Edinburgh",
    category: "Steak house",
    city: "Edinburgh",
    country: "United Kingdom",
    email: "Edinburgh@thehawksmoor.com",
    fullAddress: "23a West Register Street, Edinburgh EH2 2AA, United Kingdom",
    website: "https://thehawksmoor.com/locations/edinburgh",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-guildhall",
    businessName: "Hawksmoor Guildhall",
    category: "Steak house",
    city: "London",
    country: "United Kingdom",
    email: "Guildhall@thehawksmoor.com",
    fullAddress: "10 Basinghall Street, London EC2V 5BQ, United Kingdom",
    website: "https://thehawksmoor.com/locations/guildhall",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-knightsbridge",
    businessName: "Hawksmoor Knightsbridge",
    category: "Steak house",
    city: "London",
    country: "United Kingdom",
    email: "Knightsbridge@thehawksmoor.com",
    fullAddress: "3 Yeoman's Row, London SW3 2AL, United Kingdom",
    website: "https://thehawksmoor.com/locations/knightsbridge",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-liverpool",
    businessName: "Hawksmoor Liverpool",
    category: "Steak house",
    city: "Liverpool",
    country: "United Kingdom",
    email: "Liverpool@thehawksmoor.com",
    fullAddress: "14 Brunswick Street, Liverpool L2 0PP, United Kingdom",
    website: "https://thehawksmoor.com/locations/liverpool",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-manchester",
    businessName: "Hawksmoor Manchester",
    category: "Steak house",
    city: "Manchester",
    country: "United Kingdom",
    email: "Manchester@thehawksmoor.com",
    fullAddress: "184, 186 Deansgate, Manchester M3 3WB, United Kingdom",
    website:
      "http://thehawksmoor.com/locations/manchester?y_source=1_MjQyMjUwMzUtNzE1LWxvY2F0aW9uLndlYnNpdGU%3D",
    rating: 4.7,
    reviewCount: 0,
    businessSummary:
      "Premium steakhouse on Deansgate serving charcoal-grilled beef, seafood, and classic cocktails in central Manchester.",
    digitalGap: "weak_site",
    status: "emailed",
    emailSource: "website_home",
  },
  {
    mapsPlaceId: "manual:hawksmoor-seven-dials",
    businessName: "Hawksmoor Seven Dials",
    category: "Steak house",
    city: "London",
    country: "United Kingdom",
    email: "Sevendials@thehawksmoor.com",
    fullAddress: "11 Langley Street, London WC2H 9JG, United Kingdom",
    website: "https://thehawksmoor.com/locations/seven-dials",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-spitalfields",
    businessName: "Hawksmoor Spitalfields",
    category: "Steak house",
    city: "London",
    country: "United Kingdom",
    email: "Spitalfields@thehawksmoor.com",
    fullAddress: "157 Commercial Street, London E1 6BJ, United Kingdom",
    website: "https://thehawksmoor.com/locations/spitalfields",
    digitalGap: "weak_site",
  },
  {
    mapsPlaceId: "manual:hawksmoor-wood-wharf",
    businessName: "Hawksmoor Wood Wharf",
    category: "Steak house",
    city: "London",
    country: "United Kingdom",
    email: "Woodwharf@thehawksmoor.com",
    fullAddress: "1 Water Street, London E14 9GE, United Kingdom",
    website: "https://thehawksmoor.com/locations/wood-wharf",
    digitalGap: "weak_site",
  },
];

const PREZZO_LEAD: LeadSeed = {
  mapsPlaceId: "manual:prezzo-manchester-media-city",
  businessName: "Prezzo Italian Restaurant Manchester Media City",
  category: "Italian restaurant",
  city: "Manchester",
  country: "United Kingdom",
  email: "bookatable@thehawksmoor.com",
  fullAddress: "101-110 Broadway, MediaCityUK, Manchester M50 2AH, United Kingdom",
  phone: "+441618366980",
  website: "https://www.prezzo.co.uk/restaurants/manchester-media-city",
  businessSummary:
    "Group bookings made easy. Authentic Italian food, great atmosphere, unforgettable moments at MediaCityUK.",
  digitalGap: "weak_site",
  emailSource: "website_home",
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function upsertLead(seed: LeadSeed) {
  const now = new Date();
  const email = seed.email.trim();
  const existing =
    (await Lead.findOne({ mapsPlaceId: seed.mapsPlaceId })) ??
    (await Lead.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } })) ??
    (await Lead.findOne({ businessName: seed.businessName, city: seed.city }));

  const doc = {
    mapsPlaceId: seed.mapsPlaceId,
    businessName: seed.businessName,
    category: seed.category,
    city: seed.city,
    country: seed.country,
    searchTerm: SEARCH_TERM,
    scrapeQuery: SCRAPE_QUERY,
    rating: seed.rating ?? 0,
    reviewCount: seed.reviewCount ?? 0,
    phone: seed.phone ?? "",
    fullAddress: seed.fullAddress,
    website: seed.website ?? null,
    email,
    emailSource: seed.emailSource ?? "website_home",
    emailDiscoveryStatus: "found" as const,
    businessSummary: seed.businessSummary ?? null,
    digitalGap: seed.digitalGap ?? "weak_site",
    enrichmentStatus: "complete" as const,
    status: seed.status ?? "enriched",
    scrapedAt: existing?.scrapedAt ?? now,
    enrichedAt: now,
    updatedAt: now,
  };

  if (existing) {
    await Lead.updateOne({ _id: existing._id }, { $set: doc });
    return { action: "updated" as const, name: seed.businessName, id: String(existing._id) };
  }

  const created = await Lead.create(doc);
  return { action: "created" as const, name: seed.businessName, id: String(created._id) };
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required.");
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB ?? "estra";
  await mongoose.connect(uri, { dbName });

  const allSeeds = [...HAWKSMOOR_LEADS, PREZZO_LEAD];
  const results = [];

  for (const seedLead of allSeeds) {
    const result = await upsertLead(seedLead);
    results.push(result);
    console.log(`${result.action}: ${result.name} (${normalizeEmail(seedLead.email)})`);
  }

  console.log(`\nDone — ${results.length} leads processed in "${dbName}".`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
