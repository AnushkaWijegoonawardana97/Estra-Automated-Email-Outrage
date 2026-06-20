"use client";

interface CampaignTemplate {
  id: string;
  label: string;
  description: string;
}

const TEMPLATES: CampaignTemplate[] = [
  {
    id: "proposal_v1",
    label: "Visual Proposal",
    description: "Greeting, intro, SEO/UI audit, demo preview, capabilities, CTA",
  },
];

interface CampaignTemplatePickerProps {
  selectedId: string;
  onSelect: (templateId: string) => void;
  variant?: "cards" | "compact";
}

export function CampaignTemplatePicker({
  selectedId,
  onSelect,
  variant = "cards",
}: CampaignTemplatePickerProps) {
  if (variant === "compact") {
    return (
      <select
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        aria-label="Campaign template"
      >
        {TEMPLATES.map((template) => (
          <option key={template.id} value={template.id}>
            {template.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {TEMPLATES.map((template) => {
        const active = template.id === selectedId;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={`rounded-xl border p-4 text-left transition ${
              active
                ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">{template.label}</p>
            <p className="mt-1 text-xs text-zinc-500">{template.description}</p>
          </button>
        );
      })}
    </div>
  );
}
