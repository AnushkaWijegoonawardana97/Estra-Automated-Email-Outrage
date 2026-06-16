import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { EmailSent, Lead } from "@/lib/models";

export async function GET() {
  await connectMongo();

  const emails = await EmailSent.find().sort({ sentAt: -1 }).limit(500).lean();
  const leadIds = emails.map((email) => email.leadId);
  const leads = await Lead.find({ _id: { $in: leadIds } }).lean();
  const leadMap = new Map(leads.map((lead) => [String(lead._id), lead]));

  const enriched = emails.map((email) => ({
    ...email,
    lead: leadMap.get(String(email.leadId)) ?? null,
  }));

  return NextResponse.json(enriched);
}
