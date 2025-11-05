import { AIVariableResolutionRequest } from '@theia/ai-core';
import { URI } from '@theia/core';
import { LabelProviderContribution } from '@theia/core/lib/browser';
import { TaskContextVariableContribution } from './task-context-variable-contribution';
import { ChatService } from '../common';
import { TaskContextService } from './task-context-service';
export declare class TaskContextVariableLabelProvider implements LabelProviderContribution {
    protected readonly chatService: ChatService;
    protected readonly chatVariableContribution: TaskContextVariableContribution;
    protected readonly taskContextService: TaskContextService;
    protected isMine(element: object): element is AIVariableResolutionRequest & {
        arg: string;
    };
    canHandle(element: object): number;
    getIcon(element: object): string | undefined;
    getName(element: object): string | undefined;
    getLongName(element: object): string | undefined;
    getDetails(element: object): string | undefined;
    protected getUri(element: object): URI | undefined;
}
//# sourceMappingURL=task-context-variable-label-provider.d.ts.map