import { getCached, setCached } from "./geoCache";

const CSC_BASE_URL = "https://api.countrystatecity.in/v1";

export interface CscCountry {
  iso2: string;
  name: string;
}

export interface CscState {
  iso2: string;
  name: string;
  country_code?: string;
}

export interface CscCity {
  name: string;
}

function getApiKey(): string {
  const key = process.env.CSC_API_KEY;
  if (!key) {
    throw new Error("CSC_API_KEY is not configured");
  }
  return key;
}

async function cscFetch<T>(path: string): Promise<T> {
  const cacheKey = `csc:${path}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${CSC_BASE_URL}${path}`, {
    headers: {
      "X-CSCAPI-KEY": getApiKey(),
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CSC API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as T;
  setCached(cacheKey, data);
  return data;
}

function normalizeCountries(payload: unknown): CscCountry[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const record = item as Record<string, string>;
      return {
        iso2: record.iso2,
        name: record.name,
      };
    });
  }

  const wrapped = payload as { data?: unknown[] };
  if (Array.isArray(wrapped.data)) {
    return normalizeCountries(wrapped.data);
  }

  return [];
}

function normalizeStates(payload: unknown): CscState[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const record = item as Record<string, string>;
      return {
        iso2: record.iso2,
        name: record.name,
        country_code: record.country_code,
      };
    });
  }

  const wrapped = payload as { data?: unknown[] };
  if (Array.isArray(wrapped.data)) {
    return normalizeStates(wrapped.data);
  }

  return [];
}

function normalizeCities(payload: unknown): CscCity[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const record = item as Record<string, string>;
      return { name: record.name };
    });
  }

  const wrapped = payload as { data?: unknown[] };
  if (Array.isArray(wrapped.data)) {
    return normalizeCities(wrapped.data);
  }

  return [];
}

export async function getCountries(): Promise<CscCountry[]> {
  const payload = await cscFetch<unknown>("/countries");
  return normalizeCountries(payload).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStates(countryIso2: string): Promise<CscState[]> {
  const iso2 = countryIso2.toUpperCase();
  const payload = await cscFetch<unknown>(`/countries/${iso2}/states`);
  return normalizeStates(payload).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCities(
  countryIso2: string,
  stateIso2?: string,
): Promise<CscCity[]> {
  const country = countryIso2.toUpperCase();
  const path = stateIso2
    ? `/countries/${country}/states/${stateIso2.toUpperCase()}/cities`
    : `/countries/${country}/cities`;

  const payload = await cscFetch<unknown>(path);
  return normalizeCities(payload).sort((a, b) => a.name.localeCompare(b.name));
}
