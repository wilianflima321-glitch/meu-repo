"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const inversify_1 = require("inversify");
let TelemetryService = class TelemetryService {
    constructor() {
        this.events = [];
        this.MAX_EVENTS = 1000;
    }
    /**
     * Track an event with optional properties
     */
    track(event, properties) {
        const telemetryEvent = {
            event,
            properties,
            timestamp: Date.now()
        };
        this.events.push(telemetryEvent);
        // Keep only recent events
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS);
        }
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Telemetry]', event, properties);
        }
    }
    /**
     * Track onboarding events
     */
    trackOnboardingStarted() {
        this.track('onboarding.started');
    }
    trackOnboardingStepViewed(stepId, stepIndex) {
        this.track('onboarding.step_viewed', { stepId, stepIndex });
    }
    trackOnboardingCompleted(duration) {
        this.track('onboarding.completed', { duration });
    }
    trackOnboardingSkipped(stepIndex) {
        this.track('onboarding.skipped', { stepIndex });
    }
    /**
     * Track template usage
     */
    trackTemplateViewed(templateId) {
        this.track('template.viewed', { templateId });
    }
    trackTemplateApplied(templateId) {
        this.track('template.applied', { templateId });
    }
    trackTemplateCustomized(templateId, customizations) {
        this.track('template.customized', { templateId, customizations });
    }
    /**
     * Track agent usage
     */
    trackAgentSelected(agentId) {
        this.track('agent.selected', { agentId });
    }
    trackAgentInvoked(agentId, requestType) {
        this.track('agent.invoked', { agentId, requestType });
    }
    /**
     * Track executor usage
     */
    trackExecutorCommandRun(command, success, duration) {
        this.track('executor.command_run', {
            command: this.sanitizeCommand(command),
            success,
            duration
        });
    }
    trackExecutorLogsViewed() {
        this.track('executor.logs_viewed');
    }
    trackExecutorMetricsExported() {
        this.track('executor.metrics_exported');
    }
    /**
     * Track feature usage
     */
    trackFeatureUsed(feature, context) {
        this.track('feature.used', { feature, ...context });
    }
    trackShortcutUsed(shortcutId) {
        this.track('shortcut.used', { shortcutId });
    }
    /**
     * Get all events
     */
    getEvents() {
        return [...this.events];
    }
    /**
     * Get events by type
     */
    getEventsByType(eventPrefix) {
        return this.events.filter(e => e.event.startsWith(eventPrefix));
    }
    /**
     * Get event counts
     */
    getEventCounts() {
        const counts = {};
        for (const event of this.events) {
            counts[event.event] = (counts[event.event] || 0) + 1;
        }
        return counts;
    }
    /**
     * Export telemetry data
     */
    export() {
        return JSON.stringify({
            events: this.events,
            summary: {
                totalEvents: this.events.length,
                eventCounts: this.getEventCounts(),
                timeRange: {
                    start: this.events[0]?.timestamp,
                    end: this.events[this.events.length - 1]?.timestamp
                }
            }
        }, null, 2);
    }
    /**
     * Clear all events
     */
    clear() {
        this.events = [];
    }
    /**
     * Sanitize command to remove sensitive data
     */
    sanitizeCommand(command) {
        // Remove potential secrets, tokens, passwords
        return command
            .replace(/--password[= ]\S+/gi, '--password=***')
            .replace(/--token[= ]\S+/gi, '--token=***')
            .replace(/--api-key[= ]\S+/gi, '--api-key=***')
            .replace(/--secret[= ]\S+/gi, '--secret=***');
    }
};
exports.TelemetryService = TelemetryService;
exports.TelemetryService = TelemetryService = __decorate([
    (0, inversify_1.injectable)()
], TelemetryService);
