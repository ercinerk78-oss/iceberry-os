import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageService, StoredFile } from "./types";

const root=path.join(process.cwd(),".appdata","uploads");

function resolveSafe(filePath:string){
  const resolved=path.resolve(root,filePath);
  if(!resolved.startsWith(path.resolve(root)+path.sep))throw new Error("Geçersiz dosya yolu.");
  return resolved;
}

export class LocalStorageService implements StorageService{
  async save(file:File):Promise<StoredFile>{
    await mkdir(root,{recursive:true});
    const extension=path.extname(file.name).toLowerCase();
    const fileName=`${randomUUID()}${extension}`;
    await writeFile(resolveSafe(fileName),Buffer.from(await file.arrayBuffer()));
    return{fileName,filePath:fileName};
  }
  read(filePath:string){return readFile(resolveSafe(filePath))}
  async remove(filePath:string){await unlink(resolveSafe(filePath)).catch(()=>undefined)}
}
