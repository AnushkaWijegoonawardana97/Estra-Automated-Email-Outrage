import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { EmailEvent, EmailSent, Lead } from "@/lib/models";

async function getEmailStats() {
  const total = await EmailSent.countDocuments();
  const emailedLeadIds = await EmailSent.distinct("leadId");

  const [openedIds, clickedIds, replied, unsubscribed] = await Promise.all([
    EmailEvent.distinct("emailId", { eventType: "opened" }),
    EmailEvent.distinct("emailId", { eventType: "clicked" }),
    Lead.countDocuments({ _id: { $in: emailedLeadIds }, status: "replied" }),
    Lead.countDocuments({ _id: { $in: emailedLeadIds }, status: "unsubscribed" }),
  ]);

  return {
    total,
    opened: openedIds.length,
    clicked: clickedIds.length,
    replied,
    unsubscribed,
  };
}

function serializeEmail(
  email: {
    _id: { toString(): string };
    subject: string;
    body: string;
    emailType: string;
    sentAt: Date;
    leadId: { toString(): string };
    sendSource?: string | null;
    campaignTemplateId?: string | null;
  },
  leadMap: Map<string, { businessName?: string; email?: string | null; status?: string }>,
) {
  const lead = leadMap.get(String(email.leadId));
  return {
    _id: String(email._id),
    subject: email.subject,
    body: email.body,
    emailType: email.emailType,
    sentAt: email.sentAt.toISOString(),
    leadId: String(email.leadId),
    sendSource: email.sendSource ?? "automated",
    campaignTemplateId: email.campaignTemplateId ?? null,
    lead: lead
      ? {
          businessName: lead.businessName,
          email: lead.email ?? undefined,
          status: lead.status,
        }
      : null,
  };
}

export async function GET(request: Request) {
  await connectMongo();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));
  const skip = (page - 1) * limit;

  const [emails, total, stats] = await Promise.all([
    EmailSent.find().sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
    EmailSent.countDocuments(),
    getEmailStats(),
  ]);

  const leadIds = emails.map((email) => email.leadId);
  const leads = await Lead.find({ _id: { $in: leadIds } }).lean();
  const leadMap = new Map(leads.map((lead) => [String(lead._id), lead]));

  return NextResponse.json({
    emails: emails.map((email) => serializeEmail(email, leadMap)),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats,
  });
}
