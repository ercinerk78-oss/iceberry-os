import { randomUUID } from "node:crypto";
import path from "node:path";

import { del, put } from "@vercel/blob";

import type { StorageService, StoredFile } from "./types";

export class VercelBlobStorageService implements StorageService {
  async save(file: File): Promise<StoredFile> {
    const extension = path.extname(file.name).toLowerCase();
    const fileName = `${randomUUID()}${extension}`;
    const pathname = `academy/${new Date().getUTCFullYear()}/${fileName}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    });

    return { fileName, filePath: blob.url, fileUrl: blob.url };
  }

  async read(filePath: string): Promise<Buffer> {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error("Dosya okunamadı.");
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(filePath: string): Promise<void> {
    await del(filePath).catch(() => undefined);
  }
}
