"use client";

import { useRouter } from "next/navigation";

interface LeadsBulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClear: () => void;
}

export function LeadsBulkActionBar({
  selectedCount,
  selectedIds,
  onClear,
}: LeadsBulkActionBarProps) {
  const router = useRouter();

  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
      <p className="text-sm font-medium text-violet-900">
        {selectedCount} lead{selectedCount === 1 ? "" : "s"} selected
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            router.push(`/campaigns/new?leadIds=${selectedIds.join(",")}`)
          }
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Personalize Campaign
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-violet-200 bg-white px-4 py-2 text-sm text-violet-900"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
