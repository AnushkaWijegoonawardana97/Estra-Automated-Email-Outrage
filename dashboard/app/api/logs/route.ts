import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { PipelineLog } from "@/lib/models";

const ALLOWED_STAGES = [
  "pipeline",
  "scraper",
  "filter",
  "enricher",
  "sender",
  "follow_up",
] as const;

export async function GET(request: Request) {
  await connectMongo();

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const skip = (page - 1) * limit;

  const filter =
    stage && ALLOWED_STAGES.includes(stage as (typeof ALLOWED_STAGES)[number])
      ? { stage: stage as (typeof ALLOWED_STAGES)[number] }
      : {};

  const [logs, total] = await Promise.all([
    PipelineLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PipelineLog.countDocuments(filter),
  ]);

  const serialized = logs.map((log) => ({
    _id: String(log._id),
    stage: log.stage,
    level: log.level,
    message: log.message,
    metadata: log.metadata ?? {},
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json({
    logs: serialized,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
