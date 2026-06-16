import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { EmailEvent, EmailSent, Lead, Unsubscribed } from "@/lib/models";

interface BrevoEvent {
  event: string;
  email?: string;
  "message-id"?: string;
  tag?: string;
}

export async function POST(request: NextRequest) {
  await connectMongo();

  let payload: BrevoEvent | BrevoEvent[];
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(payload) ? payload : [payload];

  for (const event of events) {
    const eventType = event.event?.toLowerCase();
    const messageId = event["message-id"];

    const emailRecord = messageId
      ? await EmailSent.findOne({ brevoMessageId: messageId }).lean()
      : null;

    if (eventType === "opened" && emailRecord) {
      await EmailEvent.create({
        emailId: emailRecord._id,
        leadId: emailRecord.leadId,
        eventType: "opened",
        occurredAt: new Date(),
      });
    }

    if (eventType === "hard_bounce" || eventType === "soft_bounce") {
      if (emailRecord) {
        await EmailEvent.create({
          emailId: emailRecord._id,
          leadId: emailRecord.leadId,
          eventType: "bounced",
          occurredAt: new Date(),
        });
      }
    }

    if (eventType === "unsubscribed" && event.email) {
      const lead = await Lead.findOne({ email: event.email }).lean();
      await Unsubscribed.findOneAndUpdate(
        { email: event.email.toLowerCase() },
        {
          email: event.email.toLowerCase(),
          businessName: lead?.businessName ?? "",
          token: lead?.unsubscribeToken ?? crypto.randomUUID(),
          source: "brevo_webhook",
          unsubscribedAt: new Date(),
        },
        { upsert: true },
      );
      if (lead) {
        await Lead.updateOne({ _id: lead._id }, { status: "unsubscribed" });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
