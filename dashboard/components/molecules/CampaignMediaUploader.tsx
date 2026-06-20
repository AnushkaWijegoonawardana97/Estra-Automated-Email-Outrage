"use client";

import type { CampaignMediaOverrides } from "@/lib/cloudinary";

interface MediaSlotConfig {
  key: keyof CampaignMediaOverrides;
  label: string;
  accept: string;
}

const SLOTS: MediaSlotConfig[] = [
  { key: "seoReportUrl", label: "SEO report", accept: "image/*" },
  { key: "uiIssuesUrl", label: "UI issues", accept: "image/*" },
  { key: "demoPreviewUrl", label: "Demo preview", accept: "image/*" },
  { key: "demoVideoUrl", label: "Demo video", accept: "video/*,image/*" },
];

interface CampaignMediaUploaderProps {
  leadId: string;
  values: CampaignMediaOverrides;
  defaults: Partial<Record<keyof CampaignMediaOverrides, string>>;
  onChange: (values: CampaignMediaOverrides) => void;
}

export function CampaignMediaUploader({
  leadId,
  values,
  defaults,
  onChange,
}: CampaignMediaUploaderProps) {
  async function uploadSlot(
    slot: keyof CampaignMediaOverrides,
    file: File,
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("leadId", leadId);
    formData.append("slot", slot);

    const response = await fetch("/api/campaigns/media", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Upload failed");
    }

    onChange({
      ...values,
      [slot]: payload.deliveryUrl ?? payload.secureUrl,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium text-zinc-900">Campaign media</p>
      {SLOTS.map((slot) => {
        const current = values[slot.key] ?? defaults[slot.key] ?? "";
        return (
          <div
            key={slot.key}
            className="flex flex-col gap-2 rounded-md border border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-700">{slot.label}</p>
              {current ? (
                <p className="truncate text-xs text-zinc-500">{current}</p>
              ) : (
                <p className="text-xs text-zinc-400">Using default asset</p>
              )}
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                Upload
                <input
                  type="file"
                  accept={slot.accept}
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      await uploadSlot(slot.key, file);
                    } catch (error) {
                      alert(
                        error instanceof Error ? error.message : "Upload failed",
                      );
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              {defaults[slot.key] ? (
                <button
                  type="button"
                  className="rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
                  onClick={() =>
                    onChange({
                      ...values,
                      [slot.key]: defaults[slot.key],
                    })
                  }
                >
                  Use default
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
