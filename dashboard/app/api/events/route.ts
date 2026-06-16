import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { EmailEvent } from "@/lib/models";

export async function GET() {
  await connectMongo();
  const events = await EmailEvent.find().sort({ occurredAt: -1 }).limit(1000).lean();
  return NextResponse.json(events);
}
