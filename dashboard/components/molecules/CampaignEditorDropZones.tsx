"use client";

import { useCallback, useRef, useState, type DragEvent, type RefObject } from "react";
import type { EmailHtmlEditorHandle } from "@/components/atoms/EmailHtmlMonacoEditor";
import type { CampaignMediaOverrides } from "@/lib/cloudinary";
import {
  buildImageSnippet,
  buildVideoLinkSnippet,
} from "@/lib/insertHtmlAtCursor";
import { uploadCampaignMedia } from "@/lib/uploadCampaignMedia";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

interface PendingAsset {
  url: string;
  kind: "image" | "video" | "link";
  label: string;
}

interface CampaignEditorDropZonesProps {
  leadId: string;
  htmlBody: string;
  editorRef: RefObject<EmailHtmlEditorHandle | null>;
  onHtmlChange: (html: string) => void;
  mediaOverrides: CampaignMediaOverrides;
  onMediaOverride: (key: keyof CampaignMediaOverrides, url: string) => void;
  onRegenerateWithMedia?: () => void;
}

function DropZone({
  label,
  hint,
  accept,
  uploading,
  error,
  onDropFile,
  onPickFile,
  children,
}: {
  label: string;
  hint: string;
  accept?: string;
  uploading: boolean;
  error?: string | null;
  onDropFile: (file: File) => void;
  onPickFile?: (file: File) => void;
  children?: React.ReactNode;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) onDropFile(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[100px] flex-1 flex-col rounded-lg border-2 border-dashed p-3 transition ${
        dragOver
          ? "border-violet-500 bg-violet-50"
          : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-800">{label}</p>
          <p className="text-xs text-zinc-500">{hint}</p>
        </div>
        {accept ? (
          <>
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="shrink-0 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Browse"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && onPickFile) onPickFile(file);
                event.target.value = "";
              }}
            />
          </>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {children ? <div className="mt-2 flex-1">{children}</div> : null}
    </div>
  );
}

function AssetActions({
  asset,
  onInsert,
  onCopy,
  onReplaceSeo,
  onReplaceUi,
  onReplaceDemo,
}: {
  asset: PendingAsset;
  onInsert: () => void;
  onCopy: () => void;
  onReplaceSeo?: () => void;
  onReplaceUi?: () => void;
  onReplaceDemo?: () => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      <p className="truncate text-xs text-zinc-500" title={asset.url}>
        {asset.label}
      </p>
      <div className="flex flex-wrap gap-1">
        <ActionChip label="Insert at cursor" onClick={onInsert} />
        <ActionChip label="Copy URL" onClick={onCopy} />
        {asset.kind === "image" && onReplaceSeo ? (
          <ActionChip label="SEO slot" onClick={onReplaceSeo} />
        ) : null}
        {asset.kind === "image" && onReplaceUi ? (
          <ActionChip label="UI slot" onClick={onReplaceUi} />
        ) : null}
        {(asset.kind === "image" || asset.kind === "video") && onReplaceDemo ? (
          <ActionChip label="Demo slot" onClick={onReplaceDemo} />
        ) : null}
      </div>
    </div>
  );
}

function ActionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
    >
      {label}
    </button>
  );
}

export function CampaignEditorDropZones({
  leadId,
  htmlBody,
  editorRef,
  onHtmlChange,
  mediaOverrides,
  onMediaOverride,
  onRegenerateWithMedia,
}: CampaignEditorDropZonesProps) {
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingAsset | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingAsset | null>(null);
  const [pendingLink, setPendingLink] = useState<PendingAsset | null>(null);

  const insertSnippet = useCallback(
    (snippet: string) => {
      if (editorRef.current) {
        editorRef.current.insertAtCursor(snippet);
        return;
      }
      onHtmlChange(htmlBody + snippet);
    },
    [htmlBody, editorRef, onHtmlChange],
  );

  async function handleFileUpload(
    file: File,
    slot: string,
    kind: "image" | "video",
  ) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("File must be under 50MB");
    }
    const result = await uploadCampaignMedia(leadId, slot, file);
    return { url: result.deliveryUrl, kind, label: file.name };
  }

  async function onImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setImageError("Please drop an image file");
      return;
    }
    setImageError(null);
    setImageUploading(true);
    try {
      const asset = await handleFileUpload(file, "image", "image");
      setPendingImage(asset);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setImageUploading(false);
    }
  }

  async function onVideoFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setVideoError("Please drop a video file");
      return;
    }
    setVideoError(null);
    setVideoUploading(true);
    try {
      const asset = await handleFileUpload(file, "video", "video");
      setPendingVideo(asset);
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setVideoUploading(false);
    }
  }

  function applyMediaSlot(key: keyof CampaignMediaOverrides, url: string) {
    onMediaOverride(key, url);
    onRegenerateWithMedia?.();
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 lg:flex-row">
        <DropZone
          label="Image"
          hint="Drop image or browse"
          accept="image/*"
          uploading={imageUploading}
          error={imageError}
          onDropFile={onImageFile}
          onPickFile={onImageFile}
        >
          {pendingImage ? (
            <AssetActions
              asset={pendingImage}
              onInsert={() => insertSnippet(buildImageSnippet(pendingImage.url))}
              onCopy={() => copyUrl(pendingImage.url)}
              onReplaceSeo={() => applyMediaSlot("seoReportUrl", pendingImage.url)}
              onReplaceUi={() => applyMediaSlot("uiIssuesUrl", pendingImage.url)}
              onReplaceDemo={() =>
                applyMediaSlot("demoPreviewUrl", pendingImage.url)
              }
            />
          ) : mediaOverrides.seoReportUrl ? (
            <p className="text-xs text-zinc-400">SEO slot set</p>
          ) : null}
        </DropZone>

        <DropZone
          label="Video"
          hint="Drop video or browse"
          accept="video/*"
          uploading={videoUploading}
          error={videoError}
          onDropFile={onVideoFile}
          onPickFile={onVideoFile}
        >
          {pendingVideo ? (
            <AssetActions
              asset={pendingVideo}
              onInsert={() => insertSnippet(buildVideoLinkSnippet(pendingVideo.url))}
              onCopy={() => copyUrl(pendingVideo.url)}
              onReplaceDemo={() =>
                applyMediaSlot("demoVideoUrl", pendingVideo.url)
              }
            />
          ) : null}
        </DropZone>

        <DropZone
          label="Link"
          hint="Paste URL and insert"
          uploading={false}
          error={null}
          onDropFile={() => {}}
        >
          <input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
          />
          <input
            type="text"
            placeholder="Link label (optional)"
            value={linkLabel}
            onChange={(event) => setLinkLabel(event.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={!linkUrl.trim()}
            onClick={() => {
              const url = linkUrl.trim();
              setPendingLink({ url, kind: "link", label: linkLabel || url });
              if (editorRef.current) {
                editorRef.current.wrapSelectionAsLink(url, linkLabel || undefined);
              } else {
                insertSnippet(`<a href="${url}">${linkLabel || url}</a>`);
              }
              setLinkUrl("");
              setLinkLabel("");
            }}
            className="mt-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            Insert link
          </button>
          {pendingLink ? (
            <AssetActions
              asset={pendingLink}
              onInsert={() => {
                if (editorRef.current) {
                  editorRef.current.wrapSelectionAsLink(
                    pendingLink.url,
                    linkLabel || undefined,
                  );
                }
              }}
              onCopy={() => copyUrl(pendingLink.url)}
            />
          ) : null}
        </DropZone>
      </div>
    </div>
  );
}
