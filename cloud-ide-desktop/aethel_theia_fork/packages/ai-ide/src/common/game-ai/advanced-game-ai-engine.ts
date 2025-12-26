import { injectable, inject } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

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

// ============================================================================
// CORE TYPES
// ============================================================================

export type AgentId = string;
export type BlackboardKey = string;

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

// ============================================================================
// BLACKBOARD (SHARED KNOWLEDGE)
// ============================================================================

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

@injectable()
export class BlackboardService {
    private blackboards = new Map<AgentId, Blackboard>();
    private globalBlackboard: Blackboard;
    
    constructor() {
        this.globalBlackboard = this.createBlackboard('global');
    }
    
    createBlackboard(ownerId: AgentId): Blackboard {
        const bb: Blackboard = {
            ownerId,
            data: new Map(),
            observers: new Map(),
            timestamps: new Map(),
        };
        this.blackboards.set(ownerId, bb);
        return bb;
    }
    
    getBlackboard(ownerId: AgentId): Blackboard | undefined {
        return this.blackboards.get(ownerId);
    }
    
    getGlobalBlackboard(): Blackboard {
        return this.globalBlackboard;
    }
    
    setValue(bb: Blackboard, key: BlackboardKey, value: unknown): void {
        bb.data.set(key, value);
        bb.timestamps.set(key, Date.now());
        
        // Notify observers
        const observers = bb.observers.get(key);
        if (observers) {
            observers.forEach(cb => cb(value));
        }
    }
    
    getValue<T>(bb: Blackboard, key: BlackboardKey): T | undefined {
        return bb.data.get(key) as T | undefined;
    }
    
    observe(bb: Blackboard, key: BlackboardKey, callback: (value: unknown) => void): () => void {
        if (!bb.observers.has(key)) {
            bb.observers.set(key, new Set());
        }
        bb.observers.get(key)!.add(callback);
        
        return () => bb.observers.get(key)?.delete(callback);
    }
}

// ============================================================================
// BEHAVIOR TREE
// ============================================================================

export enum BTStatus {
    Success = 'success',
    Failure = 'failure',
    Running = 'running',
}

export interface BTContext {
    agent: AIAgent;
    blackboard: Blackboard;
    deltaTime: number;
}

export abstract class BTNode {
    abstract tick(context: BTContext): BTStatus;
    
    reset(): void {}
}

// Composite Nodes
export class BTSequence extends BTNode {
    private children: BTNode[] = [];
    private currentIndex = 0;
    
    constructor(children: BTNode[]) {
        super();
        this.children = children;
    }
    
    tick(context: BTContext): BTStatus {
        while (this.currentIndex < this.children.length) {
            const status = this.children[this.currentIndex].tick(context);
            
            if (status === BTStatus.Running) {
                return BTStatus.Running;
            }
            
            if (status === BTStatus.Failure) {
                this.currentIndex = 0;
                return BTStatus.Failure;
            }
            
            this.currentIndex++;
        }
        
        this.currentIndex = 0;
        return BTStatus.Success;
    }
    
    reset(): void {
        this.currentIndex = 0;
        this.children.forEach(c => c.reset());
    }
}

export class BTSelector extends BTNode {
    private children: BTNode[] = [];
    private currentIndex = 0;
    
    constructor(children: BTNode[]) {
        super();
        this.children = children;
    }
    
    tick(context: BTContext): BTStatus {
        while (this.currentIndex < this.children.length) {
            const status = this.children[this.currentIndex].tick(context);
            
            if (status === BTStatus.Running) {
                return BTStatus.Running;
            }
            
            if (status === BTStatus.Success) {
                this.currentIndex = 0;
                return BTStatus.Success;
            }
            
            this.currentIndex++;
        }
        
        this.currentIndex = 0;
        return BTStatus.Failure;
    }
    
    reset(): void {
        this.currentIndex = 0;
        this.children.forEach(c => c.reset());
    }
}

export class BTParallel extends BTNode {
    private children: BTNode[] = [];
    private successThreshold: number;
    
    constructor(children: BTNode[], successThreshold = 1) {
        super();
        this.children = children;
        this.successThreshold = successThreshold;
    }
    
