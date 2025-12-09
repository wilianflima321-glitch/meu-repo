import { expect } from 'chai';
import { MissionTelemetry } from '../telemetry/mission-telemetry';

describe('MissionTelemetry', () => {
    let telemetry: MissionTelemetry;

    beforeEach(() => {
        telemetry = new MissionTelemetry();
    });

    it('should track mission start', () => {
        telemetry.startMission('mission-1', { name: 'Test', startTime: new Date() });
        const metrics = telemetry.getMissionMetrics('mission-1');
        expect(metrics).to.exist;
        expect(metrics.missionId).to.equal('mission-1');
    });

    it('should track mission end', () => {
        telemetry.startMission('mission-1', { name: 'Test', startTime: new Date() });
        telemetry.endMission('mission-1', { status: 'completed', endTime: new Date() });
        const metrics = telemetry.getMissionMetrics('mission-1');
        expect(metrics.status).to.equal('completed');
    });

    it('should record token usage', () => {
        telemetry.startMission('mission-1', { name: 'Test', startTime: new Date() });
        telemetry.recordTokenUsage('mission-1', {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
        });
        const metrics = telemetry.getMissionMetrics('mission-1');
        expect(metrics.tokenUsage.totalTokens).to.equal(150);
    });

    it('should calculate duration', () => {
        const start = Date.now();
        telemetry.startMission('mission-1', { name: 'Test', startTime: new Date(start) });
        setTimeout(() => {
            telemetry.endMission('mission-1', { status: 'completed', endTime: new Date() });
            const metrics = telemetry.getMissionMetrics('mission-1');
            expect(metrics.duration).to.be.greaterThan(0);
        }, 100);
    });

    it('should track multiple missions', () => {
        telemetry.startMission('mission-1', { name: 'Test 1', startTime: new Date() });
        telemetry.startMission('mission-2', { name: 'Test 2', startTime: new Date() });
        
        const metrics1 = telemetry.getMissionMetrics('mission-1');
        const metrics2 = telemetry.getMissionMetrics('mission-2');
        
        expect(metrics1.missionId).to.equal('mission-1');
        expect(metrics2.missionId).to.equal('mission-2');
    });
});
