import { Agent, AgentService, AIVariable, AIVariableService } from '@theia/ai-core/lib/common';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import { AIConfigurationSelectionService } from './ai-configuration-service';
export declare class AIVariableConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-variable-configuration-container-widget";
    static readonly LABEL = "Variables";
    private _variableService?;
    protected set variableService(v: AIVariableService);
    protected get variableService(): AIVariableService;
    private _agentService?;
    protected set agentService(v: AgentService);
    protected get agentService(): AgentService;
    private _aiConfigurationSelectionService?;
    protected set aiConfigurationSelectionService(v: AIConfigurationSelectionService);
    protected get aiConfigurationSelectionService(): AIConfigurationSelectionService;
    protected init(): void;
    protected render(): React.ReactNode;
    protected renderReferencedVariables(variable: AIVariable): React.ReactNode | undefined;
    protected renderArgs(variable: AIVariable): React.ReactNode | undefined;
    protected showAgentConfiguration(agent: Agent): void;
    protected getAgentsForVariable(variable: AIVariable): Agent[];
}
