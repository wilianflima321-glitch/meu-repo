import { AIVariable, AIVariableResolutionRequest, ResolvedAIContextVariable } from '@theia/ai-core';
export declare const IMAGE_CONTEXT_VARIABLE: AIVariable;
export interface ImageContextVariable {
    name?: string;
    wsRelativePath?: string;
    data: string;
    mimeType: string;
}
export interface ImageContextVariableRequest extends AIVariableResolutionRequest {
    variable: typeof IMAGE_CONTEXT_VARIABLE;
    arg: string;
}
export declare namespace ImageContextVariable {
    const name = "name";
    const wsRelativePath = "wsRelativePath";
    const data = "data";
    const mimeType = "mimeType";
    function isImageContextRequest(request: object): request is ImageContextVariableRequest;
    function isResolvedImageContext(resolved: object): resolved is ResolvedAIContextVariable & {
        arg: string;
    };
    function parseRequest(request: AIVariableResolutionRequest): undefined | ImageContextVariable;
    function resolve(request: ImageContextVariableRequest): ResolvedAIContextVariable;
    function parseResolved(resolved: ResolvedAIContextVariable): undefined | ImageContextVariable;
    function createRequest(content: ImageContextVariable): ImageContextVariableRequest;
    function createArgString(args: ImageContextVariable): string;
    function parseArg(argString: string): ImageContextVariable;
}
//# sourceMappingURL=image-context-variable.d.ts.map