"use client";

import { useEffect, useRef, useState } from "react";
import { EmailHtmlMonacoEditor, type EmailHtmlEditorHandle } from "@/components/atoms/EmailHtmlMonacoEditor";
import { CampaignEditorDropZones } from "@/components/molecules/CampaignEditorDropZones";
import { EditorPreviewSplitPane } from "@/components/molecules/EditorPreviewSplitPane";
import {
  FullPageEditorToolbar,
  type FullPageViewMode,
  type SplitOrientation,
} from "@/components/molecules/FullPageEditorToolbar";
import type { CampaignDraft } from "@/lib/campaignSession";
import type { CampaignMediaOverrides } from "@/lib/cloudinary";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

interface CampaignEditorPanelProps {
  leadId: string;
  leadName?: string;
  draft: CampaignDraft;
  onDraftChange: (partial: Partial<CampaignDraft>) => void;
  mediaOverrides: CampaignMediaOverrides;
  onMediaOverride: (key: keyof CampaignMediaOverrides, url: string) => void;
  onRegenerateWithMedia?: () => void;
  missingUnsubscribe?: boolean;
}

export function CampaignEditorPanel({
  leadId,
  leadName,
  draft,
  onDraftChange,
  mediaOverrides,
  onMediaOverride,
  onRegenerateWithMedia,
  missingUnsubscribe,
}: CampaignEditorPanelProps) {
  const editorRef = useRef<EmailHtmlEditorHandle>(null);
  const [fullPage, setFullPage] = useState(false);
  const [viewMode, setViewMode] = useState<FullPageViewMode>("editor");
  const [splitOrientation, setSplitOrientation] =
    useState<SplitOrientation>("horizontal");

  const previewHtml = useDebouncedValue(draft.htmlBody, 200);

  function exitFullPage() {
    setFullPage(false);
    setViewMode("editor");
  }

  useEffect(() => {
    if (!fullPage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") exitFullPage();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullPage]);

  const monacoEditor = (
    <EmailHtmlMonacoEditor
      ref={editorRef}
      value={draft.htmlBody}
      onChange={(html) => onDraftChange({ htmlBody: html })}
      leadId={leadId}
      height={fullPage ? "100%" : "calc(100vh - 380px)"}
      className={fullPage ? "h-full min-h-0 rounded-none border-0" : "h-full"}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {!fullPage ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Subject</span>
          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            value={draft.subject}
            onChange={(event) => onDraftChange({ subject: event.target.value })}
          />
        </label>
      ) : null}

      {!fullPage ? (
        <CampaignEditorDropZones
          leadId={leadId}
          htmlBody={draft.htmlBody}
          editorRef={editorRef}
          onHtmlChange={(html) => onDraftChange({ htmlBody: html })}
          mediaOverrides={mediaOverrides}
          onMediaOverride={onMediaOverride}
          onRegenerateWithMedia={onRegenerateWithMedia}
        />
      ) : null}

      <div
        className={
          fullPage
            ? "fixed inset-0 z-50 flex flex-col bg-white"
            : "flex flex-1 flex-col"
        }
      >
        {fullPage ? (
          <>
            <FullPageEditorToolbar
              leadName={leadName}
              subject={draft.subject}
              viewMode={viewMode}
              splitOrientation={splitOrientation}
              onViewModeChange={setViewMode}
              onSplitOrientationChange={setSplitOrientation}
              onExit={exitFullPage}
              missingUnsubscribe={missingUnsubscribe}
            />
            <EditorPreviewSplitPane
              viewMode={viewMode}
              splitOrientation={splitOrientation}
              previewHtml={previewHtml}
              editor={monacoEditor}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-0 py-0">
              <p className="text-sm font-medium text-zinc-700">HTML</p>
              <button
                type="button"
                onClick={() => setFullPage(true)}
                className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Full page
              </button>
            </div>

            <div className="min-h-[calc(100vh-380px)] flex-1">{monacoEditor}</div>

            <p className="mt-2 text-xs text-zinc-400">
              Ctrl+Space for suggestions · Esc exits full page
            </p>
          </>
        )}
      </div>

      {!fullPage && missingUnsubscribe ? (
        <p className="text-sm text-amber-700">
          Warning: HTML may be missing an unsubscribe link.
        </p>
      ) : null}

      {!fullPage ? (
        <details className="rounded-lg border border-zinc-200 bg-zinc-50">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-700">
            Plain text (optional)
          </summary>
          <div className="border-t border-zinc-200 p-4">
            <textarea
              className="min-h-[100px] w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs"
              value={draft.textBody}
              onChange={(event) =>
                onDraftChange({ textBody: event.target.value })
              }
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
