import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { serializeLeadDetail } from "@/lib/serializeLead";
import { Lead } from "@/lib/models";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  await connectMongo();

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  const lead = await Lead.findById(id).lean();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(serializeLeadDetail(lead));
}
