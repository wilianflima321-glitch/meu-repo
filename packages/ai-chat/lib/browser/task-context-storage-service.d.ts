import { Summary, TaskContextStorageService } from './task-context-service';
import { Emitter } from '@theia/core';
import { AIVariableResourceResolver } from '@theia/ai-core';
import { OpenerService } from '@theia/core/lib/browser';
export declare class InMemoryTaskContextStorage implements TaskContextStorageService {
    protected summaries: Map<string, Summary>;
    protected readonly onDidChangeEmitter: Emitter<void>;
    readonly onDidChange: import("@theia/core").Event<void>;
    protected sanitizeLabel(label: string): string;
    protected readonly variableResourceResolver: AIVariableResourceResolver;
    protected readonly openerService: OpenerService;
    store(summary: Summary): void;
    getAll(): Summary[];
    get(identifier: string): Summary | undefined;
    delete(identifier: string): boolean;
    clear(): void;
    open(identifier: string): Promise<void>;
}
//# sourceMappingURL=task-context-storage-service.d.ts.map