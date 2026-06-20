"use client";

import type { ReactNode } from "react";
import { EmailHtmlPreview } from "@/components/atoms/EmailHtmlPreview";
import type {
  FullPageViewMode,
  SplitOrientation,
} from "@/components/molecules/FullPageEditorToolbar";

interface EditorPreviewSplitPaneProps {
  viewMode: FullPageViewMode;
  splitOrientation: SplitOrientation;
  previewHtml: string;
  editor: ReactNode;
  emptyPreviewMessage?: string;
}

function PreviewPane({
  previewHtml,
  emptyPreviewMessage,
  className = "",
}: {
  previewHtml: string;
  emptyPreviewMessage: string;
  className?: string;
}) {
  const hasContent = previewHtml.trim().length > 0;

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col bg-zinc-50 ${className}`}
    >
      <div className="shrink-0 border-b border-zinc-200 px-3 py-1.5">
        <p className="text-xs font-medium text-zinc-600">Live preview</p>
      </div>
      <div className="relative min-h-0 flex-1">
        {hasContent ? (
          <EmailHtmlPreview
            htmlBody={previewHtml}
            minHeight=""
            className="absolute inset-0 h-full min-h-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-400">
            {emptyPreviewMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export function EditorPreviewSplitPane({
  viewMode,
  splitOrientation,
  previewHtml,
  editor,
  emptyPreviewMessage = "Start typing HTML to see preview",
}: EditorPreviewSplitPaneProps) {
  const showEditor = viewMode === "editor" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";
  const isSplit = viewMode === "split";

  const containerClass = isSplit
    ? splitOrientation === "horizontal"
      ? "flex flex-row"
      : "flex flex-col"
    : "flex flex-col";

  const editorClass = isSplit
    ? splitOrientation === "horizontal"
      ? "w-1/2 border-r border-zinc-200"
      : "h-1/2 border-b border-zinc-200"
    : "flex-1";

  const previewClass = isSplit
    ? splitOrientation === "horizontal"
      ? "w-1/2"
      : "h-1/2"
    : "flex-1";

  return (
    <div className={`min-h-0 flex-1 ${containerClass}`}>
      <div
        className={`flex min-h-0 min-w-0 flex-col ${
          showEditor ? editorClass : "hidden"
        }`}
      >
        {editor}
      </div>
      <div
        className={`min-h-0 min-w-0 ${
          showPreview ? `${previewClass} flex flex-col` : "hidden"
        }`}
      >
        <PreviewPane
          previewHtml={previewHtml}
          emptyPreviewMessage={emptyPreviewMessage}
          className="h-full"
        />
      </div>
    </div>
  );
}
