import { NextResponse, type NextRequest } from "next/server";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: NominatimAddress;
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

const cache = new Map<string, { expiresAt: number; results: LocationSuggestion[] }>();
let lastRequestAt = 0;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ results: cached.results });
  }

  await throttleNominatim();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "IronGlassCreditTracker/0.1 (https://github.com/tvlmedia/igcredittool)"
    }
  });

  if (!response.ok) {
    return NextResponse.json({ results: [] }, { status: 502 });
  }

  const data = (await response.json()) as NominatimResult[];
  const results = data
    .map(toLocationSuggestion)
    .filter((result): result is LocationSuggestion => Boolean(result));
  cache.set(cacheKey, {
    expiresAt: Date.now() + 1000 * 60 * 60 * 24,
    results
  });

  return NextResponse.json({ results });
}

async function throttleNominatim() {
  const now = Date.now();
  const waitMs = Math.max(0, 1100 - (now - lastRequestAt));

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  lastRequestAt = Date.now();
}

function toLocationSuggestion(result: NominatimResult): LocationSuggestion | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const address = result.address ?? {};
  const place =
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    address.municipality ??
    result.name ??
    result.display_name.split(",")[0]?.trim() ??
    "";
  const city = place || address.county || address.state || "";
  const country = address.country ?? "";

  return {
    id: String(result.place_id),
    place: place || result.display_name,
    country,
    label: result.display_name,
    locationLabel: result.display_name,
    city,
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6)
  };
}
