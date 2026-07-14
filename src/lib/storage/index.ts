import { LocalStorageService } from "./local-storage";
import type { StorageService } from "./types";

// Bulut depolama adaptörleri ileride bu arayüzün arkasına eklenebilir.
export const storage:StorageService=new LocalStorageService();
