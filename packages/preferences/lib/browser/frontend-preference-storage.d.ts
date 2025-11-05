import { ListenerList, DisposableCollection, URI, PreferenceScope, Listener } from '@theia/core';
import { JSONValue } from '@theia/core/shared/@lumino/coreutils';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileContentStatus, PreferenceStorage } from '../common/abstract-resource-preference-provider';
import { PreferenceTransaction, PreferenceTransactionFactory } from './preference-transaction-manager';
export declare class FrontendPreferenceStorage implements PreferenceStorage {
    protected readonly transactionFactory: PreferenceTransactionFactory;
    protected readonly fileService: FileService;
    protected readonly uri: URI;
    protected readonly scope: PreferenceScope;
    protected readonly onDidChangeFileContentListeners: ListenerList<FileContentStatus, Promise<boolean>>;
    protected transaction: PreferenceTransaction | undefined;
    protected readonly toDispose: DisposableCollection;
    constructor(transactionFactory: PreferenceTransactionFactory, fileService: FileService, uri: URI, scope: PreferenceScope);
    dispose(): void;
    writeValue(key: string, path: string[], value: JSONValue): Promise<boolean>;
    onDidChangeFileContent: Listener.Registration<FileContentStatus, Promise<boolean>>;
    read(): Promise<string>;
}
//# sourceMappingURL=frontend-preference-storage.d.ts.map