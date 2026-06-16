import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Unsubscribed } from "@/lib/models";

export async function GET() {
  await connectMongo();
  const records = await Unsubscribed.find().sort({ unsubscribedAt: -1 }).lean();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  await connectMongo();
  const body = await request.json();
  const { email, businessName } = body as { email?: string; businessName?: string };

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const record = await Unsubscribed.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      email: email.toLowerCase(),
      businessName: businessName ?? "",
      token,
      source: "manual",
      unsubscribedAt: new Date(),
    },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json(record);
}
