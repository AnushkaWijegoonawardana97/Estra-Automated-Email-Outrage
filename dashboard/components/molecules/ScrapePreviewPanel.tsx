"use client";

import { buildScrapeJobs, type SearchTerm, type TargetCountry } from "@/lib/targetMarkets";

interface ScrapePreviewPanelProps {
  targetCountries: TargetCountry[];
  searchTerms: SearchTerm[];
  scrapeQueryTemplate: string;
}

export function ScrapePreviewPanel({
  targetCountries,
  searchTerms,
  scrapeQueryTemplate,
}: ScrapePreviewPanelProps) {
  const jobs = buildScrapeJobs({
    targetCountries,
    searchTerms,
    scrapeQueryTemplate,
  });

  const enabledCountries = targetCountries.filter((country) => country.enabled).length;
  const enabledCities = targetCountries
    .filter((country) => country.enabled)
    .reduce((count, country) => count + country.cities.filter((city) => city.enabled).length, 0);
  const enabledTerms = searchTerms.filter((term) => term.enabled).length;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">Scrape preview</h3>
      <p className="text-sm text-zinc-600">
        {enabledCountries} countries × {enabledCities} cities × {enabledTerms} terms ={" "}
        <span className="font-medium text-zinc-900">{jobs.length} queries</span>
      </p>

      <label className="block text-xs text-zinc-500">
        Query template
        <input
          readOnly
          value={scrapeQueryTemplate}
          className="mt-1 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700"
        />
      </label>

      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-500">Enable at least one country, city, and search term.</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-zinc-100 bg-zinc-50 p-3 font-mono text-xs text-zinc-700">
          {jobs.slice(0, 20).map((job) => (
            <li key={`${job.query}-${job.city}-${job.term}`}>{job.query}</li>
          ))}
          {jobs.length > 20 && (
            <li className="text-zinc-500">…and {jobs.length - 20} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
