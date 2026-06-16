import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { EmailSent, Lead, PipelineLog } from "@/lib/models";

export async function GET() {
  await connectMongo();

  const [leadCount, emailCount, logCount, lastLog] = await Promise.all([
    Lead.countDocuments(),
    EmailSent.countDocuments(),
    PipelineLog.countDocuments(),
    PipelineLog.findOne().sort({ createdAt: -1 }).lean(),
  ]);

  return NextResponse.json({
    leadCount,
    emailCount,
    logCount,
    database: process.env.MONGODB_DB ?? "estra",
    lastActivityAt: lastLog?.createdAt?.toISOString() ?? null,
  });
}
