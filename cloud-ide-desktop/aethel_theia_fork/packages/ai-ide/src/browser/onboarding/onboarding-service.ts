import { injectable, inject } from 'inversify';
import { nls } from '../../common/nls';
import { TelemetryService } from './telemetry-service';

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    action?: () => void;
    templateId?: string;
}

@injectable()
export class OnboardingService {
    private completed = false;
    private currentStep = 0;
    private startTime: number | null = null;

    constructor(
        @inject(TelemetryService) private telemetry: TelemetryService
    ) {}

    private steps: OnboardingStep[] = [
        {
            id: 'welcome',
            title: nls('onboarding.welcome'),
            description: 'AI IDE provides intelligent assistance for your development workflow. Access powerful AI agents, execute commands, and get real-time help.'
        },
        {
            id: 'agents',
            title: 'AI Agents',
            description: 'Choose from specialized agents: Coder for code tasks, Architect for structure analysis, Universal for general questions, and more.',
            templateId: 'agent-quickstart'
        },
        {
            id: 'executor',
            title: 'Workspace Executor',
            description: 'Execute commands with streaming output. Click the executor status in the status bar to view logs and metrics.',
            templateId: 'executor-examples'
        },
        {
            id: 'shortcuts',
            title: nls('onboarding.shortcuts'),
            description: 'Press Ctrl+Shift+A (Cmd+Shift+A on Mac) to open the AI panel. Use Ctrl+Shift+E for executor logs.'
        },
        {
            id: 'health',
            title: 'System Health',
            description: 'Monitor AI system performance, view metrics, and export data from the AI Health panel.',
            templateId: 'monitoring-setup'
        }
    ];

    start(): void {
        if (!this.startTime) {
            this.startTime = Date.now();
            this.telemetry.trackOnboardingStarted();
        }
    }

    getSteps(): OnboardingStep[] {
        return this.steps;
    }

    getCurrentStep(): number {
        return this.currentStep;
    }

    nextStep(): boolean {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            const step = this.steps[this.currentStep];
            this.telemetry.trackOnboardingStepViewed(step.id, this.currentStep);
            return true;
        }
        return false;
    }

    previousStep(): boolean {
        if (this.currentStep > 0) {
            this.currentStep--;
            const step = this.steps[this.currentStep];
            this.telemetry.trackOnboardingStepViewed(step.id, this.currentStep);
            return true;
        }
        return false;
    }

    complete(): void {
        this.completed = true;
        const duration = this.startTime ? Date.now() - this.startTime : 0;
        this.telemetry.trackOnboardingCompleted(duration);
        this.saveCompletionState();
    }

    skip(): void {
        this.completed = true;
        this.telemetry.trackOnboardingSkipped(this.currentStep);
        this.saveCompletionState();
    }

    applyTemplate(templateId: string): void {
        this.telemetry.trackTemplateApplied(templateId);
    }

    isCompleted(): boolean {
        return this.completed || this.loadCompletionState();
    }

    reset(): void {
        this.completed = false;
        this.currentStep = 0;
        this.clearCompletionState();
    }

    private saveCompletionState(): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ai-ide-onboarding-completed', 'true');
        }
    }

    private loadCompletionState(): boolean {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('ai-ide-onboarding-completed') === 'true';
        }
        return false;
    }

    private clearCompletionState(): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('ai-ide-onboarding-completed');
        }
    }
}