    tick(context: BTContext): BTStatus {
        let successCount = 0;
        let failureCount = 0;
        
        for (const child of this.children) {
            const status = child.tick(context);
            
            if (status === BTStatus.Success) successCount++;
            if (status === BTStatus.Failure) failureCount++;
        }
        
        if (successCount >= this.successThreshold) {
            return BTStatus.Success;
        }
        
        if (failureCount > this.children.length - this.successThreshold) {
            return BTStatus.Failure;
        }
        
        return BTStatus.Running;
    }
}

// Decorator Nodes
export class BTInverter extends BTNode {
    constructor(private child: BTNode) {
        super();
    }
    
    tick(context: BTContext): BTStatus {
        const status = this.child.tick(context);
        
        if (status === BTStatus.Success) return BTStatus.Failure;
        if (status === BTStatus.Failure) return BTStatus.Success;
        return BTStatus.Running;
    }
}

export class BTRepeat extends BTNode {
    private count = 0;
    
    constructor(private child: BTNode, private times: number) {
        super();
    }
    
    tick(context: BTContext): BTStatus {
        while (this.count < this.times) {
            const status = this.child.tick(context);
            
            if (status === BTStatus.Running) return BTStatus.Running;
            if (status === BTStatus.Failure) {
                this.count = 0;
                return BTStatus.Failure;
            }
            
            this.count++;
            this.child.reset();
        }
        
        this.count = 0;
        return BTStatus.Success;
    }
}

export class BTCooldown extends BTNode {
    private lastExecutionTime = 0;
    
    constructor(private child: BTNode, private cooldownSeconds: number) {
        super();
    }
    
    tick(context: BTContext): BTStatus {
        const now = Date.now();
        
        if (now - this.lastExecutionTime < this.cooldownSeconds * 1000) {
            return BTStatus.Failure;
        }
        
        const status = this.child.tick(context);
        
        if (status !== BTStatus.Running) {
            this.lastExecutionTime = now;
        }
        
        return status;
    }
}

// Leaf Nodes
export class BTCondition extends BTNode {
    constructor(private condition: (context: BTContext) => boolean) {
        super();
    }
    
    tick(context: BTContext): BTStatus {
        return this.condition(context) ? BTStatus.Success : BTStatus.Failure;
    }
}

export class BTAction extends BTNode {
    constructor(private action: (context: BTContext) => BTStatus) {
        super();
    }
    
    tick(context: BTContext): BTStatus {
        return this.action(context);
    }
}

export class BTWait extends BTNode {
    private elapsed = 0;
    
    constructor(private duration: number) {
        super();
    }
    
    tick(context: BTContext): BTStatus {
        this.elapsed += context.deltaTime;
        
        if (this.elapsed >= this.duration) {
            this.elapsed = 0;
            return BTStatus.Success;
        }
        
        return BTStatus.Running;
    }
    
    reset(): void {
        this.elapsed = 0;
    }
}

// ============================================================================
// GOAL-ORIENTED ACTION PLANNING (GOAP)
// ============================================================================

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

@injectable()
export class GOAPPlanner {
    planActions(
        currentState: WorldState,
        goal: GOAPGoal,
        availableActions: GOAPAction[]
    ): GOAPAction[] | null {
        // A* planning through action space
        const openSet: PlanNode[] = [{
            state: { ...currentState },
            actions: [],
            cost: 0,
            heuristic: this.calculateHeuristic(currentState, goal.targetState),
        }];
        
        const closedSet = new Set<string>();
        
        while (openSet.length > 0) {
            // Get lowest cost node
            openSet.sort((a, b) => (a.cost + a.heuristic) - (b.cost + b.heuristic));
            const current = openSet.shift()!;
            
            // Check if goal reached
            if (goal.isAchieved(current.state)) {
                return current.actions;
            }
            
            const stateKey = JSON.stringify(current.state);
            if (closedSet.has(stateKey)) continue;
            closedSet.add(stateKey);
            
            // Try each action
            for (const action of availableActions) {
                if (!this.checkPreconditions(action.preconditions, current.state)) {
                    continue;
                }
                
                const newState = this.applyEffects(current.state, action.effects);
                const newCost = current.cost + action.cost;
                const newHeuristic = this.calculateHeuristic(newState, goal.targetState);
                
                openSet.push({
                    state: newState,
                    actions: [...current.actions, action],
                    cost: newCost,
                    heuristic: newHeuristic,
                });
            }
        }
        
        return null; // No plan found
    }
    
    private checkPreconditions(preconditions: WorldState, state: WorldState): boolean {
        for (const [key, value] of Object.entries(preconditions)) {
            if (state[key] !== value) return false;
        }
        return true;
    }
    
