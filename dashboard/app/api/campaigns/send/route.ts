import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Config, Lead } from "@/lib/models";
import { runCampaignService } from "@/lib/runCampaignService";

interface SendDraft {
  subject: string;
  htmlBody: string;
  textBody: string;
}

function hasUnsubscribeLink(html: string) {
  return /unsubscribe/i.test(html);
}

export async function POST(request: Request) {
  await connectMongo();

  const body = (await request.json()) as {
    templateId?: string;
    drafts?: Record<string, SendDraft>;
  };

  const templateId = body.templateId ?? "proposal_v1";
  const drafts = body.drafts ?? {};
  const leadIds = Object.keys(drafts);

  if (leadIds.length === 0) {
    return NextResponse.json({ error: "drafts is required" }, { status: 400 });
  }

  const config = await Config.findOne().lean();
  const maxPerDay = config?.maxEmailsPerDay ?? 50;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { EmailSent } = await import("@/lib/models/EmailSent");
  const sentToday = await EmailSent.countDocuments({
    sentAt: { $gte: startOfDay },
  });
  const remaining = Math.max(0, maxPerDay - sentToday);

  if (remaining === 0) {
    return NextResponse.json(
      { error: "Daily email cap reached", sent: [], failed: {} },
      { status: 429 },
    );
  }

  const sent: string[] = [];
  const failed: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  for (const leadId of leadIds) {
    if (sent.length >= remaining) {
      failed[leadId] = "Daily email cap reached";
      continue;
    }

    const draft = drafts[leadId];
    if (!draft?.subject || !draft.htmlBody || !draft.textBody) {
      failed[leadId] = "Incomplete draft";
      continue;
    }

    if (!hasUnsubscribeLink(draft.htmlBody)) {
      warnings[leadId] = "HTML may be missing unsubscribe link";
    }

    const lead = await Lead.findById(leadId).lean();
    if (!lead?.email) {
      failed[leadId] = "Lead has no email";
      continue;
    }

    try {
      await runCampaignService<{ messageId: string }>("send", {
        templateId,
        lead: { ...lead, _id: leadId },
        subject: draft.subject,
        htmlBody: draft.htmlBody,
        textBody: draft.textBody,
      });
      sent.push(leadId);
    } catch (error) {
      failed[leadId] =
        error instanceof Error ? error.message : "Send failed";
    }
  }

  return NextResponse.json({ sent, failed, warnings, remaining: remaining - sent.length });
}
