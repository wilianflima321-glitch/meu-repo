import { Summary, SummaryMetadata, TaskContextStorageService } from '@theia/ai-chat/lib/browser/task-context-service';
import { InMemoryTaskContextStorage } from '@theia/ai-chat/lib/browser/task-context-storage-service';
import { DisposableCollection, Emitter, ILogger, PreferenceService, URI } from '@theia/core';
import { OpenerService } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileChange } from '@theia/filesystem/lib/common/files';
export declare class TaskContextFileStorageService implements TaskContextStorageService {
    protected readonly inMemoryStorage: InMemoryTaskContextStorage;
    protected readonly preferenceService: PreferenceService;
    protected readonly workspaceService: WorkspaceService;
    protected readonly fileService: FileService;
    protected readonly openerService: OpenerService;
    protected readonly logger: ILogger;
    protected readonly onDidChangeEmitter: Emitter<void>;
    readonly onDidChange: any;
    protected sanitizeLabel(label: string): string;
    protected getStorageLocation(): URI | undefined;
    protected init(): void;
    protected get ready(): Promise<void>;
    protected doInit(): Promise<void>;
    protected toDisposeOnStorageChange?: DisposableCollection;
    protected watchStorage(): Promise<void>;
    protected handleChanges(changes: FileChange[]): Promise<void>;
    protected clearInMemoryStorage(): void;
    protected deleteFileReference(uri: URI): boolean;
    protected cacheNewTasks(storageLocation: URI): Promise<void>;
    protected readFile(uri: URI): Promise<void>;
    store(summary: Summary): Promise<void>;
    getAll(): Summary[];
    get(identifier: string): Summary | undefined;
    delete(identifier: string): Promise<boolean>;
    protected maybeReadFrontmatter(content: string): {
        body: string;
        frontmatter: SummaryMetadata | undefined;
    };
    protected hasLabel(candidate: unknown): candidate is SummaryMetadata;
    open(identifier: string): Promise<void>;
}
//# sourceMappingURL=task-context-file-storage-service.d.ts.map