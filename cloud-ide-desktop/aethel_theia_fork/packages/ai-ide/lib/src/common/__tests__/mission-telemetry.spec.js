"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const mission_telemetry_1 = require("../telemetry/mission-telemetry");
describe('MissionTelemetry', () => {
    let telemetry;
    beforeEach(() => {
        telemetry = new mission_telemetry_1.MissionTelemetry();
    });
    it('should record and retrieve metrics', () => {
        telemetry.recordMetric({
            name: 'code.build_time',
            value: 1,
            unit: 'seconds',
            domain: 'code',
            labels: { missionId: 'mission-1' },
        });
        const metrics = telemetry.getMetrics('code');
        (0, chai_1.expect)(metrics.length).to.be.greaterThan(0);
    });
    it('should calculate metric stats', () => {
        telemetry.recordMetric({ name: 'code.test_coverage', value: 0.5, unit: 'ratio', domain: 'code', labels: {} });
        telemetry.recordMetric({ name: 'code.test_coverage', value: 0.9, unit: 'ratio', domain: 'code', labels: {} });
        const stats = telemetry.getMetricStats('code.test_coverage');
        (0, chai_1.expect)(stats.max).to.equal(0.9);
    });
});
