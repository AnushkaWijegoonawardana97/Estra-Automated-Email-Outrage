"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/atoms/Badge";

const PIPELINE_STEPS = [
  { value: "all", label: "Full pipeline" },
  { value: "scrape", label: "Scrape only" },
  { value: "enrich", label: "Enrich" },
  { value: "find_email", label: "Find emails" },
  { value: "send", label: "Send emails" },
  { value: "follow_up", label: "Follow-ups" },
  { value: "retry_failed", label: "Retry failed" },
] as const;

interface PipelineJobRow {
  _id: string;
  action: string;
  status: string;
  requestedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
}

function statusTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "running") return "info" as const;
  return "warning" as const;
}

export function PipelineTriggerPanel() {
  const [action, setAction] = useState<string>("all");
  const [jobs, setJobs] = useState<PipelineJobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    const response = await fetch("/api/pipeline/trigger");
    if (response.ok) {
      setJobs(await response.json());
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  async function runPipeline() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pipeline/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Failed to trigger pipeline");
        return;
      }
      await fetchJobs();
    } catch {
      setError("Failed to trigger pipeline");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Run pipeline</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Trigger a pipeline step manually. In production, jobs run within ~5 minutes via Render cron.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Step</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            {PIPELINE_STEPS.map((step) => (
              <option key={step.value} value={step.value}>
                {step.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={runPipeline}
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Starting…" : "Run"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {jobs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {jobs.slice(0, 5).map((job) => (
            <li
              key={job._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-100 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium capitalize">{job.action.replace("_", " ")}</span>
                {job.requestedAt && (
                  <span className="ml-2 text-xs text-zinc-400">
                    {new Date(job.requestedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge label={job.status} tone={statusTone(job.status)} />
                {job.error && (
                  <span className="text-xs text-red-600">{job.error}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
