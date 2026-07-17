export function isMissingSchemaError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";

  return code === "P2021" || code === "P2022" || message.includes("does not exist");
}

export async function emptyOnMissingSchema<T>(promise: Promise<T[]>, label: string) {
  try {
    return await promise;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn(`[supply-chain] ${label} table is not available yet.`);
      return [] as T[];
    }

    throw error;
  }
}
