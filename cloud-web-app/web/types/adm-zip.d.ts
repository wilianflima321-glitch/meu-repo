// Type declarations for adm-zip
// These are simplified types for development. Install the actual package for runtime.

declare module 'adm-zip' {
  interface IZipEntry {
    entryName: string;
    rawEntryName: Buffer;
    extra: Buffer;
    comment: string;
    name: string;
    isDirectory: boolean;
    header: {
      made: number;
      version: number;
      flags: number;
      method: number;
      time: Date;
      crc: number;
      compressedSize: number;
      size: number;
      fnameLen: number;
      extraLen: number;
      centralDir?: Buffer;
    };
    getData(): Buffer;
    getDataAsync(callback: (data: Buffer, err?: Error) => void): void;
    setData(value: Buffer | string): void;
    toString(): string;
  }

  class AdmZip {
    constructor();
    constructor(filePath: string);
    constructor(buffer: Buffer);

    getEntries(): IZipEntry[];
    readFile(entry: string | IZipEntry): Buffer | null;
    readFileAsync(entry: string | IZipEntry, callback: (data: Buffer | null, err?: Error) => void): void;
    readAsText(entry: string | IZipEntry, encoding?: string): string;
    readAsTextAsync(entry: string | IZipEntry, callback: (data: string, err?: Error) => void, encoding?: string): void;
    deleteFile(entry: string | IZipEntry): void;
    addZipComment(comment: string): void;
    getZipComment(): string;
    addZipEntryComment(entry: string | IZipEntry, comment: string): void;
    getZipEntryComment(entry: string | IZipEntry): string;
    updateFile(entry: string | IZipEntry, content: Buffer): void;
    addLocalFile(localPath: string, zipPath?: string, zipName?: string): void;
    addLocalFolder(localPath: string, zipPath?: string, filter?: RegExp): void;
    addLocalFolderAsync(localPath: string, callback: (success: boolean, err?: Error) => void, zipPath?: string, filter?: RegExp): void;
    addFile(entryName: string, content: Buffer, comment?: string, attr?: number): void;
    getEntry(name: string): IZipEntry | null;
    extractEntryTo(entry: string | IZipEntry, targetPath: string, maintainEntryPath?: boolean, overwrite?: boolean): boolean;
    extractAllTo(targetPath: string, overwrite?: boolean): void;
    extractAllToAsync(targetPath: string, overwrite?: boolean, callback?: (error?: Error) => void): void;
    writeZip(targetFileName?: string): void;
    toBuffer(): Buffer;
  }

  export = AdmZip;
}
