"use client";

import { useState } from "react";
import { TargetMarketsSettings } from "@/components/organisms/TargetMarketsSettings";
import { migrateTargetMarketsConfig } from "@/lib/migrateTargetMarkets";
import type { SearchTerm, TargetCountry } from "@/lib/targetMarkets";

interface ConfigData {
  minRating: number;
  requireNoWebsite: boolean;
  weakWebsiteDomains: string[];
  maxEmailsPerDay: number;
  sendDays: string[];
  sendHourStart: number;
  sendHourEnd: number;
  followUpDelayDays: number;
  maxFollowUps: number;
  targetedFollowUpDelayDays: number;
  openedFollowUpDelayDays: number;
  fromEmail: string;
  fromName: string;
  targetCountries: TargetCountry[];
  searchTerms: SearchTerm[];
  scrapeQueryTemplate: string;
  emailPrompts: {
    initialEmail: string;
    followupGeneric: string;
    followupTargeted: string;
    enrichmentSummary: string;
  };
}

const tabs = [
  "Target Markets",
  "Filter Rules",
  "Sending Rules",
  "Sender Identity",
  "Email Content Prompts",
] as const;

export function SettingsTabs({ initialConfig }: { initialConfig: ConfigData }) {
  const [config, setConfig] = useState(() =>
    migrateTargetMarketsConfig(initialConfig as ConfigData & Record<string, unknown>),
  );
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Target Markets");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    setSaveError(null);
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const updated = await response.json();
    if (!response.ok) {
      setSaveError(updated.error ?? "Failed to save settings");
      return;
    }
    setConfig(migrateTargetMarketsConfig(updated as ConfigData & Record<string, unknown>));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-2 text-sm ${
              activeTab === tab
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        {activeTab === "Target Markets" && (
          <TargetMarketsSettings
            value={{
              targetCountries: config.targetCountries,
              searchTerms: config.searchTerms,
              scrapeQueryTemplate: config.scrapeQueryTemplate,
            }}
            onChange={(targetMarkets) =>
              setConfig((current) => ({ ...current, ...targetMarkets }))
            }
          />
        )}

        {activeTab === "Filter Rules" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Minimum rating
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                value={config.minRating}
                onChange={(event) =>
                  setConfig({ ...config, minRating: Number(event.target.value) })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.requireNoWebsite}
                onChange={(event) =>
                  setConfig({ ...config, requireNoWebsite: event.target.checked })
                }
              />
              Require no website
            </label>
            <label className="text-sm md:col-span-2">
              Weak website domains (one per line)
              <textarea
                className="mt-1 w-full rounded-md border border-zinc-300 p-2"
                rows={4}
                value={config.weakWebsiteDomains.join("\n")}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    weakWebsiteDomains: event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
        )}

        {activeTab === "Sending Rules" && (
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["maxEmailsPerDay", "Max emails per day"],
                ["followUpDelayDays", "No-open follow-up delay (days)"],
                ["openedFollowUpDelayDays", "Opened follow-up delay (days)"],
                ["targetedFollowUpDelayDays", "Click follow-up delay (days)"],
                ["maxFollowUps", "Max follow-ups"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  value={config[key]}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      [key]: Number(event.target.value),
                    })
                  }
                />
              </label>
            ))}
            <p className="text-sm text-zinc-500 md:col-span-2">
              Initial emails send immediately after scrape and enrich (subject to daily cap).
              Follow-ups use the delay days above.
            </p>
          </div>
        )}

        {activeTab === "Sender Identity" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              From name
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                value={config.fromName}
                onChange={(event) =>
                  setConfig({ ...config, fromName: event.target.value })
                }
              />
            </label>
            <label className="text-sm">
              From email
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                value={config.fromEmail}
                onChange={(event) =>
                  setConfig({ ...config, fromEmail: event.target.value })
                }
              />
            </label>
            <p className="text-sm text-zinc-500 md:col-span-2">
              Brevo and Anthropic API keys are configured via environment variables on Vercel and Render.
            </p>
          </div>
        )}

        {activeTab === "Email Content Prompts" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              These prompts control AI-generated personalisation slots only. Email layout,
              branding, and service links are fixed in pipeline templates.
            </p>
            {(
              [
                ["initialEmail", "Initial email content"],
                ["followupGeneric", "Generic follow-up content"],
                ["followupTargeted", "Targeted follow-up content"],
                ["enrichmentSummary", "Enrichment summary"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                {label}
                <textarea
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 font-mono text-xs"
                  rows={6}
                  value={config.emailPrompts[key]}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      emailPrompts: {
                        ...config.emailPrompts,
                        [key]: event.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Save settings
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </div>
  );
}
