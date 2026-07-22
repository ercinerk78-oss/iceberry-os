import { LocalStorageService } from "./local-storage";
import type { StorageService } from "./types";
import { VercelBlobStorageService } from "./vercel-blob-storage";

function createStorage(): StorageService {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new VercelBlobStorageService();

  if (process.env.VERCEL_ENV === "production") {
    return {
      async save() {
        throw new Error("Production dosya yukleme icin BLOB_READ_WRITE_TOKEN tanimlanmalidir.");
      },
      async read(filePath: string) {
        return new LocalStorageService().read(filePath);
      },
      async remove(filePath: string) {
        return new LocalStorageService().remove(filePath);
      },
    };
  }

  return new LocalStorageService();
}

export const storage: StorageService = createStorage();
