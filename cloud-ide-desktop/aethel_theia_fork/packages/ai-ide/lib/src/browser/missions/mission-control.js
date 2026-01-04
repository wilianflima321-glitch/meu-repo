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
var MissionControlWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionControlWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("inversify");
const react_widget_1 = require("@theia/core/lib/browser/widgets/react-widget");
const websocket_service_1 = require("../../common/websocket/websocket-service");
const agent_scheduler_1 = require("../../common/orchestration/agent-scheduler");
/**
 * Mission Control widget
 */
let MissionControlWidget = class MissionControlWidget extends react_widget_1.ReactWidget {
    static { MissionControlWidget_1 = this; }
    static { this.ID = 'mission-control-widget'; }
    static { this.LABEL = 'Mission Control'; }
    constructor(wsClient, scheduler) {
        super();
        this.missions = [];
        this.presets = [];
        this.isConnected = false;
        this.wsClient = wsClient;
        this.scheduler = scheduler;
    }
    init() {
        this.id = MissionControlWidget_1.ID;
        this.title.label = MissionControlWidget_1.LABEL;
        this.title.caption = MissionControlWidget_1.LABEL;
        this.title.closable = true;
        this.title.iconClass = 'fa fa-rocket';
        this.initializePresets();
        this.connectWebSocket();
        this.update();
    }
    async connectWebSocket() {
        try {
            await this.wsClient.connect();
            this.isConnected = true;
            // Subscribe to mission updates
            this.wsClient.on('mission:update', (data) => {
                this.handleMissionUpdate(data);
            });
            this.wsClient.on('mission:error', (data) => {
                this.handleMissionError(data);
            });
            this.wsClient.on('agent:status', (data) => {
                this.handleAgentStatus(data);
            });
            this.update();
        }
        catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.isConnected = false;
        }
    }
    handleMissionUpdate(data) {
        const missionIndex = this.missions.findIndex(m => m.id === data.missionId);
        if (missionIndex >= 0) {
            this.missions[missionIndex] = {
                ...this.missions[missionIndex],
                ...data.updates
            };
            this.update();
        }
    }
    handleMissionError(data) {
        const missionIndex = this.missions.findIndex(m => m.id === data.missionId);
        if (missionIndex >= 0) {
            this.missions[missionIndex].errors.push(data.error);
            this.missions[missionIndex].status = 'failed';
            this.update();
        }
    }
    handleAgentStatus(data) {
        // Update agent status in UI
        this.update();
    }
    dispose() {
        this.wsClient.disconnect();
        super.dispose();
    }
    onActivateRequest(msg) {
        super.onActivateRequest(msg);
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mission-control", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mission-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Mission Control" }), (0, jsx_runtime_1.jsx)("p", { children: "Select a mission type to begin" })] }), (0, jsx_runtime_1.jsx)("div", { className: "mission-presets", children: this.presets.map(preset => this.renderPreset(preset)) }), this.missions.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mission-status", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Active Missions" }), this.missions.map(mission => this.renderMission(mission))] }))] }));
    }
    renderPreset(preset) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: `mission-preset ${preset.domain}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "preset-header", children: [(0, jsx_runtime_1.jsx)("span", { className: `preset-icon ${preset.icon}` }), (0, jsx_runtime_1.jsx)("h3", { children: preset.name }), (0, jsx_runtime_1.jsx)("span", { className: `risk-badge ${preset.riskLevel}`, children: preset.riskLevel })] }), (0, jsx_runtime_1.jsx)("p", { className: "preset-description", children: preset.description }), (0, jsx_runtime_1.jsxs)("div", { className: "preset-estimates", children: [(0, jsx_runtime_1.jsxs)("div", { className: "estimate-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "estimate-label", children: "Cost:" }), (0, jsx_runtime_1.jsxs)("span", { className: "estimate-value", children: ["$", preset.estimatedCost.min.toFixed(2), " - $", preset.estimatedCost.max.toFixed(2), (0, jsx_runtime_1.jsxs)("span", { className: "estimate-typical", children: [" (typically $", preset.estimatedCost.typical.toFixed(2), ")"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "estimate-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "estimate-label", children: "Time:" }), (0, jsx_runtime_1.jsxs)("span", { className: "estimate-value", children: [this.formatDuration(preset.estimatedTime.min), " - ", this.formatDuration(preset.estimatedTime.max), (0, jsx_runtime_1.jsxs)("span", { className: "estimate-typical", children: [" (typically ", this.formatDuration(preset.estimatedTime.typical), ")"] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "preset-requirements", children: [(0, jsx_runtime_1.jsx)("span", { className: `plan-badge ${preset.requiredPlan}`, children: preset.requiredPlan }), preset.requiresApproval && (0, jsx_runtime_1.jsx)("span", { className: "approval-badge", children: "Requires Approval" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "preset-examples", children: [(0, jsx_runtime_1.jsx)("p", { className: "examples-label", children: "Examples:" }), (0, jsx_runtime_1.jsx)("ul", { children: preset.examples.map((example, idx) => ((0, jsx_runtime_1.jsx)("li", { children: example }, idx))) })] }), (0, jsx_runtime_1.jsx)("button", { className: "preset-start-button", onClick: () => this.startMission(preset), children: "Start Mission" })] }, preset.id));
    }
    renderMission(mission) {
        const progressPercent = mission.progress * 100;
        const costPercent = (mission.actualCost / mission.estimatedCost) * 100;
        return ((0, jsx_runtime_1.jsxs)("div", { className: `mission-status-card ${mission.status}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "mission-status-header", children: [(0, jsx_runtime_1.jsx)("h4", { children: mission.preset }), (0, jsx_runtime_1.jsx)("span", { className: `status-badge ${mission.status}`, children: mission.status })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mission-progress", children: [(0, jsx_runtime_1.jsxs)("div", { className: "progress-label", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Progress: ", progressPercent.toFixed(0), "%"] }), (0, jsx_runtime_1.jsx)("span", { className: "current-stage", children: mission.currentStage })] }), (0, jsx_runtime_1.jsx)("div", { className: "progress-bar", children: (0, jsx_runtime_1.jsx)("div", { className: "progress-fill", style: { width: `${progressPercent}%` } }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mission-cost", children: [(0, jsx_runtime_1.jsxs)("div", { className: "cost-label", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Cost: $", mission.actualCost.toFixed(4), " / $", mission.estimatedCost.toFixed(4)] }), (0, jsx_runtime_1.jsxs)("span", { className: `cost-percent ${costPercent > 100 ? 'over-budget' : ''}`, children: [costPercent.toFixed(0), "%"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "cost-bar", children: (0, jsx_runtime_1.jsx)("div", { className: `cost-fill ${costPercent > 100 ? 'over-budget' : ''}`, style: { width: `${Math.min(costPercent, 100)}%` } }) })] }), mission.estimatedCompletion && ((0, jsx_runtime_1.jsx)("div", { className: "mission-eta", children: (0, jsx_runtime_1.jsxs)("span", { children: ["ETA: ", this.formatETA(mission.estimatedCompletion)] }) })), mission.errors.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mission-errors", children: [(0, jsx_runtime_1.jsx)("p", { className: "errors-label", children: "Errors:" }), (0, jsx_runtime_1.jsx)("ul", { children: mission.errors.map((error, idx) => ((0, jsx_runtime_1.jsx)("li", { className: "error-item", children: error }, idx))) })] })), mission.warnings.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mission-warnings", children: [(0, jsx_runtime_1.jsx)("p", { className: "warnings-label", children: "Warnings:" }), (0, jsx_runtime_1.jsx)("ul", { children: mission.warnings.map((warning, idx) => ((0, jsx_runtime_1.jsx)("li", { className: "warning-item", children: warning }, idx))) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "mission-actions", children: [mission.status === 'running' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => this.pauseMission(mission.id), children: "Pause" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => this.cancelMission(mission.id), children: "Cancel" })] })), mission.status === 'paused' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => this.resumeMission(mission.id), children: "Resume" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => this.cancelMission(mission.id), children: "Cancel" })] })), (mission.status === 'completed' || mission.status === 'failed') && ((0, jsx_runtime_1.jsx)("button", { onClick: () => this.removeMission(mission.id), children: "Remove" }))] })] }, mission.id));
    }
    initializePresets() {
        this.presets = [
            {
                id: 'code-feature',
                name: 'Code Feature',
                domain: 'code',
                description: 'Implement a new feature with tests and documentation',
                icon: 'fa-code',
                toolchain: 'code',
                estimatedCost: { min: 0.05, max: 0.50, typical: 0.15 },
                estimatedTime: { min: 300, max: 1800, typical: 600 },
                riskLevel: 'low',
                requiresApproval: false,
                requiredPlan: 'starter', // Disponível a partir do Starter (R$15)
                examples: [
                    'Add user authentication',
                    'Implement REST API endpoint',
                    'Create data validation',
                ],
            },
            {
                id: 'code-refactor',
                name: 'Code Refactor',
                domain: 'code',
                description: 'Refactor existing code for better maintainability',
                icon: 'fa-wrench',
                toolchain: 'code',
                estimatedCost: { min: 0.10, max: 1.00, typical: 0.30 },
                estimatedTime: { min: 600, max: 3600, typical: 1200 },
                riskLevel: 'medium',
                requiresApproval: false,
                requiredPlan: 'starter', // Disponível a partir do Starter (R$15)
                examples: [
                    'Extract common utilities',
                    'Improve error handling',
                    'Optimize database queries',
                ],
            },
            {
                id: 'code-deploy',
                name: 'Production Deploy',
                domain: 'code',
                description: 'Deploy code to production with smoke tests',
                icon: 'fa-rocket',
                toolchain: 'code',
                estimatedCost: { min: 0.10, max: 0.50, typical: 0.20 },
                estimatedTime: { min: 300, max: 900, typical: 450 },
                riskLevel: 'high',
                requiresApproval: true,
                requiredPlan: 'pro',
                examples: [
                    'Deploy API changes',
                    'Update frontend',
                    'Database migration',
                ],
            },
            {
                id: 'trading-backtest',
                name: 'Strategy Backtest',
                domain: 'trading',
                description: 'Backtest trading strategy on historical data',
                icon: 'fa-chart-line',
                toolchain: 'trading',
                estimatedCost: { min: 0.05, max: 0.20, typical: 0.10 },
                estimatedTime: { min: 120, max: 600, typical: 300 },
                riskLevel: 'low',
                requiresApproval: false,
                requiredPlan: 'pro',
                examples: [
                    'Test momentum strategy',
                    'Validate mean reversion',
                    'Optimize parameters',
                ],
            },
            {
                id: 'trading-paper',
                name: 'Paper Trading',
                domain: 'trading',
                description: 'Run strategy in paper trading mode',
                icon: 'fa-file-invoice-dollar',
                toolchain: 'trading',
                estimatedCost: { min: 0.10, max: 0.50, typical: 0.20 },
                estimatedTime: { min: 86400, max: 604800, typical: 259200 },
                riskLevel: 'low',
                requiresApproval: false,
                requiredPlan: 'pro',
                examples: [
                    'Test strategy live',
                    'Validate execution',
                    'Monitor performance',
                ],
            },
            {
                id: 'trading-live',
                name: 'Live Trading',
                domain: 'trading',
                description: 'Execute real trades with risk controls',
                icon: 'fa-dollar-sign',
                toolchain: 'trading',
                estimatedCost: { min: 0.50, max: 5.00, typical: 1.00 },
                estimatedTime: { min: 86400, max: 2592000, typical: 604800 },
                riskLevel: 'high',
                requiresApproval: true,
                requiredPlan: 'enterprise',
                examples: [
                    'Deploy validated strategy',
                    'Automated trading',
                    'Portfolio management',
                ],
            },
            {
                id: 'research-analysis',
                name: 'Research Analysis',
                domain: 'research',
                description: 'Gather and analyze data from multiple sources',
                icon: 'fa-search',
                toolchain: 'research',
                estimatedCost: { min: 0.10, max: 1.00, typical: 0.30 },
                estimatedTime: { min: 300, max: 1800, typical: 600 },
                riskLevel: 'low',
                requiresApproval: false,
                requiredPlan: 'pro',
                examples: [
                    'Market research',
                    'Competitor analysis',
                    'Literature review',
                ],
            },
            {
                id: 'creative-storyboard',
                name: 'Storyboard Creation',
                domain: 'creative',
                description: 'Generate visual storyboard from script',
                icon: 'fa-film',
                toolchain: 'creative',
                estimatedCost: { min: 0.20, max: 2.00, typical: 0.50 },
                estimatedTime: { min: 600, max: 3600, typical: 1200 },
                riskLevel: 'low',
                requiresApproval: false,
                requiredPlan: 'pro',
                examples: [
                    'Film scene planning',
                    'Game cutscene',
                    'Animation sequence',
                ],
            },
            {
                id: 'creative-render',
                name: 'Scene Rendering',
                domain: 'creative',
                description: 'Render final scene with lighting and effects',
                icon: 'fa-image',
                toolchain: 'creative',
                estimatedCost: { min: 1.00, max: 10.00, typical: 3.00 },
                estimatedTime: { min: 1800, max: 7200, typical: 3600 },
                riskLevel: 'medium',
                requiresApproval: false,
                requiredPlan: 'pro',
                examples: [
                    'Final render',
                    'Preview generation',
                    'Asset creation',
                ],
            },
            {
                id: 'creative-publish',
                name: 'Asset Publishing',
                domain: 'creative',
                description: 'Publish asset to marketplace',
                icon: 'fa-upload',
                toolchain: 'creative',
                estimatedCost: { min: 0.05, max: 0.20, typical: 0.10 },
                estimatedTime: { min: 60, max: 300, typical: 120 },
                riskLevel: 'high',
                requiresApproval: true,
                requiredPlan: 'pro',
                examples: [
                    'Publish 3D model',
                    'Share animation',
                    'Release game asset',
                ],
            },
        ];
    }
    async startMission(preset) {
        const mission = {
            id: `mission_${Date.now()}`,
            preset: preset.name,
            status: 'queued',
            progress: 0,
            currentStage: 'Initializing',
            startedAt: Date.now(),
            estimatedCompletion: Date.now() + preset.estimatedTime.typical * 1000,
            actualCost: 0,
            estimatedCost: preset.estimatedCost.typical,
            errors: [],
            warnings: [],
        };
        this.missions.push(mission);
        this.update();
        try {
            if (!this.isConnected) {
                throw new Error('Backend WebSocket indisponível. Conecte o Mission Control a um backend real antes de iniciar uma missão.');
            }
            // Schedule mission with AgentScheduler
            await this.scheduler.scheduleMission({
                id: mission.id,
                name: preset.name,
                description: preset.description,
                domain: preset.domain,
                priority: preset.riskLevel === 'high' ? 'high' : 'normal',
                estimatedCost: preset.estimatedCost.typical,
                estimatedTime: preset.estimatedTime.typical,
            });
            // Notify via WebSocket
            this.wsClient.send('mission:start', {
                missionId: mission.id,
                preset: preset.id,
                timestamp: Date.now(),
            });
            mission.status = 'running';
            this.update();
        }
        catch (error) {
            mission.status = 'failed';
            mission.errors.push(`Failed to start mission: ${error}`);
            this.update();
        }
    }
    async pauseMission(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission)
            return;
        try {
            await this.scheduler.pauseMission(missionId);
            this.wsClient.send('mission:pause', { missionId, timestamp: Date.now() });
            mission.status = 'paused';
            this.update();
        }
        catch (error) {
            mission.errors.push(`Failed to pause mission: ${error}`);
            this.update();
        }
    }
    async resumeMission(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission)
            return;
        try {
            await this.scheduler.resumeMission(missionId);
            this.wsClient.send('mission:resume', { missionId, timestamp: Date.now() });
            mission.status = 'running';
            this.update();
        }
        catch (error) {
            mission.errors.push(`Failed to resume mission: ${error}`);
            this.update();
        }
    }
    async cancelMission(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission)
            return;
        try {
            await this.scheduler.cancelMission(missionId);
            this.wsClient.send('mission:cancel', { missionId, timestamp: Date.now() });
            mission.status = 'failed';
            mission.errors.push('Mission cancelled by user');
            this.update();
        }
        catch (error) {
            mission.errors.push(`Failed to cancel mission: ${error}`);
            this.update();
        }
    }
    removeMission(missionId) {
        this.missions = this.missions.filter(m => m.id !== missionId);
        this.update();
    }
    formatDuration(seconds) {
        if (seconds < 60)
            return `${seconds}s`;
        if (seconds < 3600)
            return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400)
            return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }
    formatETA(timestamp) {
        const remaining = timestamp - Date.now();
        if (remaining < 0)
            return 'Overdue';
        return this.formatDuration(Math.floor(remaining / 1000));
    }
};
exports.MissionControlWidget = MissionControlWidget;
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MissionControlWidget.prototype, "init", null);
exports.MissionControlWidget = MissionControlWidget = MissionControlWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(websocket_service_1.MissionWebSocketClient)),
    __param(1, (0, inversify_1.inject)(agent_scheduler_1.AgentScheduler)),
    __metadata("design:paramtypes", [websocket_service_1.MissionWebSocketClient,
        agent_scheduler_1.AgentScheduler])
], MissionControlWidget);
