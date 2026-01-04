import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * AETHEL ADVANCED GAME AI ENGINE
 * ============================================================================
 *
 * Sistema de IA para NPCs AAA completo:
 * - Behavior Trees (BT)
 * - Goal-Oriented Action Planning (GOAP)
 * - Utility AI
 * - Hierarchical Task Network (HTN)
 * - State Machines
 * - Blackboard system
 * - Perception system (sight, hearing, memory)
 * - Navigation (A*, navmesh, crowds)
 * - Squad AI & tactics
 * - LLM integration for dialogue/decisions
 */
export type AgentId = string;
export type BlackboardKey = string;
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface Blackboard {
    /** Owner agent */
    ownerId: AgentId;
    /** Key-value storage */
    data: Map<BlackboardKey, unknown>;
    /** Observers */
    observers: Map<BlackboardKey, Set<(value: unknown) => void>>;
    /** Timestamps */
    timestamps: Map<BlackboardKey, number>;
}
export declare class BlackboardService {
    private blackboards;
    private globalBlackboard;
    constructor();
    createBlackboard(ownerId: AgentId): Blackboard;
    getBlackboard(ownerId: AgentId): Blackboard | undefined;
    getGlobalBlackboard(): Blackboard;
    setValue(bb: Blackboard, key: BlackboardKey, value: unknown): void;
    getValue<T>(bb: Blackboard, key: BlackboardKey): T | undefined;
    observe(bb: Blackboard, key: BlackboardKey, callback: (value: unknown) => void): () => void;
}
export declare enum BTStatus {
    Success = "success",
    Failure = "failure",
    Running = "running"
}
export interface BTContext {
    agent: AIAgent;
    blackboard: Blackboard;
    deltaTime: number;
}
export declare abstract class BTNode {
    abstract tick(context: BTContext): BTStatus;
    reset(): void;
}
export declare class BTSequence extends BTNode {
    private children;
    private currentIndex;
    constructor(children: BTNode[]);
    tick(context: BTContext): BTStatus;
    reset(): void;
}
export declare class BTSelector extends BTNode {
    private children;
    private currentIndex;
    constructor(children: BTNode[]);
    tick(context: BTContext): BTStatus;
    reset(): void;
}
export declare class BTParallel extends BTNode {
    private children;
    private successThreshold;
    constructor(children: BTNode[], successThreshold?: number);
    tick(context: BTContext): BTStatus;
}
export declare class BTInverter extends BTNode {
    private child;
    constructor(child: BTNode);
    tick(context: BTContext): BTStatus;
}
export declare class BTRepeat extends BTNode {
    private child;
    private times;
    private count;
    constructor(child: BTNode, times: number);
    tick(context: BTContext): BTStatus;
}
export declare class BTCooldown extends BTNode {
    private child;
    private cooldownSeconds;
    private lastExecutionTime;
    constructor(child: BTNode, cooldownSeconds: number);
    tick(context: BTContext): BTStatus;
}
export declare class BTCondition extends BTNode {
    private condition;
    constructor(condition: (context: BTContext) => boolean);
    tick(context: BTContext): BTStatus;
}
export declare class BTAction extends BTNode {
    private action;
    constructor(action: (context: BTContext) => BTStatus);
    tick(context: BTContext): BTStatus;
}
export declare class BTWait extends BTNode {
    private duration;
    private elapsed;
    constructor(duration: number);
    tick(context: BTContext): BTStatus;
    reset(): void;
}
export interface WorldState {
    [key: string]: boolean | number | string;
}
export interface GOAPAction {
    name: string;
    cost: number;
    preconditions: WorldState;
    effects: WorldState;
    /** Check if action can be performed */
    canPerform(agent: AIAgent): boolean;
    /** Perform the action */
    perform(agent: AIAgent): Promise<boolean>;
}
export interface GOAPGoal {
    name: string;
    priority: number;
    targetState: WorldState;
    /** Check if goal is achieved */
    isAchieved(currentState: WorldState): boolean;
    /** Get relevance of this goal (0-1) */
    getRelevance(agent: AIAgent): number;
}
export declare class GOAPPlanner {
    planActions(currentState: WorldState, goal: GOAPGoal, availableActions: GOAPAction[]): GOAPAction[] | null;
    private checkPreconditions;
    private applyEffects;
    private calculateHeuristic;
}
export interface UtilityAction {
    name: string;
    /** Calculate utility score (0-1) */
    calculateScore(agent: AIAgent, context: UtilityContext): number;
    /** Execute the action */
    execute(agent: AIAgent): Promise<void>;
}
export interface UtilityContext {
    agent: AIAgent;
    blackboard: Blackboard;
    nearbyAgents: AIAgent[];
    threats: Threat[];
    opportunities: Opportunity[];
}
export interface Threat {
    source: AIAgent;
    dangerLevel: number;
    distance: number;
    position: Vector3;
}
export interface Opportunity {
    type: string;
    value: number;
    distance: number;
    position: Vector3;
}
export interface UtilityCurve {
    type: 'linear' | 'quadratic' | 'exponential' | 'logistic' | 'step';
    params: {
        slope?: number;
        exponent?: number;
        midpoint?: number;
        steepness?: number;
        threshold?: number;
    };
}
export declare class UtilityAISystem {
    evaluateActions(actions: UtilityAction[], agent: AIAgent, context: UtilityContext): UtilityAction | null;
    applyCurve(value: number, curve: UtilityCurve): number;
}
export interface PerceptionConfig {
    /** Vision */
    visionRange: number;
    visionAngle: number;
    /** Hearing */
    hearingRange: number;
    /** Memory duration */
    memoryDuration: number;
    /** Update rate */
    perceptionRate: number;
}
export interface PerceivedEntity {
    entityId: string;
    entityType: 'agent' | 'item' | 'hazard' | 'poi';
    position: Vector3;
    lastSeenTime: number;
    isVisible: boolean;
    isAudible: boolean;
    confidence: number;
    faction: string;
    threat: number;
}
export declare class PerceptionSystem {
    private perceivedEntities;
    updatePerception(agent: AIAgent, config: PerceptionConfig, worldEntities: {
        id: string;
        position: Vector3;
        type: string;
        faction: string;
    }[], raycastFn: (from: Vector3, to: Vector3) => boolean): PerceivedEntity[];
    private getAgentMemory;
    private calculateThreat;
    private distance;
    private subtract;
    private normalize;
    private dot;
}
export interface NavMesh {
    vertices: Float32Array;
    triangles: Uint32Array;
    adjacency: Map<number, number[]>;
}
export interface NavPath {
    waypoints: Vector3[];
    totalDistance: number;
    isPartial: boolean;
}
export declare class NavigationSystem {
    private navMesh?;
    setNavMesh(navMesh: NavMesh): void;
    findPath(start: Vector3, end: Vector3): NavPath | null;
    private findTriangle;
    private astarPath;
    private trianglePathToWaypoints;
    private calculatePathDistance;
}
export interface AIAgentConfig {
    id: AgentId;
    name: string;
    faction: string;
    /** AI type */
    aiType: 'behavior_tree' | 'goap' | 'utility' | 'hybrid';
    /** Behavior tree (if aiType includes BT) */
    behaviorTree?: BTNode;
    /** GOAP actions and goals */
    goapActions?: GOAPAction[];
    goapGoals?: GOAPGoal[];
    /** Utility actions */
    utilityActions?: UtilityAction[];
    /** Perception config */
    perception: PerceptionConfig;
    /** Movement */
    moveSpeed: number;
    rotationSpeed: number;
}
export declare class AIAgent {
    id: AgentId;
    name: string;
    faction: string;
    position: Vector3;
    rotation: number;
    forward: Vector3;
    health: number;
    isAlive: boolean;
    aiType: string;
    behaviorTree?: BTNode;
    goapActions: GOAPAction[];
    goapGoals: GOAPGoal[];
    utilityActions: UtilityAction[];
    currentGoal?: GOAPGoal;
    currentPlan: GOAPAction[];
    currentPath?: NavPath;
    perceptionConfig: PerceptionConfig;
    perceivedEntities: PerceivedEntity[];
    moveSpeed: number;
    rotationSpeed: number;
    constructor(config: AIAgentConfig);
}
export interface Squad {
    id: string;
    leaderId: AgentId;
    memberIds: AgentId[];
    /** Formation */
    formation: 'line' | 'wedge' | 'column' | 'diamond' | 'custom';
    formationSpacing: number;
    /** Tactics */
    currentTactic: 'attack' | 'defend' | 'patrol' | 'search' | 'retreat';
    /** Shared knowledge */
    sharedBlackboard: Blackboard;
}
export declare class SquadAISystem {
    private squads;
    private agentToSquad;
    createSquad(leader: AIAgent): Squad;
    addToSquad(squadId: string, agent: AIAgent): void;
    removeFromSquad(agentId: AgentId): void;
    getFormationPosition(squad: Squad, agentId: AgentId, leaderPosition: Vector3, leaderForward: Vector3): Vector3;
    private getLineFormationPosition;
    private getWedgeFormationPosition;
    private getColumnFormationPosition;
    private getDiamondFormationPosition;
    setSquadTactic(squadId: string, tactic: Squad['currentTactic']): void;
}
export interface LLMDecisionRequest {
    agentId: AgentId;
    agentPersonality: string;
    currentSituation: string;
    availableActions: string[];
    context: Record<string, unknown>;
}
export interface LLMDialogueRequest {
    agentId: AgentId;
    agentPersonality: string;
    speakingTo: string;
    topic: string;
    mood: string;
    previousLines: string[];
}
export declare class AILLMIntegration {
    private llmEndpoint;
    getDecision(request: LLMDecisionRequest): Promise<string>;
    generateDialogue(request: LLMDialogueRequest): Promise<string>;
    private callLLM;
}
export declare class GameAIEngine {
    private agents;
    private blackboardService;
    private goapPlanner;
    private utilityAI;
    private perceptionSystem;
    private navigationSystem;
    private squadAI;
    private llmIntegration;
    private readonly onAgentDecisionEmitter;
    readonly onAgentDecision: Event<{
        agentId: AgentId;
        decision: string;
    }>;
    createAgent(config: AIAgentConfig): AIAgent;
    removeAgent(agentId: AgentId): void;
    getAgent(agentId: AgentId): AIAgent | undefined;
    update(deltaTime: number): void;
    private updateAgentPerception;
    private updateBehaviorTree;
    private updateGOAP;
    private updateUtility;
    private updateHybrid;
    private updateMovement;
    private distance;
    private subtract;
    private normalize;
    getStatistics(): AIStatistics;
}
export interface AIStatistics {
    totalAgents: number;
    aliveAgents: number;
    agentsByType: {
        behavior_tree: number;
        goap: number;
        utility: number;
        hybrid: number;
    };
}