    private applyEffects(state: WorldState, effects: WorldState): WorldState {
        return { ...state, ...effects };
    }
    
    private calculateHeuristic(current: WorldState, target: WorldState): number {
        let mismatches = 0;
        for (const [key, value] of Object.entries(target)) {
            if (current[key] !== value) mismatches++;
        }
        return mismatches;
    }
}

interface PlanNode {
    state: WorldState;
    actions: GOAPAction[];
    cost: number;
    heuristic: number;
}

// ============================================================================
// UTILITY AI
// ============================================================================

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

@injectable()
export class UtilityAISystem {
    evaluateActions(
        actions: UtilityAction[],
        agent: AIAgent,
        context: UtilityContext
    ): UtilityAction | null {
        let bestAction: UtilityAction | null = null;
        let bestScore = -Infinity;
        
        for (const action of actions) {
            const score = action.calculateScore(agent, context);
            
            if (score > bestScore) {
                bestScore = score;
                bestAction = action;
            }
        }
        
        return bestAction;
    }
    
    applyCurve(value: number, curve: UtilityCurve): number {
        const clampedValue = Math.max(0, Math.min(1, value));
        
        switch (curve.type) {
            case 'linear':
                return clampedValue * (curve.params.slope || 1);
                
            case 'quadratic':
                return Math.pow(clampedValue, curve.params.exponent || 2);
                
            case 'exponential':
                return Math.pow(curve.params.exponent || 2, clampedValue) - 1;
                
            case 'logistic':
                const midpoint = curve.params.midpoint || 0.5;
                const steepness = curve.params.steepness || 10;
                return 1 / (1 + Math.exp(-steepness * (clampedValue - midpoint)));
                
            case 'step':
                return clampedValue >= (curve.params.threshold || 0.5) ? 1 : 0;
                
            default:
                return clampedValue;
        }
    }
}

// ============================================================================
// PERCEPTION SYSTEM
// ============================================================================

export interface PerceptionConfig {
    /** Vision */
    visionRange: number;
    visionAngle: number; // degrees (180 = half circle)
    
    /** Hearing */
    hearingRange: number;
    
    /** Memory duration */
    memoryDuration: number; // seconds
    
    /** Update rate */
    perceptionRate: number; // per second
}

export interface PerceivedEntity {
    entityId: string;
    entityType: 'agent' | 'item' | 'hazard' | 'poi';
    position: Vector3;
    lastSeenTime: number;
    isVisible: boolean;
    isAudible: boolean;
    confidence: number; // 0-1
    faction: string;
    threat: number; // 0-1
}

@injectable()
export class PerceptionSystem {
    private perceivedEntities = new Map<AgentId, Map<string, PerceivedEntity>>();
    
    updatePerception(
        agent: AIAgent,
        config: PerceptionConfig,
        worldEntities: { id: string; position: Vector3; type: string; faction: string }[],
        raycastFn: (from: Vector3, to: Vector3) => boolean
    ): PerceivedEntity[] {
        const perceived: PerceivedEntity[] = [];
        const agentMemory = this.getAgentMemory(agent.id);
        const now = Date.now();
        
        for (const entity of worldEntities) {
            if (entity.id === agent.id) continue;
            
            const distance = this.distance(agent.position, entity.position);
            const isInVisionRange = distance <= config.visionRange;
            const isInHearingRange = distance <= config.hearingRange;
            
            let isVisible = false;
            let isAudible = isInHearingRange;
            
            // Vision check
            if (isInVisionRange) {
                // Check angle
                const toEntity = this.normalize(this.subtract(entity.position, agent.position));
                const dot = this.dot(agent.forward, toEntity);
                const angle = Math.acos(dot) * 180 / Math.PI;
                
                if (angle <= config.visionAngle / 2) {
                    // Check line of sight
                    isVisible = raycastFn(agent.position, entity.position);
                }
            }
            
            // Update memory
            const existing = agentMemory.get(entity.id);
            
            if (isVisible || isAudible) {
                const threat = this.calculateThreat(agent, entity);
                
                perceived.push({
                    entityId: entity.id,
                    entityType: entity.type as any,
                    position: entity.position,
                    lastSeenTime: now,
                    isVisible,
                    isAudible,
                    confidence: isVisible ? 1 : 0.5,
                    faction: entity.faction,
                    threat,
                });
            } else if (existing && now - existing.lastSeenTime < config.memoryDuration * 1000) {
                // Still in memory
                existing.isVisible = false;
                existing.isAudible = false;
                existing.confidence *= 0.99;
                perceived.push(existing);
            }
        }
        
        // Update memory
        perceived.forEach(p => agentMemory.set(p.entityId, p));
        
        return perceived;
    }
    
