"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmailHtmlPreview } from "@/components/atoms/EmailHtmlPreview";
import {
  loadCampaignSession,
  type CampaignDraft,
  type CampaignSession,
} from "@/lib/campaignSession";

function hasUnsubscribeLink(html: string) {
  return /unsubscribe/i.test(html);
}

interface LeadSummary {
  _id: string;
  businessName: string;
  email: string;
}

export function CampaignPreviewPage({ leads }: { leads: LeadSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdsParam = searchParams.get("leadIds") ?? "";
  const leadIdParam = searchParams.get("leadId") ?? "";

  const leadIds = useMemo(
    () => leadIdsParam.split(",").map((id) => id.trim()).filter(Boolean),
    [leadIdsParam],
  );

  const [session, setSession] = useState<CampaignSession | null>(null);
  const [view, setView] = useState<"html" | "text">("html");
  const [activeLeadId, setActiveLeadId] = useState(leadIdParam || leadIds[0] || "");

  useEffect(() => {
    if (leadIds.length === 0) {
      router.replace("/campaigns/new");
      return;
    }
    const loaded = loadCampaignSession(leadIds);
    if (!loaded) {
      router.replace(`/campaigns/new?leadIds=${leadIds.join(",")}`);
      return;
    }
    setSession(loaded);
    const initial =
      leadIdParam && leadIds.includes(leadIdParam)
        ? leadIdParam
        : loaded.activeLeadId || leadIds[0];
    setActiveLeadId(initial);
  }, [leadIds, leadIdParam, router]);

  const leadMap = useMemo(
    () => new Map(leads.map((lead) => [lead._id, lead])),
    [leads],
  );

  const activeLead = leadMap.get(activeLeadId);
  const draft: CampaignDraft | undefined = session?.drafts[activeLeadId];
  const activeIndex = leadIds.indexOf(activeLeadId);

  function goToLead(nextId: string) {
    setActiveLeadId(nextId);
    const params = new URLSearchParams({
      leadIds: leadIds.join(","),
      leadId: nextId,
    });
    router.replace(`/campaigns/preview?${params.toString()}`);
  }

  function goPrev() {
    if (activeIndex > 0) goToLead(leadIds[activeIndex - 1]);
  }

  function goNext() {
    if (activeIndex < leadIds.length - 1) goToLead(leadIds[activeIndex + 1]);
  }

  if (!session || !draft) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-zinc-500">Loading preview…</p>
      </main>
    );
  }

  const missingUnsubscribe = draft.htmlBody && !hasUnsubscribeLink(draft.htmlBody);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/campaigns/new?leadIds=${leadIds.join(",")}`}
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              ← Back to editor
            </Link>
            <span className="text-zinc-300">|</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {activeLead?.businessName ?? "Lead"}
              </p>
              <p className="text-xs text-zinc-500">{activeLead?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={goPrev}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs text-zinc-500">
              {activeIndex + 1} of {leadIds.length}
            </span>
            <button
              type="button"
              disabled={activeIndex >= leadIds.length - 1}
              onClick={goNext}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-6xl">
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-800">Subject:</span>{" "}
            {draft.subject || "—"}
          </p>
        </div>
        <div className="mx-auto mt-3 flex max-w-6xl gap-2">
          <button
            type="button"
            onClick={() => setView("html")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              view === "html"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-600"
            }`}
          >
            HTML
          </button>
          <button
            type="button"
            onClick={() => setView("text")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              view === "text"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-600"
            }`}
          >
            Plain text
          </button>
        </div>
        {missingUnsubscribe ? (
          <p className="mx-auto mt-2 max-w-6xl text-sm text-amber-700">
            Warning: HTML may be missing an unsubscribe link.
          </p>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 p-6">
        {view === "html" && draft.htmlBody ? (
          <EmailHtmlPreview
            htmlBody={draft.htmlBody}
            minHeight="min-h-[calc(100vh-220px)]"
            className="rounded-lg border border-zinc-200 shadow-sm"
          />
        ) : (
          <pre className="min-h-[calc(100vh-220px)] overflow-auto rounded-lg border border-zinc-200 bg-white p-6 text-sm whitespace-pre-wrap text-zinc-700">
            {draft.textBody || "No plain text body."}
          </pre>
        )}
      </div>
    </main>
  );
}
