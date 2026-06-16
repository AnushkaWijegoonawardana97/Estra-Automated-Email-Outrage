"use client";

import { CountryCityPicker } from "@/components/molecules/CountryCityPicker";
import { ScrapePreviewPanel } from "@/components/molecules/ScrapePreviewPanel";
import { SearchTermsEditor } from "@/components/molecules/SearchTermsEditor";
import {
  DEFAULT_SCRAPE_QUERY_TEMPLATE,
  type SearchTerm,
  type TargetCountry,
} from "@/lib/targetMarkets";

export interface TargetMarketsConfig {
  targetCountries: TargetCountry[];
  searchTerms: SearchTerm[];
  scrapeQueryTemplate: string;
}

interface TargetMarketsSettingsProps {
  value: TargetMarketsConfig;
  onChange: (value: TargetMarketsConfig) => void;
}

export function TargetMarketsSettings({ value, onChange }: TargetMarketsSettingsProps) {
  const targetCountries = value.targetCountries ?? [];
  const searchTerms = value.searchTerms ?? [];
  const scrapeQueryTemplate =
    value.scrapeQueryTemplate ?? DEFAULT_SCRAPE_QUERY_TEMPLATE;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <CountryCityPicker
          countries={targetCountries}
          onChange={(nextCountries) =>
            onChange({ targetCountries: nextCountries, searchTerms, scrapeQueryTemplate })
          }
        />
        <SearchTermsEditor
          terms={searchTerms}
          onChange={(nextTerms) =>
            onChange({ targetCountries, searchTerms: nextTerms, scrapeQueryTemplate })
          }
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          Scrape query template
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs"
            value={scrapeQueryTemplate}
            onChange={(event) =>
              onChange({
                targetCountries,
                searchTerms,
                scrapeQueryTemplate: event.target.value,
              })
            }
            placeholder={DEFAULT_SCRAPE_QUERY_TEMPLATE}
          />
        </label>
        <ScrapePreviewPanel
          targetCountries={targetCountries}
          searchTerms={searchTerms}
          scrapeQueryTemplate={scrapeQueryTemplate}
        />
      </div>
    </div>
  );
}
