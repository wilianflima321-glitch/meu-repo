import { AIVariableContext, AIVariableContribution, AIVariableOpener, AIVariableResolutionRequest, AIVariableResolver, ResolvedAIContextVariable } from '@theia/ai-core';
import { FrontendVariableService, AIVariablePasteResult } from '@theia/ai-core/lib/browser';
import { URI } from '@theia/core';
import { LabelProvider, LabelProviderContribution, OpenerService } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { ImageContextVariableRequest } from '../common/image-context-variable';
export declare class ImageContextVariableContribution implements AIVariableContribution, AIVariableResolver, AIVariableOpener, LabelProviderContribution {
    protected readonly fileService: FileService;
    protected readonly wsService: WorkspaceService;
    protected readonly openerService: OpenerService;
    protected readonly labelProvider: LabelProvider;
    registerVariables(service: FrontendVariableService): void;
    canResolve(request: AIVariableResolutionRequest, _: AIVariableContext): Promise<number>;
    resolve(request: AIVariableResolutionRequest, _: AIVariableContext): Promise<ResolvedAIContextVariable | undefined>;
    canOpen(request: AIVariableResolutionRequest, context: AIVariableContext): Promise<number>;
    open(request: ImageContextVariableRequest, context: AIVariableContext): Promise<void>;
    protected toUri(request: ImageContextVariableRequest): Promise<URI | undefined>;
    handlePaste(event: ClipboardEvent, context: AIVariableContext): Promise<AIVariablePasteResult | undefined>;
    private readFileAsDataURL;
    protected makeAbsolute(pathStr: string): Promise<URI | undefined>;
    canHandle(element: object): number;
    getIcon(element: ImageContextVariableRequest): string | undefined;
    getName(element: ImageContextVariableRequest): string | undefined;
    getDetails(element: ImageContextVariableRequest): string | undefined;
}
//# sourceMappingURL=image-context-variable-contribution.d.ts.map