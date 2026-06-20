import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Lead } from "@/lib/models";
import { runCampaignService } from "@/lib/runCampaignService";
import type { CampaignMediaOverrides } from "@/lib/cloudinary";

interface PreviewDraft {
  subject: string;
  htmlBody: string;
  textBody: string;
}

interface PreviewResponse {
  drafts: Record<string, PreviewDraft>;
  errors: Record<string, string>;
}

function serializeLeadForPython(lead: {
  _id: { toString(): string };
  [key: string]: unknown;
}) {
  const { _id, ...rest } = lead;
  return { _id: _id.toString(), ...rest };
}

export async function POST(request: Request) {
  await connectMongo();

  const body = (await request.json()) as {
    leadIds?: string[];
    templateId?: string;
    mediaOverrides?: Record<string, CampaignMediaOverrides>;
  };

  const leadIds = body.leadIds ?? [];
  const templateId = body.templateId ?? "proposal_v1";

  if (leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds is required" }, { status: 400 });
  }

  const leads = await Lead.find({ _id: { $in: leadIds } }).lean();
  const leadsById = new Map(leads.map((lead) => [String(lead._id), lead]));

  const orderedLeads = leadIds
    .map((id) => leadsById.get(id))
    .filter(Boolean)
    .map((lead) => serializeLeadForPython(lead!));

  const result = await runCampaignService<PreviewResponse>("preview", {
    templateId,
    leads: orderedLeads,
    mediaOverrides: body.mediaOverrides ?? {},
  });

  return NextResponse.json(result);
}
