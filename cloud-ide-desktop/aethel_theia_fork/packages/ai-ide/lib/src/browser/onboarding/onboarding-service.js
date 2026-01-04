"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const inversify_1 = require("inversify");
const nls_1 = require("../../common/nls");
const telemetry_service_1 = require("./telemetry-service");
let OnboardingService = class OnboardingService {
    constructor(telemetry) {
        this.telemetry = telemetry;
        this.completed = false;
        this.currentStep = 0;
        this.startTime = null;
        this.steps = [
            {
                id: 'welcome',
                title: (0, nls_1.nls)('onboarding.welcome'),
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
                title: (0, nls_1.nls)('onboarding.shortcuts'),
                description: 'Press Ctrl+Shift+A (Cmd+Shift+A on Mac) to open the AI panel. Use Ctrl+Shift+E for executor logs.'
            },
            {
                id: 'health',
                title: 'System Health',
                description: 'Monitor AI system performance, view metrics, and export data from the AI Health panel.',
                templateId: 'monitoring-setup'
            }
        ];
    }
    start() {
        if (!this.startTime) {
            this.startTime = Date.now();
            this.telemetry.trackOnboardingStarted();
        }
    }
    getSteps() {
        return this.steps;
    }
    getCurrentStep() {
        return this.currentStep;
    }
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            const step = this.steps[this.currentStep];
            this.telemetry.trackOnboardingStepViewed(step.id, this.currentStep);
            return true;
        }
        return false;
    }
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            const step = this.steps[this.currentStep];
            this.telemetry.trackOnboardingStepViewed(step.id, this.currentStep);
            return true;
        }
        return false;
    }
    complete() {
        this.completed = true;
        const duration = this.startTime ? Date.now() - this.startTime : 0;
        this.telemetry.trackOnboardingCompleted(duration);
        this.saveCompletionState();
    }
    skip() {
        this.completed = true;
        this.telemetry.trackOnboardingSkipped(this.currentStep);
        this.saveCompletionState();
    }
    applyTemplate(templateId) {
        this.telemetry.trackTemplateApplied(templateId);
    }
    isCompleted() {
        return this.completed || this.loadCompletionState();
    }
    reset() {
        this.completed = false;
        this.currentStep = 0;
        this.clearCompletionState();
    }
    saveCompletionState() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ai-ide-onboarding-completed', 'true');
        }
    }
    loadCompletionState() {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('ai-ide-onboarding-completed') === 'true';
        }
        return false;
    }
    clearCompletionState() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('ai-ide-onboarding-completed');
        }
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(telemetry_service_1.TelemetryService)),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService])
], OnboardingService);
