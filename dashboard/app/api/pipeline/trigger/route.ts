import { spawn } from "child_process";
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import {
  PIPELINE_ACTIONS,
  PipelineJob,
  type PipelineAction,
} from "@/lib/models";

function serializeJob(job: {
  _id: { toString(): string };
  action: string;
  status: string;
  requestedAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  error?: string | null;
  requestedBy?: string | null;
}) {
  return {
    _id: job._id.toString(),
    action: job.action,
    status: job.status,
    requestedAt: job.requestedAt?.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    error: job.error ?? null,
    requestedBy: job.requestedBy ?? null,
  };
}

function runJobRunnerLocally() {
  const monorepoRoot = process.cwd().endsWith("dashboard")
    ? `${process.cwd()}/..`
    : process.cwd();

  const child = spawn("pnpm", ["pipeline:jobs"], {
    cwd: monorepoRoot,
    detached: true,
    stdio: "ignore",
    shell: true,
  });
  child.unref();
}

export async function GET() {
  await connectMongo();
  const jobs = await PipelineJob.find().sort({ requestedAt: -1 }).limit(10).lean();
  return NextResponse.json(jobs.map(serializeJob));
}

export async function POST(request: Request) {
  await connectMongo();
  const body = (await request.json()) as { action?: string };
  const action = body.action as PipelineAction | undefined;

  if (!action || !PIPELINE_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${PIPELINE_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const running = await PipelineJob.findOne({ status: { $in: ["pending", "running"] } });
  if (running) {
    return NextResponse.json(
      { error: "A pipeline job is already pending or running", job: serializeJob(running) },
      { status: 409 },
    );
  }

  const job = await PipelineJob.create({
    action,
    status: "pending",
    requestedAt: new Date(),
  });

  if (process.env.NODE_ENV === "development") {
    try {
      runJobRunnerLocally();
    } catch (error) {
      await PipelineJob.findByIdAndUpdate(job._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to start pipeline",
        completedAt: new Date(),
      });
      return NextResponse.json(
        { error: "Failed to start local pipeline process" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(serializeJob(job), { status: 201 });
}
