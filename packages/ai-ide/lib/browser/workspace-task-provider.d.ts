import { ToolProvider, ToolRequest } from '@theia/ai-core';
import { TaskService } from '@theia/task/lib/browser/task-service';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
export declare class TaskListProvider implements ToolProvider {
    protected readonly taskService: TaskService;
    getTool(): ToolRequest;
    private getAvailableTasks;
}
export declare class TaskRunnerProvider implements ToolProvider {
    protected readonly taskService: TaskService;
    protected readonly terminalService: TerminalService;
    getTool(): ToolRequest;
    private handleRunTask;
}
//# sourceMappingURL=workspace-task-provider.d.ts.map