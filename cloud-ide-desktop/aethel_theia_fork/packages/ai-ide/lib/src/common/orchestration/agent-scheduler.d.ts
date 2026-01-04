/**
 * Multi-Agent Orchestration with Scheduler and QoS
 * Routes requests by cost/latency/quality, manages queues, handles cancellation
 */
export interface AgentCapability {
    agentId: string;
    name?: string;
    invoke?: (payload: any) => Promise<any>;
    capabilities: string[];
    costPerRequest: number;
    avgLatency: number;
    qualityScore: number;
    maxConcurrent: number;
    currentLoad: number;
}
export interface MissionRequest {
    id: string;
    type: 'code' | 'trading' | 'research' | 'creative';
    priority: 'low' | 'normal' | 'high' | 'critical';
    budget: number;
    deadline?: number;
    requirements: {
        minQuality?: number;
        maxLatency?: number;
        maxCost?: number;
    };
    payload: any;
    idempotencyKey?: string;
}
export interface ExecutionPlan {
    requestId: string;
    selectedAgent: string;
    estimatedCost: number;
    estimatedLatency: number;
    estimatedQuality: number;
    fallbackAgents: string[];
    steps: ExecutionStep[];
}
export interface ExecutionStep {
    stepId: string;
    action: string;
    agent: string;
    dependencies: string[];
    rollbackAction?: string;
}
export interface QueueMetrics {
    queueLength: number;
    avgWaitTime: number;
    throughput: number;
    rejectionRate: number;
}
export declare class AgentScheduler {
    private agents;
    private queue;
    private executing;
    private completed;
    private readonly MAX_QUEUE_SIZE;
    private acceptedSubmissions;
    private rejectedSubmissions;
    private completionTimestampsMs;
    /**
     * Register agent with capabilities
     */
    registerAgent(capability: any): void;
    /**
     * Submit mission request
     */
    submitMission(request: MissionRequest): Promise<ExecutionPlan>;
    /**
     * Initialize scheduler
     */
    initialize(): Promise<void>;
    /**
     * Shutdown scheduler
     */
    shutdown(): Promise<void>;
    /**
     * Schedule mission (alias for submitMission)
     */
    scheduleMission(mission: any): Promise<any>;
    /**
     * Start mission execution
     */
    startMission(missionId: string): Promise<void>;
    /**
     * Pause mission
     */
    pauseMission(missionId: string): Promise<void>;
    /**
     * Resume mission
     */
    resumeMission(missionId: string): Promise<void>;
    /**
     * Cancel mission
     */
    /**
     * Complete mission
     */
    completeMission(missionId: string): Promise<void>;
    /**
     * Fail mission
     */
    failMission(missionId: string, error: string): Promise<void>;
    /**
     * Update mission progress
     */
    updateMissionProgress(missionId: string, progress: number): Promise<void>;
    /**
     * Update mission state
     */
    updateMissionState(missionId: string, state: any): Promise<void>;
    /**
     * Record cost
     */
    recordCost(missionId: string, cost: number): Promise<void>;
    /**
     * Execute agent
     */
    executeAgent(missionId: string, agentId: string): Promise<any>;
    /**
     * Get mission status
     */
    getMissionStatus(missionId: string): any;
    /**
     * Get active missions
     */
    getActiveMissions(): any[];
    /**
     * Get mission queue
     */
    getMissionQueue(): any[];
    /**
     * Register agent (simplified)
     */
    /**
     * Event emitters (simplified)
     */
    onMissionProgress(handler: (event: any) => void): void;
    onAgentProgress(handler: (event: any) => void): void;
    /**
     * Create optimal execution plan
     */
    private createExecutionPlan;
    /**
     * Find candidate agents for request
     */
    private findCandidateAgents;
    /**
     * Score agent for request
     */
    private scoreAgent;
    /**
     * Generate execution steps
     */
    private generateSteps;
    /**
     * Validate plan against requirements
     */
    private validatePlan;
    /**
     * Sort queue by priority and deadline
     */
    private sortQueue;
    /**
     * Cancel mission
     */
    cancelMission(requestId: string): Promise<boolean>;
    /**
     * Get queue metrics
     */
    getQueueMetrics(): QueueMetrics;
    /**
     * Get agent status
     */
    getAgentStatus(agentId: string): AgentCapability | undefined;
    /**
     * Get all agents
     */
    getAllAgents(): AgentCapability[];
    private calculateAvgWaitTime;
    private calculateThroughput;
    private calculateRejectionRate;
    private processQueue;
    private findBestAgent;
    private calculateETA;
}
