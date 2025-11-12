/// <reference types="lodash" />
import { Listener, ListenerList, URI } from '@theia/core';
import { JSONValue } from '@theia/core/shared/@lumino/coreutils';
import { FileContentStatus, PreferenceStorage } from '../common/abstract-resource-preference-provider';
import { EncodingService } from '@theia/core/lib/common/encoding-service';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { JSONCEditor } from '../common/jsonc-editor';
import { DiskFileSystemProvider } from '@theia/filesystem/lib/node/disk-file-system-provider';
interface WriteOperation {
    key: string;
    path: string[];
    value: JSONValue;
}
export declare class BackendPreferenceStorage implements PreferenceStorage {
    protected readonly fileSystem: DiskFileSystemProvider;
    protected readonly uri: URI;
    protected readonly encodingService: EncodingService;
    protected readonly jsonEditor: JSONCEditor;
    protected pendingWrites: WriteOperation[];
    protected writeDeferred: Deferred<boolean>;
    protected writeFile: import("lodash").DebouncedFunc<() => void>;
    protected currentContent: string | undefined;
    protected encoding: string;
    constructor(fileSystem: DiskFileSystemProvider, uri: URI, encodingService: EncodingService, jsonEditor: JSONCEditor);
    writeValue(key: string, path: string[], value: JSONValue): Promise<boolean>;
    waitForWrite(): Promise<boolean>;
    doWrite(): Promise<void>;
    protected readonly onDidChangeFileContentListeners: ListenerList<FileContentStatus, Promise<boolean>>;
    onDidChangeFileContent: Listener.Registration<FileContentStatus, Promise<boolean>>;
    read(): Promise<string>;
    dispose(): void;
}
export {};
//# sourceMappingURL=backend-preference-storage.d.ts.map