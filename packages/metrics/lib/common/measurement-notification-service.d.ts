import { MeasurementResult } from '@theia/core';
export declare const measurementNotificationServicePath = "/services/measurement-notification";
export declare const MeasurementNotificationService: unique symbol;
export interface MeasurementNotificationService {
    /**
     * Notify the backend when a fronted stopwatch provides a new measurement.
     * @param frontendId The unique id associated with the frontend that sends the notification
     * @param result The new measurement result
     */
    onFrontendMeasurement(frontendId: string, result: MeasurementResult): void;
}
//# sourceMappingURL=measurement-notification-service.d.ts.map