type GeocodeInput = {
  name?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  country?: string | null;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  provider: "nominatim";
};

const GEOCODING_TIMEOUT_MS = 7_000;
const GEOCODING_DELAY_MS = 1_100;

export function hasEnoughAddressForGeocoding(input: GeocodeInput) {
  return Boolean(input.city?.trim() && (input.address?.trim() || input.district?.trim() || input.name?.trim()));
}

export async function geocodeAddress(input: GeocodeInput): Promise<GeocodeResult | null> {
  if (!hasEnoughAddressForGeocoding(input)) return null;

  for (const query of geocodingQueries(input)) {
    const result = await searchNominatim(query);
    if (result) return result;
    await delay(GEOCODING_DELAY_MS);
  }

  return null;
}

function geocodingQueries(input: GeocodeInput) {
  const country = clean(input.country) || "Türkiye";
  const name = clean(input.name);
  const address = clean(input.address);
  const district = clean(input.district);
  const city = clean(input.city);

  const candidates = [
    [address, district, city, country],
    [name, district, city, country],
    [address, city, country],
    [district, city, country],
    [city, country],
  ]
    .map((parts) => parts.filter(Boolean).join(", "))
    .filter(Boolean);

  return [...new Set(candidates)];
}

async function searchNominatim(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("accept-language", "tr");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(GEOCODING_TIMEOUT_MS),
      headers: {
        "Accept": "application/json",
        "Accept-Language": "tr",
        "User-Agent": process.env.GEOCODING_USER_AGENT || "IceberryOS/1.0",
      },
    });
    if (!response.ok) return null;

    const results = await response.json() as Array<{ lat?: string; lon?: string }>;
    const first = results[0];
    if (!first?.lat || !first.lon) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude, provider: "nominatim" };
  } catch {
    return null;
  }
}

function clean(value?: string | null) {
  const text = value?.trim();
  return text && text !== "-" ? text : null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
