"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentScheduler = void 0;
const inversify_1 = require("inversify");
const mission_telemetry_1 = require("../telemetry/mission-telemetry");
let AgentScheduler = class AgentScheduler {
    constructor() {
        this.agents = new Map();
        this.queue = [];
        this.executing = new Map();
        this.completed = new Map();
        this.MAX_QUEUE_SIZE = 1000;
        this.acceptedSubmissions = 0;
        this.rejectedSubmissions = 0;
        this.completionTimestampsMs = [];
    }
    /**
     * Register agent with capabilities
     */
    registerAgent(capability) {
        const agentId = capability.agentId ?? capability.id;
        if (!agentId) {
            throw new Error('Agent must have agentId or id');
        }
        const normalized = {
            agentId,
            name: capability.name,
            invoke: capability.invoke,
            capabilities: capability.capabilities ?? ['code', 'trading', 'research', 'creative'],
            costPerRequest: capability.costPerRequest ?? 0,
            avgLatency: capability.avgLatency ?? 0,
            qualityScore: capability.qualityScore ?? 1,
            maxConcurrent: capability.maxConcurrent ?? 1,
            currentLoad: capability.currentLoad ?? 0,
        };
        this.agents.set(normalized.agentId, normalized);
    }
    /**
     * Submit mission request
     */
    async submitMission(request) {
        // Check idempotency
        if (request.idempotencyKey && this.completed.has(request.idempotencyKey)) {
            return this.completed.get(request.idempotencyKey);
        }
        // Validate budget
        if (request.budget <= 0) {
            this.rejectedSubmissions += 1;
            throw new Error('Budget must be positive');
        }
        // Check queue capacity
        if (this.queue.length >= this.MAX_QUEUE_SIZE) {
            this.rejectedSubmissions += 1;
            throw new Error('Queue full - try again later');
        }
        // Create execution plan
        const plan = this.createExecutionPlan(request);
        // Validate plan against requirements
        this.validatePlan(plan, request);
        // Add to queue
        request.enqueuedAt = Date.now();
        this.queue.push(request);
        this.sortQueue();
        this.acceptedSubmissions += 1;
        // Start processing if not already running
        this.processQueue();
        return plan;
    }
    /**
     * Initialize scheduler
     */
    async initialize() {
        // Start queue processor
        setInterval(() => this.processQueue(), 1000);
    }
    /**
     * Shutdown scheduler
     */
    async shutdown() {
        // Cancel all pending missions
        for (const request of this.queue) {
            await this.cancelMission(request.id);
        }
        this.queue = [];
    }
    /**
     * Schedule mission (alias for submitMission)
     */
    async scheduleMission(mission) {
        const request = {
            id: mission.id,
            type: mission.domain || 'code',
            priority: mission.priority || 'normal',
            budget: mission.estimatedCost || 1.0,
            deadline: mission.deadline,
            requirements: {
                minQuality: mission.minQuality,
                maxLatency: mission.maxLatency,
                maxCost: mission.maxCost,
            },
            payload: mission,
        };
        const plan = await this.submitMission(request);
        return {
            missionId: mission.id,
            status: 'scheduled',
            plan,
        };
    }
    /**
     * Start mission execution
     */
    async startMission(missionId) {
        const request = this.queue.find(r => r.id === missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not found in queue`);
        }
        // Move to executing
        this.queue = this.queue.filter(r => r.id !== missionId);
        this.executing.set(missionId, request);
    }
    /**
     * Pause mission
     */
    async pauseMission(missionId) {
        const request = this.executing.get(missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not executing`);
        }
        // Move back to queue
        this.executing.delete(missionId);
        this.queue.unshift(request);
    }
    /**
     * Resume mission
     */
    async resumeMission(missionId) {
        const request = this.queue.find(r => r.id === missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not found`);
        }
        await this.startMission(missionId);
    }
    /**
     * Cancel mission
     */
    /**
     * Complete mission
     */
    async completeMission(missionId) {
        const request = this.executing.get(missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not executing`);
        }
        this.executing.delete(missionId);
        this.completed.set(missionId, { status: 'completed', completedAt: Date.now() });
        const now = Date.now();
        this.completionTimestampsMs.push(now);
        // Keep a sliding window of last 5 minutes
        const cutoff = now - 5 * 60 * 1000;
        while (this.completionTimestampsMs.length > 0 && this.completionTimestampsMs[0] < cutoff) {
            this.completionTimestampsMs.shift();
        }
    }
    /**
     * Fail mission
     */
    async failMission(missionId, error) {
        const request = this.executing.get(missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not executing`);
        }
        this.executing.delete(missionId);
        this.completed.set(missionId, { status: 'failed', error, failedAt: Date.now() });
    }
    /**
     * Update mission progress
     */
    async updateMissionProgress(missionId, progress) {
        const request = this.executing.get(missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not executing`);
        }
        // Store progress (in real implementation, emit event)
        request.progress = progress;
    }
    /**
     * Update mission state
     */
    async updateMissionState(missionId, state) {
        const request = this.executing.get(missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not executing`);
        }
        request.state = state;
    }
    /**
     * Record cost
     */
    async recordCost(missionId, cost) {
        const request = this.executing.get(missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not executing`);
        }
        request.actualCost = (request.actualCost || 0) + cost;
        mission_telemetry_1.MissionTelemetry.recordMissionCost(missionId, cost);
    }
    /**
     * Execute agent
     */
    async executeAgent(missionId, agentId) {
        const request = this.executing.get(missionId);
        if (!request) {
            throw new Error(`Mission ${missionId} not executing`);
        }
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }
        if (typeof agent.invoke !== 'function') {
            throw new Error(`Agent ${agentId} does not support invoke()`);
        }
        const timeoutMs = (request.payload && typeof request.payload.timeout === 'number') ? request.payload.timeout : undefined;
        if (!timeoutMs) {
            return await agent.invoke(request.payload);
        }
        return await Promise.race([
            agent.invoke(request.payload),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Agent invocation timeout')), timeoutMs)),
        ]);
    }
    /**
     * Get mission status
     */
    getMissionStatus(missionId) {
        // Check executing
        const executing = this.executing.get(missionId);
        if (executing) {
            return {
                id: missionId,
                status: 'running',
                progress: executing.progress || 0,
                state: executing.state || {},
                actualCost: executing.actualCost || 0,
                budgetExceeded: (executing.actualCost || 0) > executing.budget,
                eta: this.calculateETA(executing),
            };
        }
        // Check queue
        const queued = this.queue.find(r => r.id === missionId);
        if (queued) {
            return {
                id: missionId,
                status: 'queued',
                progress: 0,
                queuePosition: this.queue.indexOf(queued),
            };
        }
        // Check completed
        const completed = this.completed.get(missionId);
        if (completed) {
            return {
                id: missionId,
                ...completed,
            };
        }
        throw new Error(`Mission ${missionId} not found`);
    }
    /**
     * Get active missions
     */
    getActiveMissions() {
        return Array.from(this.executing.keys()).map(id => this.getMissionStatus(id));
    }
    /**
     * Get mission queue
     */
    getMissionQueue() {
        return this.queue.map(r => ({
            id: r.id,
            type: r.type,
            priority: r.priority,
            budget: r.budget,
        }));
    }
    /**
     * Register agent (simplified)
     */
    /**
     * Event emitters (simplified)
     */
    onMissionProgress(handler) {
        // In real implementation, use EventEmitter
    }
    onAgentProgress(handler) {
        // In real implementation, use EventEmitter
    }
    // Private methods
    /**
     * Create optimal execution plan
     */
    createExecutionPlan(request) {
        const candidates = this.findCandidateAgents(request);
        if (candidates.length === 0) {
            throw new Error(`No agents available for mission type: ${request.type}`);
        }
        // Score candidates by cost, latency, quality
        const scored = candidates.map(agent => ({
            agent,
            score: this.scoreAgent(agent, request)
        }));
        // Sort by score (higher is better)
        scored.sort((a, b) => b.score - a.score);
        const primary = scored[0].agent;
        const fallbacks = scored.slice(1, 4).map(s => s.agent.agentId);
        return {
            requestId: request.id,
            selectedAgent: primary.agentId,
            estimatedCost: primary.costPerRequest,
            estimatedLatency: primary.avgLatency,
            estimatedQuality: primary.qualityScore,
            fallbackAgents: fallbacks,
            steps: this.generateSteps(request, primary)
        };
    }
    /**
     * Find candidate agents for request
     */
    findCandidateAgents(request) {
        const candidates = [];
        for (const agent of this.agents.values()) {
            // Check if agent supports mission type
            if (!agent.capabilities?.includes(request.type)) {
                continue;
            }
            // Check if agent has capacity
            if (agent.currentLoad >= agent.maxConcurrent) {
                continue;
            }
            // Check if agent meets requirements
            if (request.requirements.maxCost && agent.costPerRequest > request.requirements.maxCost) {
                continue;
            }
            if (request.requirements.maxLatency && agent.avgLatency > request.requirements.maxLatency) {
                continue;
            }
            if (request.requirements.minQuality && agent.qualityScore < request.requirements.minQuality) {
                continue;
            }
            candidates.push(agent);
        }
        return candidates;
    }
    /**
     * Score agent for request
     */
    scoreAgent(agent, request) {
        // Weighted scoring: quality (40%), cost (30%), latency (30%)
        const qualityScore = agent.qualityScore * 0.4;
        // Normalize cost (lower is better)
        const maxCost = request.budget;
        const costScore = (1 - (agent.costPerRequest / maxCost)) * 0.3;
        // Normalize latency (lower is better)
        const maxLatency = request.requirements.maxLatency || 30000;
        const latencyScore = (1 - (agent.avgLatency / maxLatency)) * 0.3;
        return qualityScore + costScore + latencyScore;
    }
    /**
     * Generate execution steps
     */
    generateSteps(request, agent) {
        // Simplified - real implementation would be more complex
        return [
            {
                stepId: `${request.id}-1`,
                action: 'validate_input',
                agent: agent.agentId,
                dependencies: []
            },
            {
                stepId: `${request.id}-2`,
                action: 'execute_mission',
                agent: agent.agentId,
                dependencies: [`${request.id}-1`]
            },
            {
                stepId: `${request.id}-3`,
                action: 'validate_output',
                agent: agent.agentId,
                dependencies: [`${request.id}-2`],
                rollbackAction: 'cleanup'
            }
        ];
    }
    /**
     * Validate plan against requirements
     */
    validatePlan(plan, request) {
        if (plan.estimatedCost > request.budget) {
            throw new Error(`Estimated cost ${plan.estimatedCost} exceeds budget ${request.budget}`);
        }
        if (request.requirements.maxLatency && plan.estimatedLatency > request.requirements.maxLatency) {
            throw new Error(`Estimated latency ${plan.estimatedLatency}ms exceeds max ${request.requirements.maxLatency}ms`);
        }
        if (request.requirements.minQuality && plan.estimatedQuality < request.requirements.minQuality) {
            throw new Error(`Estimated quality ${plan.estimatedQuality} below minimum ${request.requirements.minQuality}`);
        }
    }
    /**
     * Sort queue by priority and deadline
     */
    sortQueue() {
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        this.queue.sort((a, b) => {
            // Priority first
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // Then deadline
            if (a.deadline && b.deadline) {
                return a.deadline - b.deadline;
            }
            if (a.deadline)
                return -1;
            if (b.deadline)
                return 1;
            return 0;
        });
    }
    /**
     * Cancel mission
     */
    async cancelMission(requestId) {
        // Remove from queue
        const queueIndex = this.queue.findIndex(r => r.id === requestId);
        if (queueIndex >= 0) {
            this.queue.splice(queueIndex, 1);
            return true;
        }
        // Cancel executing mission
        if (this.executing.has(requestId)) {
            // Trigger rollback
            this.executing.delete(requestId);
            return true;
        }
        return false;
    }
    /**
     * Get queue metrics
     */
    getQueueMetrics() {
        return {
            queueLength: this.queue.length,
            avgWaitTime: this.calculateAvgWaitTime(),
            throughput: this.calculateThroughput(),
            rejectionRate: this.calculateRejectionRate()
        };
    }
    /**
     * Get agent status
     */
    getAgentStatus(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * Get all agents
     */
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    calculateAvgWaitTime() {
        if (this.queue.length === 0)
            return 0;
        const now = Date.now();
        const ages = this.queue
            .map(r => (typeof r.enqueuedAt === 'number' ? now - r.enqueuedAt : 0))
            .filter(ms => ms >= 0);
        if (ages.length === 0)
            return 0;
        return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    }
    calculateThroughput() {
        const now = Date.now();
        const windowMs = 60 * 1000;
        const cutoff = now - windowMs;
        const countLastMinute = this.completionTimestampsMs.filter(t => t >= cutoff).length;
        // missions per minute
        return countLastMinute;
    }
    calculateRejectionRate() {
        const total = this.acceptedSubmissions + this.rejectedSubmissions;
        if (total === 0)
            return 0;
        return this.rejectedSubmissions / total;
    }
    processQueue() {
        // Process pending missions
        if (this.queue.length === 0)
            return;
        // Get next mission
        const next = this.queue[0];
        if (!next)
            return;
        // Check if we can execute
        const agent = this.findBestAgent(next);
        if (!agent)
            return;
        // Start execution
        this.startMission(next.id).catch(err => {
            console.error('Failed to start mission:', err);
        });
    }
    findBestAgent(request) {
        const candidates = this.findCandidateAgents(request);
        if (candidates.length === 0)
            return null;
        const scored = candidates.map(agent => ({
            agent,
            score: this.scoreAgent(agent, request)
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0].agent;
    }
    calculateETA(request) {
        const progress = request.progress || 0;
        if (progress === 0)
            return 0;
        const elapsed = Date.now() - (request.startTime || Date.now());
        const total = elapsed / progress;
        return Date.now() + (total - elapsed);
    }
};
exports.AgentScheduler = AgentScheduler;
exports.AgentScheduler = AgentScheduler = __decorate([
    (0, inversify_1.injectable)()
], AgentScheduler);
