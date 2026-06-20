import { Suspense } from "react";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { Lead } from "@/lib/models";
import { CampaignPreviewPage } from "@/components/organisms/CampaignPreviewPage";
import { serializeLead } from "@/lib/serializeLead";

interface CampaignPreviewRouteProps {
  searchParams: Promise<{ leadIds?: string; leadId?: string }>;
}

async function PreviewContent({
  searchParams,
}: {
  searchParams: Promise<{ leadIds?: string; leadId?: string }>;
}) {
  await connectMongo();
  const params = await searchParams;
  const leadIds =
    params.leadIds
      ?.split(",")
      .map((value) => value.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id)) ?? [];

  const leads =
    leadIds.length > 0
      ? await Lead.find({ _id: { $in: leadIds } }).lean()
      : [];

  const summaries = leadIds
    .map((id) => leads.find((lead) => String(lead._id) === id))
    .filter(Boolean)
    .map((lead) => {
      const row = serializeLead(lead!);
      return {
        _id: row._id,
        businessName: row.businessName,
        email: row.email ?? "",
      };
    });

  return <CampaignPreviewPage leads={summaries} />;
}

export default function CampaignPreviewRoute({
  searchParams,
}: CampaignPreviewRouteProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-sm text-zinc-500">Loading preview…</p>
        </main>
      }
    >
      <PreviewContent searchParams={searchParams} />
    </Suspense>
  );
}
