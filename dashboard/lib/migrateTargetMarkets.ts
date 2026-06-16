import {
  DEFAULT_SCRAPE_QUERY_TEMPLATE,
  buildTargetCountryId,
  defaultSearchTerms,
  defaultTargetCountries,
  slugify,
  type SearchTerm,
  type TargetCountry,
} from "./targetMarkets";

interface LegacyCity {
  city?: string;
  enabled?: boolean;
  searchQueries?: string[];
}

interface LegacySearchTarget {
  country?: string;
  countryCode?: string;
  enabled?: boolean;
  cities?: LegacyCity[];
}

interface ConfigLike {
  searchTargets?: LegacySearchTarget[];
  targetCountries?: TargetCountry[];
  searchTerms?: SearchTerm[];
  scrapeQueryTemplate?: string;
}

function extractTermsFromLegacy(targets: LegacySearchTarget[]): SearchTerm[] {
  const terms = new Set<string>();

  for (const target of targets) {
    for (const city of target.cities ?? []) {
      for (const query of city.searchQueries ?? []) {
        const firstWord = query.trim().split(/\s+/)[0];
        if (firstWord) terms.add(firstWord.toLowerCase());
      }
    }
  }

  if (terms.size === 0) return defaultSearchTerms;

  return Array.from(terms).map((term) => ({
    id: slugify(term),
    term,
    enabled: true,
  }));
}

function migrateFromLegacy(targets: LegacySearchTarget[]): TargetCountry[] {
  const migrated: TargetCountry[] = [];

  for (const target of targets) {
    const iso2 = (target.countryCode ?? slugify(target.country ?? "")).toUpperCase();
    const id = buildTargetCountryId(iso2);

    migrated.push({
      id,
      iso2,
      name: target.country ?? iso2,
      enabled: target.enabled ?? true,
      cities: (target.cities ?? []).map((city) => ({
        name: city.city ?? "",
        enabled: city.enabled ?? true,
      })).filter((city) => city.name),
    });
  }

  return migrated;
}

function dedupeCountries(countries: TargetCountry[]): TargetCountry[] {
  const map = new Map<string, TargetCountry>();

  for (const country of countries) {
    const key = country.id;
    const existing = map.get(key);

    map.set(key, {
      ...country,
      enabled: country.enabled,
      cities: dedupeCities([...(existing?.cities ?? []), ...(country.cities ?? [])]),
    });
  }

  return Array.from(map.values());
}

function dedupeCities(cities: TargetCountry["cities"]) {
  const map = new Map<string, TargetCountry["cities"][number]>();

  for (const city of cities) {
    const key = city.name.toLowerCase();
    map.set(key, {
      ...city,
      enabled: city.enabled,
      isCustom: city.isCustom,
    });
  }

  return Array.from(map.values());
}

function dedupeTerms(terms: SearchTerm[]): SearchTerm[] {
  const map = new Map<string, SearchTerm>();

  for (const term of terms) {
    const key = term.term.toLowerCase();
    map.set(key, {
      id: term.id || slugify(term.term),
      term: term.term.trim(),
      enabled: term.enabled,
    });
  }

  return Array.from(map.values()).filter((term) => term.term);
}

export function migrateTargetMarketsConfig<T extends ConfigLike>(config: T): T {
  let targetCountries: TargetCountry[];

  if (Array.isArray(config.targetCountries)) {
    targetCountries = config.targetCountries;
  } else if (config.searchTargets?.length) {
    targetCountries = migrateFromLegacy(config.searchTargets);
  } else {
    targetCountries = defaultTargetCountries;
  }

  let searchTerms: SearchTerm[];

  if (Array.isArray(config.searchTerms)) {
    searchTerms = config.searchTerms;
  } else if (config.searchTargets?.length) {
    searchTerms = extractTermsFromLegacy(config.searchTargets);
  } else {
    searchTerms = defaultSearchTerms;
  }

  targetCountries = dedupeCountries(
    targetCountries.map((country) => ({
      ...country,
      id: country.id || buildTargetCountryId(country.iso2, country.stateIso2),
      iso2: (country.iso2 ?? "").toUpperCase(),
      name: (country.name ?? "").trim(),
      cities: dedupeCities(country.cities ?? []),
    })),
  );

  searchTerms = dedupeTerms(searchTerms);

  const scrapeQueryTemplate =
    config.scrapeQueryTemplate?.includes("{term}") &&
    config.scrapeQueryTemplate.includes("{city}") &&
    config.scrapeQueryTemplate.includes("{country}")
      ? config.scrapeQueryTemplate
      : DEFAULT_SCRAPE_QUERY_TEMPLATE;

  return {
    ...config,
    targetCountries,
    searchTerms,
    scrapeQueryTemplate,
  };
}

export function validateTargetMarketsConfig(config: ConfigLike): string | null {
  const template = config.scrapeQueryTemplate ?? DEFAULT_SCRAPE_QUERY_TEMPLATE;

  if (!template.includes("{term}") || !template.includes("{city}") || !template.includes("{country}")) {
    return "scrapeQueryTemplate must include {term}, {city}, and {country}";
  }

  return null;
}
