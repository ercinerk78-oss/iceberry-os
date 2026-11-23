import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  if (!process.env.AUTH_SECRET) throw new Error("Güvenli aktarım için AUTH_SECRET tanımlanmalıdır.");
  return process.env.AUTH_SECRET;
}
export function signImportPreview(value: object) {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}
export function verifyImportPreview<T extends { userId: string; expires: number }>(token: string, userId: string): T {
  if (token.length > 1_000_000) throw new Error("Önizleme çok büyük.");
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Önizleme doğrulanamadı.");
  const [body, signature] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new Error("Önizleme değiştirilmiş. Tekrar önizleyin.");
  const value = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  if (value.userId !== userId || value.expires < Date.now()) throw new Error("Önizlemenin süresi doldu veya başka kullanıcıya ait.");
  return value;
}