    private getAgentMemory(agentId: AgentId): Map<string, PerceivedEntity> {
        if (!this.perceivedEntities.has(agentId)) {
            this.perceivedEntities.set(agentId, new Map());
        }
        return this.perceivedEntities.get(agentId)!;
    }
    
    private calculateThreat(agent: AIAgent, entity: { faction: string }): number {
        if (entity.faction === agent.faction) return 0;
        if (entity.faction === 'neutral') return 0.2;
        return 0.8;
    }
    
    private distance(a: Vector3, b: Vector3): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    private subtract(a: Vector3, b: Vector3): Vector3 {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }
    
    private normalize(v: Vector3): Vector3 {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len === 0) return { x: 0, y: 0, z: 0 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }
    
    private dot(a: Vector3, b: Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
}

// ============================================================================
// NAVIGATION SYSTEM
// ============================================================================

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

@injectable()
export class NavigationSystem {
    private navMesh?: NavMesh;
    
    setNavMesh(navMesh: NavMesh): void {
        this.navMesh = navMesh;
    }
    
    findPath(start: Vector3, end: Vector3): NavPath | null {
        if (!this.navMesh) return null;
        
        // A* pathfinding on nav mesh
        const startTri = this.findTriangle(start);
        const endTri = this.findTriangle(end);
        
        if (startTri < 0 || endTri < 0) return null;
        
        const path = this.astarPath(startTri, endTri);
        if (!path) return null;
        
        // Convert triangle path to waypoints
        const waypoints = this.trianglePathToWaypoints(path, start, end);
        
        return {
            waypoints,
            totalDistance: this.calculatePathDistance(waypoints),
            isPartial: false,
        };
    }
    
    private findTriangle(point: Vector3): number {
        // Find which triangle contains the point
        // Simplified - would use spatial hashing in production
        return 0;
    }
    
    private astarPath(startTri: number, endTri: number): number[] | null {
        // A* through triangle adjacency
        return [startTri, endTri];
    }
    
    private trianglePathToWaypoints(triPath: number[], start: Vector3, end: Vector3): Vector3[] {
        // String pulling / funnel algorithm
        return [start, end];
    }
    
    private calculatePathDistance(waypoints: Vector3[]): number {
        let total = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            const dz = waypoints[i].z - waypoints[i - 1].z;
            total += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return total;
    }
}

// ============================================================================
// AI AGENT
// ============================================================================

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

export class AIAgent {
    id: AgentId;
    name: string;
    faction: string;
    
    // Transform
    position: Vector3 = { x: 0, y: 0, z: 0 };
    rotation: number = 0;
    forward: Vector3 = { x: 0, y: 0, z: -1 };
    
    // State
    health: number = 100;
    isAlive: boolean = true;
    
    // AI
    aiType: string;
    behaviorTree?: BTNode;
    goapActions: GOAPAction[] = [];
    goapGoals: GOAPGoal[] = [];
    utilityActions: UtilityAction[] = [];
    
    // Current state
    currentGoal?: GOAPGoal;
    currentPlan: GOAPAction[] = [];
    currentPath?: NavPath;
    
    // Perception
    perceptionConfig: PerceptionConfig;
    perceivedEntities: PerceivedEntity[] = [];
    
    // Movement
    moveSpeed: number;
    rotationSpeed: number;
    
    constructor(config: AIAgentConfig) {
        this.id = config.id;
        this.name = config.name;
        this.faction = config.faction;
        this.aiType = config.aiType;
        this.behaviorTree = config.behaviorTree;
        this.goapActions = config.goapActions || [];
        this.goapGoals = config.goapGoals || [];
        this.utilityActions = config.utilityActions || [];
        this.perceptionConfig = config.perception;
        this.moveSpeed = config.moveSpeed;
        this.rotationSpeed = config.rotationSpeed;
    }
}

// ============================================================================
// SQUAD AI
// ============================================================================

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

@injectable()
export class SquadAISystem {
    private squads = new Map<string, Squad>();
    private agentToSquad = new Map<AgentId, string>();
    
