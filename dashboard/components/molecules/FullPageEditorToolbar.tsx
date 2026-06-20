"use client";

export type FullPageViewMode = "editor" | "split" | "preview";
export type SplitOrientation = "horizontal" | "vertical";

interface FullPageEditorToolbarProps {
  leadName?: string;
  subject: string;
  viewMode: FullPageViewMode;
  splitOrientation: SplitOrientation;
  onViewModeChange: (mode: FullPageViewMode) => void;
  onSplitOrientationChange: (orientation: SplitOrientation) => void;
  onExit: () => void;
  missingUnsubscribe?: boolean;
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}

export function FullPageEditorToolbar({
  leadName,
  subject,
  viewMode,
  splitOrientation,
  onViewModeChange,
  onSplitOrientationChange,
  onExit,
  missingUnsubscribe,
}: FullPageEditorToolbarProps) {
  return (
    <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-700">HTML editor</p>
          <p className="truncate text-xs text-zinc-500">
            {leadName ? `${leadName} · ` : ""}
            {subject || "No subject"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5"
            role="group"
            aria-label="View mode"
          >
            <ModeButton
              label="Editor"
              active={viewMode === "editor"}
              onClick={() => onViewModeChange("editor")}
            />
            <ModeButton
              label="Split"
              active={viewMode === "split"}
              onClick={() => onViewModeChange("split")}
            />
            <ModeButton
              label="Preview"
              active={viewMode === "preview"}
              onClick={() => onViewModeChange("preview")}
            />
          </div>

          {viewMode === "split" ? (
            <select
              value={splitOrientation}
              onChange={(event) =>
                onSplitOrientationChange(
                  event.target.value as SplitOrientation,
                )
              }
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
              aria-label="Split orientation"
            >
              <option value="horizontal">Side-by-side</option>
              <option value="vertical">Stacked</option>
            </select>
          ) : null}

          <button
            type="button"
            onClick={onExit}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Exit full page
          </button>
        </div>
      </div>

      {missingUnsubscribe ? (
        <p className="mt-2 text-xs text-amber-700">
          Warning: HTML may be missing an unsubscribe link.
        </p>
      ) : null}
    </div>
  );
}
