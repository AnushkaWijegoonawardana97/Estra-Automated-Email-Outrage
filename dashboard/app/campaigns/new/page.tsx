import Link from "next/link";
import { connectMongo } from "@/lib/mongodb";
import { Config, Lead } from "@/lib/models";
import { CampaignComposer } from "@/components/organisms/CampaignComposer";
import { serializeLead } from "@/lib/serializeLead";
import mongoose from "mongoose";

interface CampaignNewPageProps {
  searchParams: Promise<{ leadIds?: string }>;
}

export default async function CampaignNewPage({ searchParams }: CampaignNewPageProps) {
  await connectMongo();
  const params = await searchParams;
  const leadIds =
    params.leadIds
      ?.split(",")
      .map((value) => value.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id)) ?? [];

  const [leads, config, sentToday] = await Promise.all([
    leadIds.length > 0
      ? Lead.find({ _id: { $in: leadIds } }).lean()
      : Promise.resolve([]),
    Config.findOne().lean(),
    (async () => {
      const { EmailSent } = await import("@/lib/models/EmailSent");
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      return EmailSent.countDocuments({ sentAt: { $gte: startOfDay } });
    })(),
  ]);

  const orderedLeads = leadIds
    .map((id) => leads.find((lead) => String(lead._id) === id))
    .filter(Boolean)
    .map((lead) => serializeLead(lead!));

  const maxPerDay = config?.maxEmailsPerDay ?? 50;
  const quotaRemaining = Math.max(0, maxPerDay - sentToday);

  if (orderedLeads.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900">Personalized Campaign</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Select one or more leads with email addresses from the{" "}
          <Link href="/leads" className="font-medium text-violet-700 underline">
            Leads
          </Link>{" "}
          page, then choose Personalize Campaign.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <CampaignComposer leads={orderedLeads} initialQuotaRemaining={quotaRemaining} />
    </main>
  );
}