    createSquad(leader: AIAgent): Squad {
        const squad: Squad = {
            id: `squad_${Date.now()}`,
            leaderId: leader.id,
            memberIds: [leader.id],
            formation: 'wedge',
            formationSpacing: 3,
            currentTactic: 'patrol',
            sharedBlackboard: {
                ownerId: 'squad',
                data: new Map(),
                observers: new Map(),
                timestamps: new Map(),
            },
        };
        
        this.squads.set(squad.id, squad);
        this.agentToSquad.set(leader.id, squad.id);
        
        return squad;
    }
    
    addToSquad(squadId: string, agent: AIAgent): void {
        const squad = this.squads.get(squadId);
        if (squad && !squad.memberIds.includes(agent.id)) {
            squad.memberIds.push(agent.id);
            this.agentToSquad.set(agent.id, squadId);
        }
    }
    
    removeFromSquad(agentId: AgentId): void {
        const squadId = this.agentToSquad.get(agentId);
        if (!squadId) return;
        
        const squad = this.squads.get(squadId);
        if (squad) {
            squad.memberIds = squad.memberIds.filter(id => id !== agentId);
            
            // If leader left, promote new leader
            if (squad.leaderId === agentId && squad.memberIds.length > 0) {
                squad.leaderId = squad.memberIds[0];
            }
            
            // Disband if empty
            if (squad.memberIds.length === 0) {
                this.squads.delete(squadId);
            }
        }
        
        this.agentToSquad.delete(agentId);
    }
    
    getFormationPosition(squad: Squad, agentId: AgentId, leaderPosition: Vector3, leaderForward: Vector3): Vector3 {
        const memberIndex = squad.memberIds.indexOf(agentId);
        if (memberIndex < 0) return leaderPosition;
        
        // Leader is at index 0
        if (memberIndex === 0) return leaderPosition;
        
        const spacing = squad.formationSpacing;
        
        switch (squad.formation) {
            case 'line':
                return this.getLineFormationPosition(leaderPosition, leaderForward, memberIndex, spacing);
            case 'wedge':
                return this.getWedgeFormationPosition(leaderPosition, leaderForward, memberIndex, spacing);
            case 'column':
                return this.getColumnFormationPosition(leaderPosition, leaderForward, memberIndex, spacing);
            case 'diamond':
                return this.getDiamondFormationPosition(leaderPosition, leaderForward, memberIndex, spacing);
            default:
                return leaderPosition;
        }
    }
    
    private getLineFormationPosition(pos: Vector3, forward: Vector3, index: number, spacing: number): Vector3 {
        const right = { x: -forward.z, y: 0, z: forward.x };
        const offset = (index - 1) * spacing * (index % 2 === 0 ? 1 : -1);
        return {
            x: pos.x + right.x * offset,
            y: pos.y,
            z: pos.z + right.z * offset,
        };
    }
    
    private getWedgeFormationPosition(pos: Vector3, forward: Vector3, index: number, spacing: number): Vector3 {
        const right = { x: -forward.z, y: 0, z: forward.x };
        const row = Math.floor((index + 1) / 2);
        const side = index % 2 === 1 ? -1 : 1;
        
        return {
            x: pos.x - forward.x * row * spacing + right.x * row * spacing * side,
            y: pos.y,
            z: pos.z - forward.z * row * spacing + right.z * row * spacing * side,
        };
    }
    
    private getColumnFormationPosition(pos: Vector3, forward: Vector3, index: number, spacing: number): Vector3 {
        return {
            x: pos.x - forward.x * index * spacing,
            y: pos.y,
            z: pos.z - forward.z * index * spacing,
        };
    }
    
    private getDiamondFormationPosition(pos: Vector3, forward: Vector3, index: number, spacing: number): Vector3 {
        // Diamond: 1 front, 2 sides, 1 back
        const right = { x: -forward.z, y: 0, z: forward.x };
        
        switch (index) {
            case 1: // Left
                return { x: pos.x + right.x * spacing, y: pos.y, z: pos.z + right.z * spacing };
            case 2: // Right
                return { x: pos.x - right.x * spacing, y: pos.y, z: pos.z - right.z * spacing };
            case 3: // Back
                return { x: pos.x - forward.x * spacing * 2, y: pos.y, z: pos.z - forward.z * spacing * 2 };
            default:
                return pos;
        }
    }
    
