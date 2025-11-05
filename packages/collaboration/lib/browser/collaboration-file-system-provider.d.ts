import * as Y from 'yjs';
import { Disposable, Emitter, Event, URI } from '@theia/core';
import { FileChange, FileDeleteOptions, FileOverwriteOptions, FileSystemProviderCapabilities, FileType, Stat, WatchOptions, FileSystemProviderWithFileReadWriteCapability, FileWriteOptions } from '@theia/filesystem/lib/common/files';
import { ProtocolBroadcastConnection, Workspace, Peer } from 'open-collaboration-protocol';
export declare namespace CollaborationURI {
    const scheme = "collaboration";
    function create(workspace: Workspace, path?: string): URI;
}
export declare class CollaborationFileSystemProvider implements FileSystemProviderWithFileReadWriteCapability {
    readonly connection: ProtocolBroadcastConnection;
    readonly host: Peer;
    readonly yjs: Y.Doc;
    capabilities: FileSystemProviderCapabilities;
    protected _readonly: boolean;
    get readonly(): boolean;
    set readonly(value: boolean);
    constructor(connection: ProtocolBroadcastConnection, host: Peer, yjs: Y.Doc);
    protected encoder: TextEncoder;
    protected decoder: TextDecoder;
    protected onDidChangeCapabilitiesEmitter: Emitter<void>;
    protected onDidChangeFileEmitter: Emitter<readonly FileChange[]>;
    protected onFileWatchErrorEmitter: Emitter<void>;
    get onDidChangeCapabilities(): Event<void>;
    get onDidChangeFile(): Event<readonly FileChange[]>;
    get onFileWatchError(): Event<void>;
    readFile(resource: URI): Promise<Uint8Array>;
    writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void>;
    watch(resource: URI, opts: WatchOptions): Disposable;
    stat(resource: URI): Promise<Stat>;
    mkdir(resource: URI): Promise<void>;
    readdir(resource: URI): Promise<[string, FileType][]>;
    delete(resource: URI, opts: FileDeleteOptions): Promise<void>;
    rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void>;
    protected getHostPath(uri: URI): string;
    triggerEvent(changes: FileChange[]): void;
}
//# sourceMappingURL=collaboration-file-system-provider.d.ts.map