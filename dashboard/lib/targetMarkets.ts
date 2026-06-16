export interface TargetCity {
  name: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface TargetCountry {
  id: string;
  iso2: string;
  name: string;
  stateIso2?: string;
  stateName?: string;
  enabled: boolean;
  cities: TargetCity[];
}

export interface SearchTerm {
  id: string;
  term: string;
  enabled: boolean;
}

export interface ScrapeJob {
  query: string;
  term: string;
  city: string;
  country: string;
  countryLabel: string;
  iso2: string;
}

export const DEFAULT_SCRAPE_QUERY_TEMPLATE = "{term} near {city} {country}";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getCountryLabel(target: TargetCountry): string {
  return target.stateName?.trim() || target.name.trim();
}

export function buildTargetCountryId(
  iso2: string,
  stateIso2?: string,
): string {
  return stateIso2 ? `${iso2.toLowerCase()}-${stateIso2.toLowerCase()}` : iso2.toLowerCase();
}

export function renderScrapeQuery(
  template: string,
  term: string,
  city: string,
  countryLabel: string,
): string {
  return template
    .replace(/\{term\}/g, term.trim().toLowerCase())
    .replace(/\{city\}/g, city.trim().toLowerCase())
    .replace(/\{country\}/g, countryLabel.trim().toLowerCase())
    .replace(/\s+/g, " ")
    .trim();
}

export function buildScrapeJobs(config: {
  targetCountries?: TargetCountry[];
  searchTerms?: SearchTerm[];
  scrapeQueryTemplate?: string;
}): ScrapeJob[] {
  const template = config.scrapeQueryTemplate ?? DEFAULT_SCRAPE_QUERY_TEMPLATE;
  const jobs: ScrapeJob[] = [];

  for (const target of config.targetCountries ?? []) {
    if (!target.enabled) continue;

    const countryLabel = getCountryLabel(target);

    for (const city of target.cities ?? []) {
      if (!city.enabled) continue;

      for (const searchTerm of config.searchTerms ?? []) {
        if (!searchTerm.enabled) continue;

        jobs.push({
          query: renderScrapeQuery(template, searchTerm.term, city.name, countryLabel),
          term: searchTerm.term,
          city: city.name,
          country: target.name,
          countryLabel,
          iso2: target.iso2,
        });
      }
    }
  }

  return jobs;
}

export const defaultSearchTerms: SearchTerm[] = [
  "salons",
  "gyms",
  "restaurants",
  "clinics",
  "retail shops",
  "lawyers",
  "cafes",
  "hotels",
].map((term) => ({
  id: slugify(term),
  term,
  enabled: true,
}));

export const defaultTargetCountries: TargetCountry[] = [
  {
    id: "lk",
    iso2: "LK",
    name: "Sri Lanka",
    enabled: true,
    cities: [
      { name: "Colombo", enabled: true },
      { name: "Kandy", enabled: false },
      { name: "Galle", enabled: false },
    ],
  },
  {
    id: "gb-sct",
    iso2: "GB",
    name: "United Kingdom",
    stateIso2: "SCT",
    stateName: "Scotland",
    enabled: true,
    cities: [
      { name: "Glasgow", enabled: true },
      { name: "Edinburgh", enabled: false },
    ],
  },
  {
    id: "gb",
    iso2: "GB",
    name: "United Kingdom",
    enabled: false,
    cities: [
      { name: "London", enabled: false },
      { name: "Manchester", enabled: false },
    ],
  },
  {
    id: "us",
    iso2: "US",
    name: "United States",
    enabled: false,
    cities: [{ name: "New York", enabled: false }],
  },
  {
    id: "ca",
    iso2: "CA",
    name: "Canada",
    enabled: false,
    cities: [{ name: "Toronto", enabled: false }],
  },
  {
    id: "au",
    iso2: "AU",
    name: "Australia",
    enabled: false,
    cities: [{ name: "Sydney", enabled: false }],
  },
  {
    id: "nz",
    iso2: "NZ",
    name: "New Zealand",
    enabled: false,
    cities: [{ name: "Auckland", enabled: false }],
  },
  {
    id: "ae",
    iso2: "AE",
    name: "United Arab Emirates",
    enabled: false,
    cities: [{ name: "Dubai", enabled: false }],
  },
];
