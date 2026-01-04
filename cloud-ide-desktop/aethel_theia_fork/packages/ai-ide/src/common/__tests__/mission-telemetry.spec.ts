import { expect } from 'chai';
import { MissionTelemetry } from '../telemetry/mission-telemetry';

describe('MissionTelemetry', () => {
    let telemetry: MissionTelemetry;

    beforeEach(() => {
        telemetry = new MissionTelemetry();
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
        expect(metrics.length).to.be.greaterThan(0);
    });

    it('should calculate metric stats', () => {
        telemetry.recordMetric({ name: 'code.test_coverage', value: 0.5, unit: 'ratio', domain: 'code', labels: {} });
        telemetry.recordMetric({ name: 'code.test_coverage', value: 0.9, unit: 'ratio', domain: 'code', labels: {} });
        const stats = telemetry.getMetricStats('code.test_coverage');
        expect(stats.max).to.equal(0.9);
    });
});
