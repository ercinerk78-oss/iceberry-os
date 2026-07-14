export type StoredFile={fileName:string;filePath:string};

export interface StorageService{
  save(file:File):Promise<StoredFile>;
  read(filePath:string):Promise<Buffer>;
  remove(filePath:string):Promise<void>;
}
