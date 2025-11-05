import { ChatService } from '@theia/ai-chat/lib/common';
import { CommandContribution, CommandRegistry, CommandService } from '@theia/core';
import { TaskContextStorageService, TaskContextService } from '@theia/ai-chat/lib/browser/task-context-service';
import { CoderAgent } from './coder-agent';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { AICommandHandlerFactory } from '@theia/ai-core/lib/browser';
export declare class SummarizeSessionCommandContribution implements CommandContribution {
    protected readonly chatService: ChatService;
    protected readonly taskContextService: TaskContextService;
    protected readonly commandService: CommandService;
    protected readonly coderAgent: CoderAgent;
    protected readonly taskContextStorageService: TaskContextStorageService;
    protected readonly fileService: FileService;
    protected readonly wsService: WorkspaceService;
    protected readonly commandHandlerFactory: AICommandHandlerFactory;
    registerCommands(registry: CommandRegistry): void;
}
//# sourceMappingURL=summarize-session-command-contribution.d.ts.map