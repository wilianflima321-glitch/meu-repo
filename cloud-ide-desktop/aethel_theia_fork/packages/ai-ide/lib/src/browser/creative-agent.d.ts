import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter } from '../common/llm/llm-router';
import { PolicyEngine } from '../common/compliance/policy-engine';
import { ContextStore } from '../common/context/context-store';
import { MissionTelemetry } from '../common/telemetry/mission-telemetry';
export interface CreativeRequest {
    type: 'storyboard' | 'character' | 'dialogue' | 'scene' | 'asset' | 'review';
    content: string;
    style?: string;
    context?: any;
    userId: string;
    workspaceId: string;
}
export interface CreativeResponse {
    storyboard?: Array<{
        scene: number;
        description: string;
        characters: string[];
        setting: string;
        mood: string;
    }>;
    character?: {
        name: string;
        description: string;
        traits: string[];
        backstory: string;
        relationships: Array<{
            character: string;
            relationship: string;
        }>;
    };
    dialogue?: Array<{
        character: string;
        line: string;
        emotion: string;
    }>;
    scene?: {
        description: string;
        elements: string[];
        lighting: string;
        camera: string;
    };
    asset?: {
        type: string;
        description: string;
        specifications: any;
    };
    review?: {
        consistency: number;
        styleAdherence: number;
        issues: Array<{
            type: string;
            description: string;
        }>;
        suggestions: string[];
    };
    error?: string;
}
export interface PromptTemplate {
    id: string;
    template: string;
}
export declare class CreativeAgent {
    private telemetry;
    private observability;
    private llmRouter;
    private policyEngine;
    private contextStore;
    private missionTelemetry;
    readonly id = "creative";
    readonly name = "Creative Agent";
    readonly description = "Generates creative content and assets based on prompts.";
    readonly promptTemplates: PromptTemplate[];
    invoke(request: any): Promise<any>;
    constructor(telemetry: TelemetryService, observability: ObservabilityService, llmRouter: LLMRouter, policyEngine: PolicyEngine, contextStore: ContextStore, missionTelemetry: MissionTelemetry);
    processRequest(request: CreativeRequest): Promise<CreativeResponse>;
    private createStoryboard;
    private developCharacter;
    private writeDialogue;
    private designScene;
    private generateAsset;
    private reviewContent;
    private callLLM;
    getCapabilities(): string[];
}
