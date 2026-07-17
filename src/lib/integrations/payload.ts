const SENSITIVE_KEYS = ["token", "secret", "password", "authorization", "apiKey", "api_key", "accessToken", "refreshToken"];

export type SafeJson = string | number | boolean | null | SafeJson[] | { [key: string]: SafeJson };

export function maskPayload(value: unknown): SafeJson {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(maskPayload);
  if (typeof value === "object") {
    const output: { [key: string]: SafeJson } = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEYS.some((item) => key.toLowerCase().includes(item.toLowerCase())) ? "***MASKED***" : maskPayload(raw);
    }
    return output;
  }

  return String(value);
}

export function stringifyPayload(value: unknown) {
  return JSON.stringify(maskPayload(value));
}

export function idempotencyKey(provider: string, eventType: string, externalEntityId: string, version = "v1") {
  return `${provider}:${eventType}:${externalEntityId}:${version}`;
}
