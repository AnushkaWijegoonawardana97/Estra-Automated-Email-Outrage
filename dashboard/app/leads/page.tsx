import { DashboardNav } from "@/components/organisms/DashboardNav";
import { LeadsTable } from "@/components/organisms/LeadsTable";
import { defaultSearchTerms } from "@/lib/targetMarkets";
import { connectMongo } from "@/lib/mongodb";
import { serializeLead } from "@/lib/serializeLead";
import { Config, Lead } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  await connectMongo();
  const pageSize = 25;
  const [leads, total, config, countryOptions] = await Promise.all([
    Lead.find().sort({ scrapedAt: -1 }).limit(pageSize).lean(),
    Lead.countDocuments(),
    Config.findOne().lean(),
    Lead.distinct("country"),
  ]);
  const serialized = leads.map((lead) => serializeLead(lead));
  const searchTermOptions = (config?.searchTerms ?? defaultSearchTerms)
    .map((entry) => entry.term)
    .filter((term): term is string => Boolean(term));
  const countries = countryOptions
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b));

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Scraped Leads</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {total} lead{total === 1 ? "" : "s"} in database
            </p>
          </div>
        </div>
        <LeadsTable
          initialLeads={serialized}
          initialTotal={total}
          searchTermOptions={searchTermOptions}
          countryOptions={countries}
        />
      </main>
    </>
  );
}
