"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/atoms/Badge";

export interface PipelineLogRow {
  _id: string;
  stage: string;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function levelTone(level: string) {
  if (level === "success") return "success" as const;
  if (level === "error") return "danger" as const;
  if (level === "warning") return "warning" as const;
  return "info" as const;
}

export function ActivityLogTable({
  initialLogs,
  stageFilter,
}: {
  initialLogs: PipelineLogRow[];
  stageFilter?: string;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [stage, setStage] = useState(stageFilter ?? "");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    const response = await fetch(`/api/logs?${params.toString()}`);
    if (response.ok) {
      setLogs(await response.json());
    }
  }, [stage]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Stage</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            <option value="">All</option>
            {["pipeline", "scraper", "filter", "enricher", "sender", "follow_up"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={fetchLogs}
          className="mt-5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Refresh
        </button>
        <label className="mt-5 flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />
          Auto-refresh (10s)
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              {["Time", "Stage", "Level", "Message"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No activity logs yet. Run the pipeline to see logs here.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isSeparator = log.message.startsWith("─");
                if (isSeparator) {
                  return (
                    <tr key={log._id} className="border-t border-zinc-100">
                      <td colSpan={4} className="px-4 py-2">
                        <div className="border-t border-zinc-200" />
                      </td>
                    </tr>
                  );
                }

                const meta = log.metadata ?? {};
                const detail =
                  typeof meta.reason === "string"
                    ? meta.reason
                    : typeof meta.fullAddress === "string" && meta.fullAddress
                      ? String(meta.fullAddress)
                      : typeof meta.outcome === "string"
                        ? `Outcome: ${meta.outcome}`
                        : null;

                return (
                  <tr key={log._id} className="border-t border-zinc-100 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={log.stage} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={log.level} tone={levelTone(log.level)} />
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      <p>{log.message}</p>
                      {detail && (
                        <p className="mt-1 text-xs text-zinc-400">{detail}</p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