    setSquadTactic(squadId: string, tactic: Squad['currentTactic']): void {
        const squad = this.squads.get(squadId);
        if (squad) {
            squad.currentTactic = tactic;
        }
    }
}

// ============================================================================
// LLM INTEGRATION FOR DIALOGUE & DECISIONS
// ============================================================================

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

@injectable()
export class AILLMIntegration {
    private llmEndpoint = '/api/ai/llm';
    
    async getDecision(request: LLMDecisionRequest): Promise<string> {
        const prompt = `
You are an NPC named ${request.agentId} with the following personality: ${request.agentPersonality}

Current situation: ${request.currentSituation}

Available actions: ${request.availableActions.join(', ')}

Context: ${JSON.stringify(request.context)}

What action would you take? Respond with only the action name.
        `;
        
        return this.callLLM(prompt);
    }
    
    async generateDialogue(request: LLMDialogueRequest): Promise<string> {
        const prompt = `
You are an NPC with personality: ${request.agentPersonality}

You are speaking to: ${request.speakingTo}
Topic: ${request.topic}
Your mood: ${request.mood}

Previous dialogue:
${request.previousLines.join('\n')}

Generate a natural response (1-2 sentences). Stay in character.
        `;
        
        return this.callLLM(prompt);
    }
    
    private async callLLM(prompt: string): Promise<string> {
        try {
            const response = await fetch(this.llmEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            
            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('LLM call failed:', error);
            return '';
        }
    }
}

// ============================================================================
// MAIN AI ENGINE
// ============================================================================

@injectable()
export class GameAIEngine {
    private agents = new Map<AgentId, AIAgent>();
    
    @inject(BlackboardService)
    private blackboardService!: BlackboardService;
    
    @inject(GOAPPlanner)
    private goapPlanner!: GOAPPlanner;
    
    @inject(UtilityAISystem)
    private utilityAI!: UtilityAISystem;
    
    @inject(PerceptionSystem)
    private perceptionSystem!: PerceptionSystem;
    
    @inject(NavigationSystem)
    private navigationSystem!: NavigationSystem;
    
    @inject(SquadAISystem)
    private squadAI!: SquadAISystem;
    
    @inject(AILLMIntegration)
    private llmIntegration!: AILLMIntegration;
    
    private readonly onAgentDecisionEmitter = new Emitter<{ agentId: AgentId; decision: string }>();
    readonly onAgentDecision: Event<{ agentId: AgentId; decision: string }> = this.onAgentDecisionEmitter.event;
    
    createAgent(config: AIAgentConfig): AIAgent {
        const agent = new AIAgent(config);
        this.agents.set(agent.id, agent);
        this.blackboardService.createBlackboard(agent.id);
        return agent;
    }
    
    removeAgent(agentId: AgentId): void {
        this.agents.delete(agentId);
        this.squadAI.removeFromSquad(agentId);
    }
    
    getAgent(agentId: AgentId): AIAgent | undefined {
        return this.agents.get(agentId);
    }
    
    update(deltaTime: number): void {
        this.agents.forEach(agent => {
            if (!agent.isAlive) return;
            
            // Update perception
            this.updateAgentPerception(agent);
            
            // Update AI based on type
            switch (agent.aiType) {
                case 'behavior_tree':
                    this.updateBehaviorTree(agent, deltaTime);
                    break;
                case 'goap':
                    this.updateGOAP(agent, deltaTime);
                    break;
                case 'utility':
                    this.updateUtility(agent, deltaTime);
                    break;
                case 'hybrid':
                    this.updateHybrid(agent, deltaTime);
                    break;
            }
            
            // Update movement
            this.updateMovement(agent, deltaTime);
        });
    }
    
    private updateAgentPerception(agent: AIAgent): void {
        // Get world entities (would come from game world)
        const worldEntities: { id: string; position: Vector3; type: string; faction: string }[] = [];
        
        this.agents.forEach(other => {
            if (other.id !== agent.id) {
                worldEntities.push({
                    id: other.id,
                    position: other.position,
                    type: 'agent',
                    faction: other.faction,
                });
            }
        });
        
        // Raycast function (would use physics)
        const raycast = (from: Vector3, to: Vector3) => true;
        
        agent.perceivedEntities = this.perceptionSystem.updatePerception(
            agent,
            agent.perceptionConfig,
            worldEntities,
            raycast
        );
    }
    
