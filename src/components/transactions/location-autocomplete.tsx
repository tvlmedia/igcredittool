"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type LocationValue = {
  locationLabel?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type LocationSuggestion = {
  id: string;
  place: string;
  country: string;
  label: string;
  locationLabel: string;
  city: string;
  latitude: string;
  longitude: string;
};

type SearchState = "idle" | "loading" | "empty" | "error";

type LocationFieldNames = {
  locationLabel?: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
};

const defaultFieldNames: LocationFieldNames = {
  locationLabel: "location_label",
  city: "city",
  country: "country",
  latitude: "latitude",
  longitude: "longitude"
};

export function LocationAutocomplete({
  initialValue,
  fieldNames = defaultFieldNames,
  searchLabel = "Location search",
  selectedLabel = "Selected",
  latitudeLabel = "Latitude",
  longitudeLabel = "Longitude"
}: {
  initialValue?: LocationValue;
  fieldNames?: LocationFieldNames;
  searchLabel?: string;
  selectedLabel?: string;
  latitudeLabel?: string;
  longitudeLabel?: string;
}) {
  const initialLabel = buildInitialLabel(initialValue);
  const [query, setQuery] = useState(initialLabel);
  const [locationLabel, setLocationLabel] = useState(initialValue?.locationLabel ?? "");
  const [city, setCity] = useState(initialValue?.city ?? "");
  const [country, setCountry] = useState(initialValue?.country ?? "");
  const [latitude, setLatitude] = useState(stringValue(initialValue?.latitude));
  const [longitude, setLongitude] = useState(stringValue(initialValue?.longitude));
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!hasSearched) {
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      setSuggestions([]);
      setSearchState("idle");
      abortRef.current?.abort();
      return;
    }

    const timeout = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearchState("loading");

      try {
        const response = await fetch(
          `/api/locations/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Location search failed.");
        }

        const payload = (await response.json()) as { results: LocationSuggestion[] };
        setSuggestions(payload.results);
        setSearchState(payload.results.length > 0 ? "idle" : "empty");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setSearchState("error");
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      abortRef.current?.abort();
    };
  }, [hasSearched, query]);

  function selectSuggestion(suggestion: LocationSuggestion) {
    setQuery(suggestion.label);
    setLocationLabel(suggestion.locationLabel);
    setCity(suggestion.city);
    setCountry(suggestion.country);
    setLatitude(normalizeCoordinateInput(suggestion.latitude));
    setLongitude(normalizeCoordinateInput(suggestion.longitude));
    setSuggestions([]);
    setSearchState("idle");
    setHasSearched(false);
  }

  function clearLocation() {
    setQuery("");
    setLocationLabel("");
    setCity("");
    setCountry("");
    setLatitude("");
    setLongitude("");
    setSuggestions([]);
    setSearchState("idle");
    setHasSearched(false);
  }

  return (
    <div className="grid gap-4">
      {fieldNames.locationLabel ? (
        <input type="hidden" name={fieldNames.locationLabel} value={locationLabel} />
      ) : null}
      <input type="hidden" name={fieldNames.city} value={city} />
      <input type="hidden" name={fieldNames.country} value={country} />

      <Field label={searchLabel}>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-white/32" size={16} />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHasSearched(true);
            }}
            className="pr-11 pl-9"
            placeholder="Search city, venue, or place"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={clearLocation}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Clear location"
            >
              <X size={15} />
            </button>
          ) : null}

          {hasSearched && (suggestions.length > 0 || searchState !== "idle") ? (
            <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-carbon-950/98 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              {searchState === "loading" ? (
                <p className="px-3 py-2 text-sm text-white/45">Searching locations...</p>
              ) : null}
              {searchState === "empty" ? (
                <p className="px-3 py-2 text-sm text-white/45">No locations found</p>
              ) : null}
              {searchState === "error" ? (
                <p className="px-3 py-2 text-sm text-red-200/80">Location search unavailable</p>
              ) : null}
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="grid w-full gap-1 rounded-md px-3 py-2 text-left transition hover:bg-white/[0.07]"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <MapPin size={14} className="text-iron-300" />
                    {suggestion.place}
                    {suggestion.country ? (
                      <span className="text-white/42">/ {suggestion.country}</span>
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-xs leading-5 text-white/45">
                    {suggestion.label}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Field>

      {locationLabel ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/52">
          {selectedLabel}: {locationLabel}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={latitudeLabel}>
          <Input
            name={fieldNames.latitude}
            type="number"
            step="0.000001"
            value={latitude}
            onChange={(event) => setLatitude(normalizeCoordinateInput(event.target.value))}
            placeholder="51.535000"
          />
        </Field>
        <Field label={longitudeLabel}>
          <Input
            name={fieldNames.longitude}
            type="number"
            step="0.000001"
            value={longitude}
            onChange={(event) => setLongitude(normalizeCoordinateInput(event.target.value))}
            placeholder="5.630000"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={clearLocation}>
          Clear location
        </Button>
      </div>
    </div>
  );
}

function buildInitialLabel(value?: LocationValue) {
  return (
    value?.locationLabel ||
    [value?.city, value?.country].filter(Boolean).join(", ") ||
    ""
  );
}

function stringValue(value: LocationValue["latitude"]) {
  if (value === null || value === undefined) {
    return "";
  }

  return normalizeCoordinateInput(String(value));
}

function normalizeCoordinateInput(value: string) {
  return value.trim().replace(",", ".");
}
