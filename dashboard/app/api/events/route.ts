import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { EmailEvent } from "@/lib/models";

export async function GET(request: Request) {
  await connectMongo();

  const { searchParams } = new URL(request.url);
  const emailIdsParam = searchParams.get("emailIds");
  const filter: Record<string, unknown> = {};

  if (emailIdsParam) {
    const ids = emailIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => Types.ObjectId.isValid(id));

    if (ids.length > 0) {
      filter.emailId = { $in: ids.map((id) => new Types.ObjectId(id)) };
    }
  }

  const events = await EmailEvent.find(filter).sort({ occurredAt: -1 }).limit(5000).lean();

  const serialized = events.map((event) => ({
    emailId: String(event.emailId),
    leadId: String(event.leadId),
    eventType: event.eventType,
    serviceTag: event.serviceTag,
    occurredAt: event.occurredAt.toISOString(),
  }));

  return NextResponse.json(serialized);
}