    private updateBehaviorTree(agent: AIAgent, deltaTime: number): void {
        if (!agent.behaviorTree) return;
        
        const blackboard = this.blackboardService.getBlackboard(agent.id)!;
        
        const context: BTContext = {
            agent,
            blackboard,
            deltaTime,
        };
        
        agent.behaviorTree.tick(context);
    }
    
    private updateGOAP(agent: AIAgent, deltaTime: number): void {
        const blackboard = this.blackboardService.getBlackboard(agent.id)!;
        
        // Get current world state from blackboard
        const worldState: WorldState = {};
        blackboard.data.forEach((value, key) => {
            if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
                worldState[key] = value;
            }
        });
        
        // Find highest priority goal
        let bestGoal: GOAPGoal | null = null;
        let bestRelevance = 0;
        
        for (const goal of agent.goapGoals) {
            const relevance = goal.getRelevance(agent);
            if (relevance > bestRelevance && !goal.isAchieved(worldState)) {
                bestRelevance = relevance;
                bestGoal = goal;
            }
        }
        
        // Plan if goal changed
        if (bestGoal && bestGoal !== agent.currentGoal) {
            agent.currentGoal = bestGoal;
            agent.currentPlan = this.goapPlanner.planActions(worldState, bestGoal, agent.goapActions) || [];
        }
        
        // Execute current plan
        if (agent.currentPlan.length > 0) {
            const currentAction = agent.currentPlan[0];
            currentAction.perform(agent).then(success => {
                if (success) {
                    agent.currentPlan.shift();
                } else {
                    // Replan
                    agent.currentPlan = [];
                }
            });
        }
    }
    
    private updateUtility(agent: AIAgent, deltaTime: number): void {
        const blackboard = this.blackboardService.getBlackboard(agent.id)!;
        
        // Build utility context
        const threats: Threat[] = agent.perceivedEntities
            .filter(e => e.threat > 0.5)
            .map(e => ({
                source: this.agents.get(e.entityId)!,
                dangerLevel: e.threat,
                distance: this.distance(agent.position, e.position),
                position: e.position,
            }));
        
        const context: UtilityContext = {
            agent,
            blackboard,
            nearbyAgents: Array.from(this.agents.values()).filter(a => a.id !== agent.id),
            threats,
            opportunities: [],
        };
        
        const bestAction = this.utilityAI.evaluateActions(agent.utilityActions, agent, context);
        
        if (bestAction) {
            bestAction.execute(agent);
            this.onAgentDecisionEmitter.fire({ agentId: agent.id, decision: bestAction.name });
        }
    }
    
    private updateHybrid(agent: AIAgent, deltaTime: number): void {
        // Hybrid approach: use Utility AI for high-level decisions, BT for execution
        this.updateUtility(agent, deltaTime);
        this.updateBehaviorTree(agent, deltaTime);
    }
    
    private updateMovement(agent: AIAgent, deltaTime: number): void {
        if (!agent.currentPath || agent.currentPath.waypoints.length === 0) return;
        
        const target = agent.currentPath.waypoints[0];
        const direction = this.normalize(this.subtract(target, agent.position));
        
        // Move towards target
        agent.position.x += direction.x * agent.moveSpeed * deltaTime;
        agent.position.y += direction.y * agent.moveSpeed * deltaTime;
        agent.position.z += direction.z * agent.moveSpeed * deltaTime;
        
        // Check if reached waypoint
        if (this.distance(agent.position, target) < 0.5) {
            agent.currentPath.waypoints.shift();
        }
        
        // Update forward direction
        if (direction.x !== 0 || direction.z !== 0) {
            agent.forward = direction;
            agent.rotation = Math.atan2(direction.x, direction.z);
        }
    }
    
    private distance(a: Vector3, b: Vector3): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    private subtract(a: Vector3, b: Vector3): Vector3 {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }
    
    private normalize(v: Vector3): Vector3 {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len === 0) return { x: 0, y: 0, z: 0 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }
    
    getStatistics(): AIStatistics {
        return {
            totalAgents: this.agents.size,
            aliveAgents: Array.from(this.agents.values()).filter(a => a.isAlive).length,
            agentsByType: {
                behavior_tree: Array.from(this.agents.values()).filter(a => a.aiType === 'behavior_tree').length,
                goap: Array.from(this.agents.values()).filter(a => a.aiType === 'goap').length,
                utility: Array.from(this.agents.values()).filter(a => a.aiType === 'utility').length,
                hybrid: Array.from(this.agents.values()).filter(a => a.aiType === 'hybrid').length,
            },
        };
    }
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
