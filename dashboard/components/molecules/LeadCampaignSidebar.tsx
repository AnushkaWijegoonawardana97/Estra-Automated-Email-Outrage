"use client";

import type { LeadRow } from "@/lib/serializeLead";

interface LeadCampaignSidebarProps {
  leads: LeadRow[];
  activeLeadId: string | null;
  sendStatus: Record<string, "idle" | "sent" | "failed">;
  onSelect: (leadId: string) => void;
  variant?: "sidebar" | "pills";
}

export function LeadCampaignSidebar({
  leads,
  activeLeadId,
  sendStatus,
  onSelect,
  variant = "pills",
}: LeadCampaignSidebarProps) {
  if (variant === "pills") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {leads.map((lead) => {
          const active = lead._id === activeLeadId;
          const status = sendStatus[lead._id] ?? "idle";
          return (
            <button
              key={lead._id}
              type="button"
              onClick={() => onSelect(lead._id)}
              title={`${lead.businessName} · ${lead.email}`}
              className={`inline-flex max-w-[200px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                active
                  ? "border-violet-500 bg-violet-50 font-medium text-violet-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <span className="truncate">{lead.businessName}</span>
              {status === "sent" ? (
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              ) : status === "failed" ? (
                <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-900">Recipients</p>
      <div className="space-y-2">
        {leads.map((lead) => {
          const active = lead._id === activeLeadId;
          const status = sendStatus[lead._id] ?? "idle";
          return (
            <button
              key={lead._id}
              type="button"
              onClick={() => onSelect(lead._id)}
              className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                active
                  ? "border-violet-200 border-l-4 border-l-violet-500 bg-violet-50"
                  : "border-zinc-200 border-l-4 border-l-transparent bg-white hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {lead.businessName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{lead.email}</p>
                </div>
                {status === "sent" ? (
                  <span className="text-xs text-emerald-600">sent</span>
                ) : status === "failed" ? (
                  <span className="text-xs text-red-600">failed</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
