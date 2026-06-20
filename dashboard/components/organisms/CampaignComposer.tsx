"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignTemplatePicker } from "@/components/molecules/CampaignTemplatePicker";
import { LeadCampaignSidebar } from "@/components/molecules/LeadCampaignSidebar";
import { CampaignEditorPanel } from "@/components/organisms/CampaignEditorPanel";
import {
  loadCampaignSession,
  saveCampaignSession,
  type CampaignDraft,
} from "@/lib/campaignSession";
import type { CampaignMediaOverrides } from "@/lib/cloudinary";
import type { LeadRow } from "@/lib/serializeLead";

interface CampaignComposerProps {
  leads: LeadRow[];
  initialQuotaRemaining?: number;
}

function hasUnsubscribeLink(html: string) {
  return /unsubscribe/i.test(html);
}

export function CampaignComposer({
  leads,
  initialQuotaRemaining = 50,
}: CampaignComposerProps) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("proposal_v1");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(
    leads[0]?._id ?? null,
  );
  const [drafts, setDrafts] = useState<Record<string, CampaignDraft>>({});
  const [mediaOverrides, setMediaOverrides] = useState<
    Record<string, CampaignMediaOverrides>
  >({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<
    Record<string, "idle" | "sent" | "failed">
  >({});
  const [quotaRemaining, setQuotaRemaining] = useState(initialQuotaRemaining);
  const [sendSummary, setSendSummary] = useState<string | null>(null);
  const [readyToGenerate, setReadyToGenerate] = useState<boolean | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateInitializedRef = useRef(false);

  const leadIds = useMemo(() => leads.map((lead) => lead._id), [leads]);
  const activeLead = leads.find((lead) => lead._id === activeLeadId) ?? null;
  const activeDraft = activeLeadId ? drafts[activeLeadId] : undefined;

  const generateDrafts = useCallback(
    async (overrides = mediaOverrides) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/campaigns/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadIds,
            templateId,
            mediaOverrides: overrides,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to generate previews");
        }
        setDrafts((current) => ({ ...current, ...payload.drafts }));
        if (payload.errors && Object.keys(payload.errors).length > 0) {
          setError(
            `Some leads failed: ${Object.values(payload.errors).join(", ")}`,
          );
        }
      } catch (generateError) {
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Failed to generate previews",
        );
      } finally {
        setLoading(false);
      }
    },
    [leadIds, templateId, mediaOverrides],
  );

  useEffect(() => {
    templateInitializedRef.current = false;
    const session = loadCampaignSession(leadIds);
    if (session && Object.keys(session.drafts).length > 0) {
      setTemplateId(session.templateId);
      setActiveLeadId(session.activeLeadId || leadIds[0] || null);
      setDrafts(session.drafts);
      setMediaOverrides(session.mediaOverrides ?? {});
      setSendStatus(session.sendStatus ?? {});
      setReadyToGenerate(false);
    } else {
      setReadyToGenerate(true);
    }
  }, [leadIds]);

  useEffect(() => {
    if (readyToGenerate !== true) return;
    if (leadIds.length === 0) return;
    void generateDrafts({});
    setReadyToGenerate(null);
  }, [readyToGenerate, leadIds, generateDrafts]);

  useEffect(() => {
    if (leadIds.length === 0 || !activeLeadId) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      saveCampaignSession({
        leadIds,
        templateId,
        activeLeadId,
        drafts,
        mediaOverrides,
        sendStatus,
        updatedAt: new Date().toISOString(),
      });
    }, 300);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [
    leadIds,
    templateId,
    activeLeadId,
    drafts,
    mediaOverrides,
    sendStatus,
  ]);

  useEffect(() => {
    if (readyToGenerate !== null) return;
    if (!templateInitializedRef.current) {
      templateInitializedRef.current = true;
      return;
    }
    if (leadIds.length === 0) return;
    void generateDrafts({});
  }, [templateId, readyToGenerate, leadIds, generateDrafts]);

  function updateActiveDraft(partial: Partial<CampaignDraft>) {
    if (!activeLeadId) return;
    setDrafts((current) => ({
      ...current,
      [activeLeadId]: {
        ...(current[activeLeadId] ?? {
          subject: "",
          htmlBody: "",
          textBody: "",
        }),
        ...partial,
      },
    }));
  }

  function handleMediaOverride(
    key: keyof CampaignMediaOverrides,
    url: string,
  ) {
    if (!activeLeadId) return;
    setMediaOverrides((current) => ({
      ...current,
      [activeLeadId]: {
        ...(current[activeLeadId] ?? {}),
        [key]: url,
      },
    }));
  }

  function handlePreview() {
    if (!activeLeadId || !activeDraft?.htmlBody) return;
    saveCampaignSession({
      leadIds,
      templateId,
      activeLeadId,
      drafts,
      mediaOverrides,
      sendStatus,
      updatedAt: new Date().toISOString(),
    });
    router.push(
      `/campaigns/preview?leadIds=${leadIds.join(",")}&leadId=${activeLeadId}`,
    );
  }

  async function handleSend() {
    if (!window.confirm(`Send campaign to ${leadIds.length} recipient(s)?`)) {
      return;
    }

    setSending(true);
    setError(null);
    setSendSummary(null);

    try {
      const response = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, drafts }),
      });
      const payload = await response.json();
      if (!response.ok && response.status !== 429) {
        throw new Error(payload.error ?? "Send failed");
      }

      const nextStatus: Record<string, "idle" | "sent" | "failed"> = {};
      for (const id of payload.sent ?? []) nextStatus[id] = "sent";
      for (const id of Object.keys(payload.failed ?? {})) nextStatus[id] = "failed";
      setSendStatus(nextStatus);
      setQuotaRemaining(payload.remaining ?? quotaRemaining);
      setSendSummary(
        `Sent ${payload.sent?.length ?? 0}, failed ${Object.keys(payload.failed ?? {}).length ?? 0}.`,
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const missingUnsubscribe =
    activeDraft?.htmlBody && !hasUnsubscribeLink(activeDraft.htmlBody);

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/leads"
            className="mb-2 inline-block text-sm font-medium text-violet-700 hover:underline"
          >
            ← Back to leads
          </Link>
          <h2 className="text-xl font-semibold text-zinc-900">
            Personalized Campaign
          </h2>
          <p className="text-sm text-zinc-500">
            {leads.length} recipient{leads.length === 1 ? "" : "s"} ·{" "}
            {quotaRemaining} sends remaining today
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CampaignTemplatePicker
            selectedId={templateId}
            onSelect={setTemplateId}
            variant="compact"
          />
          <button
            type="button"
            onClick={() => void generateDrafts()}
            disabled={loading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Generating…" : "Reset to template"}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!activeDraft?.htmlBody}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            Preview email
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || Object.keys(drafts).length === 0}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send Campaign"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {sendSummary ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {sendSummary}{" "}
          <Link href="/emails" className="font-medium underline">
            View emails
          </Link>
        </div>
      ) : null}

      <LeadCampaignSidebar
        leads={leads}
        activeLeadId={activeLeadId}
        sendStatus={sendStatus}
        onSelect={setActiveLeadId}
        variant="pills"
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {activeLead && activeDraft ? (
          <CampaignEditorPanel
            leadId={activeLead._id}
            leadName={activeLead.businessName}
            draft={activeDraft}
            onDraftChange={updateActiveDraft}
            mediaOverrides={mediaOverrides[activeLead._id] ?? {}}
            onMediaOverride={handleMediaOverride}
            onRegenerateWithMedia={() => void generateDrafts(mediaOverrides)}
            missingUnsubscribe={Boolean(missingUnsubscribe)}
          />
        ) : (
          <p className="text-sm text-zinc-500">Select a lead to edit.</p>
        )}
      </div>
    </div>
  );
}
