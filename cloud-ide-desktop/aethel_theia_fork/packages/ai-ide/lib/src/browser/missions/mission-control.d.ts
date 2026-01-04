import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser';
import { MissionWebSocketClient } from '../../common/websocket/websocket-service';
import { AgentScheduler } from '../../common/orchestration/agent-scheduler';
/**
 * Mission preset
 */
export interface MissionPreset {
    id: string;
    name: string;
    domain: 'code' | 'trading' | 'research' | 'creative';
    description: string;
    icon: string;
    toolchain: string;
    estimatedCost: {
        min: number;
        max: number;
        typical: number;
    };
    estimatedTime: {
        min: number;
        max: number;
        typical: number;
    };
    riskLevel: 'low' | 'medium' | 'high';
    requiresApproval: boolean;
    requiredPlan: 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
    examples: string[];
}
/**
 * Mission status
 */
export interface MissionStatus {
    id: string;
    preset: string;
    status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
    progress: number;
    currentStage: string;
    startedAt: number;
    estimatedCompletion?: number;
    actualCost: number;
    estimatedCost: number;
    errors: string[];
    warnings: string[];
}
/**
 * Mission Control widget
 */
export declare class MissionControlWidget extends ReactWidget {
    static readonly ID = "mission-control-widget";
    static readonly LABEL = "Mission Control";
    private missions;
    private presets;
    private wsClient;
    private scheduler;
    private isConnected;
    constructor(wsClient: MissionWebSocketClient, scheduler: AgentScheduler);
    protected init(): void;
    private connectWebSocket;
    private handleMissionUpdate;
    private handleMissionError;
    private handleAgentStatus;
    dispose(): void;
    protected onActivateRequest(msg: Message): void;
    protected render(): React.ReactNode;
    private renderPreset;
    private renderMission;
    private initializePresets;
    private startMission;
    private pauseMission;
    private resumeMission;
    private cancelMission;
    private removeMission;
    private formatDuration;
    private formatETA;
}
