type GeocodeInput = {
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

export function hasEnoughAddressForGeocoding(input: GeocodeInput) {
  return Boolean(input.city?.trim() && (input.address?.trim() || input.district?.trim()));
}

export async function geocodeAddress(input: GeocodeInput): Promise<GeocodeResult | null> {
  if (!hasEnoughAddressForGeocoding(input)) return null;

  const query = [input.address, input.district, input.city, input.country ?? "Türkiye"].filter(Boolean).join(", ");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(GEOCODING_TIMEOUT_MS),
      headers: {
        "Accept": "application/json",
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
