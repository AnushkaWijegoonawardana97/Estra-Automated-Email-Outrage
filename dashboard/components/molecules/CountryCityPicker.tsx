"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildTargetCountryId,
  type TargetCity,
  type TargetCountry,
} from "@/lib/targetMarkets";

interface CscCountry {
  iso2: string;
  name: string;
}

interface CscState {
  iso2: string;
  name: string;
}

interface CscCity {
  name: string;
}

interface CountryCityPickerProps {
  countries?: TargetCountry[];
  onChange: (countries: TargetCountry[]) => void;
}

const PRIORITY_ISO2 = new Set(["LK", "GB", "US", "CA", "AU", "NZ", "AE"]);

function sortCountries(list: CscCountry[]): CscCountry[] {
  return [...list].sort((a, b) => {
    const aPriority = PRIORITY_ISO2.has(a.iso2) ? 0 : 1;
    const bPriority = PRIORITY_ISO2.has(b.iso2) ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });
}

export function CountryCityPicker({ countries = [], onChange }: CountryCityPickerProps) {
  const [catalogCountries, setCatalogCountries] = useState<CscCountry[]>([]);
  const [catalogStates, setCatalogStates] = useState<CscState[]>([]);
  const [catalogCities, setCatalogCities] = useState<CscCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CscCountry | null>(null);
  const [selectedState, setSelectedState] = useState<CscState | null>(null);
  const [citySearch, setCitySearch] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [pendingCities, setPendingCities] = useState<TargetCity[]>([]);

  const loadCountries = useCallback(async () => {
    setLoading(true);
    setGeoError(null);
    try {
      const response = await fetch("/api/geo/countries");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load countries");
      }
      setCatalogCountries(sortCountries(payload));
    } catch (error) {
      setGeoError(error instanceof Error ? error.message : "Failed to load countries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    if (!selectedCountry) {
      setCatalogStates([]);
      setSelectedState(null);
      return;
    }

    async function loadStates() {
      const response = await fetch(
        `/api/geo/states?country=${encodeURIComponent(selectedCountry!.iso2)}`,
      );
      const payload = await response.json();
      if (response.ok) {
        setCatalogStates(payload);
      } else {
        setCatalogStates([]);
      }
      setSelectedState(null);
    }

    void loadStates();
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedCountry) {
      setCatalogCities([]);
      return;
    }

    async function loadCities() {
      const params = new URLSearchParams({ country: selectedCountry!.iso2 });
      if (selectedState) params.set("state", selectedState.iso2);
      const response = await fetch(`/api/geo/cities?${params.toString()}`);
      const payload = await response.json();
      if (response.ok) {
        setCatalogCities(payload);
      } else {
        setCatalogCities([]);
      }
    }

    void loadCities();
  }, [selectedCountry, selectedState]);

  const filteredCatalogCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return catalogCountries;
    return catalogCountries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.iso2.toLowerCase().includes(query),
    );
  }, [catalogCountries, countrySearch]);

  const filteredCatalogCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return catalogCities;
    return catalogCities.filter((city) => city.name.toLowerCase().includes(query));
  }, [catalogCities, citySearch]);

  function updateCountry(id: string, patch: Partial<TargetCountry>) {
    onChange(
      countries.map((country) => (country.id === id ? { ...country, ...patch } : country)),
    );
  }

  function updateCity(countryId: string, cityName: string, patch: Partial<TargetCity>) {
    onChange(
      countries.map((country) => {
        if (country.id !== countryId) return country;
        return {
          ...country,
          cities: (country.cities ?? []).map((city) =>
            city.name === cityName ? { ...city, ...patch } : city,
          ),
        };
      }),
    );
  }

  function removeCountry(id: string) {
    onChange(countries.filter((country) => country.id !== id));
  }

  function removeCity(countryId: string, cityName: string) {
    onChange(
      countries.map((country) => {
        if (country.id !== countryId) return country;
        return {
          ...country,
          cities: (country.cities ?? []).filter((city) => city.name !== cityName),
        };
      }),
    );
  }

  function togglePendingCity(name: string) {
    setPendingCities((current) => {
      const existing = current.find((city) => city.name === name);
      if (existing) {
        return current.filter((city) => city.name !== name);
      }
      return [...current, { name, enabled: true }];
    });
  }

  function addCustomCity() {
    const trimmed = customCity.trim();
    if (!trimmed) return;
    if (pendingCities.some((city) => city.name.toLowerCase() === trimmed.toLowerCase())) return;
    setPendingCities((current) => [...current, { name: trimmed, enabled: true, isCustom: true }]);
    setCustomCity("");
  }

  function confirmAddCountry() {
    if (!selectedCountry) return;

    const id = buildTargetCountryId(selectedCountry.iso2, selectedState?.iso2);
    const next: TargetCountry = {
      id,
      iso2: selectedCountry.iso2,
      name: selectedCountry.name,
      stateIso2: selectedState?.iso2,
      stateName: selectedState?.name,
      enabled: true,
      cities: pendingCities,
    };

    const existingIndex = countries.findIndex((country) => country.id === id);
    if (existingIndex >= 0) {
      const existing = countries[existingIndex];
      const mergedCities = [...(existing.cities ?? [])];
      for (const city of pendingCities) {
        if (!mergedCities.some((item) => item.name.toLowerCase() === city.name.toLowerCase())) {
          mergedCities.push(city);
        }
      }
      const nextCountries = [...countries];
      nextCountries[existingIndex] = { ...existing, cities: mergedCities, enabled: true };
      onChange(nextCountries);
    } else {
      onChange([...countries, next]);
    }

    setShowAdd(false);
    setSelectedCountry(null);
    setSelectedState(null);
    setPendingCities([]);
    setCountrySearch("");
    setCitySearch("");
    setCustomCity("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Countries & cities</h3>
          <p className="text-xs text-zinc-500">
            Add markets from the Country State City catalog or custom cities.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((value) => !value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {showAdd ? "Cancel" : "Add country"}
        </button>
      </div>

      {geoError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {geoError}
          {geoError.includes("CSC_API_KEY") && (
            <span> Set CSC_API_KEY in dashboard/.env and restart the dev server.</span>
          )}
        </div>
      )}

      {showAdd && (
        <div className="space-y-4 rounded-md border border-zinc-200 p-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading countries…</p>
          ) : (
            <>
              <label className="block text-sm">
                Search country
                <input
                  value={countrySearch}
                  onChange={(event) => setCountrySearch(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  placeholder="Sri Lanka, United Kingdom…"
                />
              </label>

              <div className="max-h-40 overflow-y-auto rounded-md border border-zinc-100">
                {filteredCatalogCountries.slice(0, 50).map((country) => (
                  <button
                    key={country.iso2}
                    type="button"
                    onClick={() => setSelectedCountry(country)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                      selectedCountry?.iso2 === country.iso2 ? "bg-zinc-100 font-medium" : ""
                    }`}
                  >
                    {country.name} ({country.iso2})
                  </button>
                ))}
              </div>

              {selectedCountry && catalogStates.length > 0 && (
                <label className="block text-sm">
                  State / region (optional)
                  <select
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                    value={selectedState?.iso2 ?? ""}
                    onChange={(event) => {
                      const state = catalogStates.find((item) => item.iso2 === event.target.value);
                      setSelectedState(state ?? null);
                    }}
                  >
                    <option value="">All / country-level</option>
                    {catalogStates.map((state) => (
                      <option key={state.iso2} value={state.iso2}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedCountry && (
                <>
                  <label className="block text-sm">
                    Filter cities
                    <input
                      value={citySearch}
                      onChange={(event) => setCitySearch(event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                      placeholder="Colombo, Glasgow…"
                    />
                  </label>

                  <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-100 p-2">
                    {filteredCatalogCities.length === 0 ? (
                      <p className="px-2 py-1 text-sm text-zinc-500">No cities found.</p>
                    ) : (
                      filteredCatalogCities.slice(0, 100).map((city) => {
                        const checked = pendingCities.some((item) => item.name === city.name);
                        return (
                          <label
                            key={city.name}
                            className="flex items-center gap-2 px-2 py-1 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePendingCity(city.name)}
                            />
                            {city.name}
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={customCity}
                      onChange={(event) => setCustomCity(event.target.value)}
                      placeholder="Custom city"
                      className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addCustomCity}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    >
                      Add custom
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={confirmAddCountry}
                    disabled={pendingCities.length === 0}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Add to target markets
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {countries.length === 0 ? (
        <p className="text-sm text-zinc-500">No target countries yet.</p>
      ) : (
        <div className="space-y-3">
          {countries.map((country) => (
            <div key={country.id} className="rounded-md border border-zinc-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={country.enabled}
                    onChange={(event) =>
                      updateCountry(country.id, { enabled: event.target.checked })
                    }
                  />
                  {country.stateName ? `${country.stateName} (${country.name})` : country.name}
                </label>
                <button
                  type="button"
                  onClick={() => removeCountry(country.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 ml-6 space-y-2">
                {(country.cities ?? []).map((city) => (
                  <div key={city.name} className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={city.enabled}
                        onChange={(event) =>
                          updateCity(country.id, city.name, { enabled: event.target.checked })
                        }
                      />
                      {city.name}
                      {city.isCustom && (
                        <span className="text-xs text-zinc-400">custom</span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeCity(country.id, city.name)}
                      className="text-xs text-zinc-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
