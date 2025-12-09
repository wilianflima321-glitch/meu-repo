import { injectable } from 'inversify';

export interface TelemetryEvent {
    event: string;
    properties?: Record<string, any>;
    timestamp: number;
}

@injectable()
export class TelemetryService {
    private events: TelemetryEvent[] = [];
    private readonly MAX_EVENTS = 1000;

    /**
     * Track an event with optional properties
     */
    track(event: string, properties?: Record<string, any>): void {
        const telemetryEvent: TelemetryEvent = {
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
    trackOnboardingStarted(): void {
        this.track('onboarding.started');
    }

    trackOnboardingStepViewed(stepId: string, stepIndex: number): void {
        this.track('onboarding.step_viewed', { stepId, stepIndex });
    }

    trackOnboardingCompleted(duration: number): void {
        this.track('onboarding.completed', { duration });
    }

    trackOnboardingSkipped(stepIndex: number): void {
        this.track('onboarding.skipped', { stepIndex });
    }

    /**
     * Track template usage
     */
    trackTemplateViewed(templateId: string): void {
        this.track('template.viewed', { templateId });
    }

    trackTemplateApplied(templateId: string): void {
        this.track('template.applied', { templateId });
    }

    trackTemplateCustomized(templateId: string, customizations: string[]): void {
        this.track('template.customized', { templateId, customizations });
    }

    /**
     * Track agent usage
     */
    trackAgentSelected(agentId: string): void {
        this.track('agent.selected', { agentId });
    }

    trackAgentInvoked(agentId: string, requestType: string): void {
        this.track('agent.invoked', { agentId, requestType });
    }

    /**
     * Track executor usage
     */
    trackExecutorCommandRun(command: string, success: boolean, duration: number): void {
        this.track('executor.command_run', { 
            command: this.sanitizeCommand(command), 
            success, 
            duration 
        });
    }

    trackExecutorLogsViewed(): void {
        this.track('executor.logs_viewed');
    }

    trackExecutorMetricsExported(): void {
        this.track('executor.metrics_exported');
    }

    /**
     * Track feature usage
     */
    trackFeatureUsed(feature: string, context?: Record<string, any>): void {
        this.track('feature.used', { feature, ...context });
    }

    trackShortcutUsed(shortcutId: string): void {
        this.track('shortcut.used', { shortcutId });
    }

    /**
     * Get all events
     */
    getEvents(): TelemetryEvent[] {
        return [...this.events];
    }

    /**
     * Get events by type
     */
    getEventsByType(eventPrefix: string): TelemetryEvent[] {
        return this.events.filter(e => e.event.startsWith(eventPrefix));
    }

    /**
     * Get event counts
     */
    getEventCounts(): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const event of this.events) {
            counts[event.event] = (counts[event.event] || 0) + 1;
        }
        return counts;
    }

    /**
     * Export telemetry data
     */
    export(): string {
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
    clear(): void {
        this.events = [];
    }

    /**
     * Sanitize command to remove sensitive data
     */
    private sanitizeCommand(command: string): string {
        // Remove potential secrets, tokens, passwords
        return command
            .replace(/--password[= ]\S+/gi, '--password=***')
            .replace(/--token[= ]\S+/gi, '--token=***')
            .replace(/--api-key[= ]\S+/gi, '--api-key=***')
            .replace(/--secret[= ]\S+/gi, '--secret=***');
    }
}
