import { AIContextVariable, AIVariableResolutionRequest, AIVariableService } from '@theia/ai-core';
import { QuickInputService } from '@theia/core';
export declare class ContextVariablePicker {
    protected readonly variableService: AIVariableService;
    protected readonly quickInputService: QuickInputService;
    pickContextVariable(): Promise<AIVariableResolutionRequest | undefined>;
    protected useGenericArgumentPicker(variable: AIContextVariable): Promise<AIVariableResolutionRequest | undefined>;
}
//# sourceMappingURL=context-variable-picker.d.ts.map