import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { serializeEmailDetail } from "@/lib/serializeEmail";
import { EmailEvent, EmailSent, Lead } from "@/lib/models";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  await connectMongo();

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid email id" }, { status: 400 });
  }

  const email = await EmailSent.findById(id).lean();
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const [lead, events] = await Promise.all([
    Lead.findById(email.leadId).lean(),
    EmailEvent.find({ emailId: email._id }).sort({ occurredAt: -1 }).lean(),
  ]);

  return NextResponse.json(serializeEmailDetail(email, lead, events));
}
