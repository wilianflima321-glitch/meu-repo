export interface TelemetryEvent {
    event: string;
    properties?: Record<string, any>;
    timestamp: number;
}
export declare class TelemetryService {
    private events;
    private readonly MAX_EVENTS;
    /**
     * Track an event with optional properties
     */
    track(event: string, properties?: Record<string, any>): void;
    /**
     * Track onboarding events
     */
    trackOnboardingStarted(): void;
    trackOnboardingStepViewed(stepId: string, stepIndex: number): void;
    trackOnboardingCompleted(duration: number): void;
    trackOnboardingSkipped(stepIndex: number): void;
    /**
     * Track template usage
     */
    trackTemplateViewed(templateId: string): void;
    trackTemplateApplied(templateId: string): void;
    trackTemplateCustomized(templateId: string, customizations: string[]): void;
    /**
     * Track agent usage
     */
    trackAgentSelected(agentId: string): void;
    trackAgentInvoked(agentId: string, requestType: string): void;
    /**
     * Track executor usage
     */
    trackExecutorCommandRun(command: string, success: boolean, duration: number): void;
    trackExecutorLogsViewed(): void;
    trackExecutorMetricsExported(): void;
    /**
     * Track feature usage
     */
    trackFeatureUsed(feature: string, context?: Record<string, any>): void;
    trackShortcutUsed(shortcutId: string): void;
    /**
     * Get all events
     */
    getEvents(): TelemetryEvent[];
    /**
     * Get events by type
     */
    getEventsByType(eventPrefix: string): TelemetryEvent[];
    /**
     * Get event counts
     */
    getEventCounts(): Record<string, number>;
    /**
     * Export telemetry data
     */
    export(): string;
    /**
     * Clear all events
     */
    clear(): void;
    /**
     * Sanitize command to remove sensitive data
     */
    private sanitizeCommand;
}
