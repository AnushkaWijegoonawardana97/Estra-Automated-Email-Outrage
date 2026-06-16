import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { PipelineLog } from "@/lib/models";

export async function GET(request: Request) {
  await connectMongo();

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage");
  const limit = Number(searchParams.get("limit") ?? "200");

  const allowedStages = [
    "pipeline",
    "scraper",
    "filter",
    "enricher",
    "sender",
    "follow_up",
  ] as const;

  const filter =
    stage && allowedStages.includes(stage as (typeof allowedStages)[number])
      ? { stage: stage as (typeof allowedStages)[number] }
      : {};

  const logs = await PipelineLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 500))
    .lean();

  const serialized = logs.map((log) => ({
    _id: String(log._id),
    stage: log.stage,
    level: log.level,
    message: log.message,
    metadata: log.metadata ?? {},
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json(serialized);
}
