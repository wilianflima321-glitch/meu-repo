// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatAgentLocation, ChatService } from '@theia/ai-chat/lib/common';
import { CommandContribution, CommandRegistry, CommandService } from '@theia/core';
import { TaskContextStorageService, TaskContextService } from '@theia/ai-chat/lib/browser/task-context-service';
import { injectable, inject } from '@theia/core/shared/inversify';
import { AI_SUMMARIZE_SESSION_AS_TASK_FOR_CODER, AI_UPDATE_TASK_CONTEXT_COMMAND } from '../common/summarize-session-commands';
import { CoderAgent } from './coder-agent';
import { TASK_CONTEXT_VARIABLE } from '@theia/ai-chat/lib/browser/task-context-variable';
import { ARCHITECT_TASK_SUMMARY_PROMPT_TEMPLATE_ID, ARCHITECT_TASK_SUMMARY_UPDATE_PROMPT_TEMPLATE_ID } from '../common/architect-prompt-template';
import { FILE_VARIABLE } from '@theia/ai-core/lib/browser/file-variable-contribution';
import { AIVariableResolutionRequest } from '@theia/ai-core';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { AICommandHandlerFactory } from '@theia/ai-core/lib/browser';

@injectable()
export class SummarizeSessionCommandContribution implements CommandContribution {
    @inject(ChatService)
    private _chatService?: ChatService;
    @inject(ChatService)
    protected set chatService(v: ChatService) { this._chatService = v; }
    protected get chatService(): ChatService { if (!this._chatService) { throw new Error('SummarizeSessionCommandContribution: chatService not injected'); } return this._chatService; }

    @inject(TaskContextService)
    private _taskContextService?: TaskContextService;
    @inject(TaskContextService)
    protected set taskContextService(v: TaskContextService) { this._taskContextService = v; }
    protected get taskContextService(): TaskContextService { if (!this._taskContextService) { throw new Error('SummarizeSessionCommandContribution: taskContextService not injected'); } return this._taskContextService; }

    @inject(CommandService)
    private _commandService?: CommandService;
    @inject(CommandService)
    protected set commandService(v: CommandService) { this._commandService = v; }
    protected get commandService(): CommandService { if (!this._commandService) { throw new Error('SummarizeSessionCommandContribution: commandService not injected'); } return this._commandService; }

    @inject(CoderAgent)
    private _coderAgent?: CoderAgent;
    @inject(CoderAgent)
    protected set coderAgent(v: CoderAgent) { this._coderAgent = v; }
    protected get coderAgent(): CoderAgent { if (!this._coderAgent) { throw new Error('SummarizeSessionCommandContribution: coderAgent not injected'); } return this._coderAgent; }

    @inject(TaskContextStorageService)
    private _taskContextStorageService?: TaskContextStorageService;
    @inject(TaskContextStorageService)
    protected set taskContextStorageService(v: TaskContextStorageService) { this._taskContextStorageService = v; }
    protected get taskContextStorageService(): TaskContextStorageService { if (!this._taskContextStorageService) { throw new Error('SummarizeSessionCommandContribution: taskContextStorageService not injected'); } return this._taskContextStorageService; }

    @inject(FileService)
    private _fileService?: FileService;
    @inject(FileService)
    protected set fileService(v: FileService) { this._fileService = v; }
    protected get fileService(): FileService { if (!this._fileService) { throw new Error('SummarizeSessionCommandContribution: fileService not injected'); } return this._fileService; }

    @inject(WorkspaceService)
    private _wsService?: WorkspaceService;
    @inject(WorkspaceService)
    protected set wsService(v: WorkspaceService) { this._wsService = v; }
    protected get wsService(): WorkspaceService { if (!this._wsService) { throw new Error('SummarizeSessionCommandContribution: wsService not injected'); } return this._wsService; }

    @inject(AICommandHandlerFactory)
    private _commandHandlerFactory?: AICommandHandlerFactory;
    @inject(AICommandHandlerFactory)
    protected set commandHandlerFactory(v: AICommandHandlerFactory) { this._commandHandlerFactory = v; }
    protected get commandHandlerFactory(): AICommandHandlerFactory { if (!this._commandHandlerFactory) { throw new Error('SummarizeSessionCommandContribution: commandHandlerFactory not injected'); } return this._commandHandlerFactory; }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(AI_UPDATE_TASK_CONTEXT_COMMAND, this.commandHandlerFactory({
            execute: async () => {
                const activeSession = this.chatService.getActiveSession();

                if (!activeSession) {
                    return;
                }

                // Check if there is an existing summary for this session
                if (!this.taskContextService.hasSummary(activeSession)) {
                    // If no summary exists, create one first
                    await this.taskContextService.summarize(activeSession, ARCHITECT_TASK_SUMMARY_PROMPT_TEMPLATE_ID);
                } else {
                    // Update existing summary
                    await this.taskContextService.update(activeSession, ARCHITECT_TASK_SUMMARY_UPDATE_PROMPT_TEMPLATE_ID);
                }
            }
        }));

        registry.registerCommand(AI_SUMMARIZE_SESSION_AS_TASK_FOR_CODER, this.commandHandlerFactory({
            execute: async () => {
                const activeSession = this.chatService.getActiveSession();

                if (!activeSession) {
                    return;
                }

                const summaryId = await this.taskContextService.summarize(activeSession, ARCHITECT_TASK_SUMMARY_PROMPT_TEMPLATE_ID);

                // Open the summary in a new editor
                await this.taskContextStorageService.open(summaryId);

                // Add the summary file to the context of the active Architect session
                const summary = this.taskContextService.getAll().find(s => s.id === summaryId);
                if (summary?.uri) {
                    if (await this.fileService.exists(summary?.uri)) {
                        const wsRelativePath = await this.wsService.getWorkspaceRelativePath(summary?.uri);
                        // Create a file variable for the summary
                        const fileVariable: AIVariableResolutionRequest = {
                            variable: FILE_VARIABLE,
                            arg: wsRelativePath
                        };

                        // Add the file to the active session's context
                        activeSession.model.context.addVariables(fileVariable);
                    }

                    // Create a new session with the coder agent
                    const newSession = this.chatService.createSession(ChatAgentLocation.Panel, { focus: true }, this.coderAgent);
                    const summaryVariable = { variable: TASK_CONTEXT_VARIABLE, arg: summaryId };
                    newSession.model.context.addVariables(summaryVariable);
                }
            }
        }));
    }
}
