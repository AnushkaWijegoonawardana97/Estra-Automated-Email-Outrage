import { ActivityLogTable } from "@/components/organisms/ActivityLogTable";
import { DashboardNav } from "@/components/organisms/DashboardNav";
import { PipelineTriggerPanel } from "@/components/molecules/PipelineTriggerPanel";
import { connectMongo } from "@/lib/mongodb";
import { PipelineLog } from "@/lib/models";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ActivityPage() {
  await connectMongo();

  const [logs, total] = await Promise.all([
    PipelineLog.find().sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
    PipelineLog.countDocuments(),
  ]);

  const serialized = logs.map((log) => ({
    _id: String(log._id),
    stage: log.stage,
    level: log.level,
    message: log.message,
    metadata: (log.metadata as Record<string, unknown>) ?? {},
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">Pipeline Activity</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {total} log entr{total === 1 ? "y" : "ies"}
          </p>
        </div>
        <div className="mb-6">
          <PipelineTriggerPanel />
        </div>
        <ActivityLogTable initialLogs={serialized} initialTotal={total} />
      </main>
    </>
  );
}
