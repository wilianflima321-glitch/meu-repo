import { TelemetryService } from './telemetry-service';
export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    action?: () => void;
    templateId?: string;
}
export declare class OnboardingService {
    private telemetry;
    private completed;
    private currentStep;
    private startTime;
    constructor(telemetry: TelemetryService);
    private steps;
    start(): void;
    getSteps(): OnboardingStep[];
    getCurrentStep(): number;
    nextStep(): boolean;
    previousStep(): boolean;
    complete(): void;
    skip(): void;
    applyTemplate(templateId: string): void;
    isCompleted(): boolean;
    reset(): void;
    private saveCompletionState;
    private loadCompletionState;
    private clearCompletionState;
}
