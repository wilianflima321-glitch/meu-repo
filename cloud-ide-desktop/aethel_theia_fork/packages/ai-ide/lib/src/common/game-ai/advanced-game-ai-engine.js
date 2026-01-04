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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameAIEngine = exports.AILLMIntegration = exports.SquadAISystem = exports.AIAgent = exports.NavigationSystem = exports.PerceptionSystem = exports.UtilityAISystem = exports.GOAPPlanner = exports.BTWait = exports.BTAction = exports.BTCondition = exports.BTCooldown = exports.BTRepeat = exports.BTInverter = exports.BTParallel = exports.BTSelector = exports.BTSequence = exports.BTNode = exports.BTStatus = exports.BlackboardService = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
let BlackboardService = class BlackboardService {
    constructor() {
        this.blackboards = new Map();
        this.globalBlackboard = this.createBlackboard('global');
    }
    createBlackboard(ownerId) {
        const bb = {
            ownerId,
            data: new Map(),
            observers: new Map(),
            timestamps: new Map(),
        };
        this.blackboards.set(ownerId, bb);
        return bb;
    }
    getBlackboard(ownerId) {
        return this.blackboards.get(ownerId);
    }
    getGlobalBlackboard() {
        return this.globalBlackboard;
    }
    setValue(bb, key, value) {
        bb.data.set(key, value);
        bb.timestamps.set(key, Date.now());
        // Notify observers
        const observers = bb.observers.get(key);
        if (observers) {
            observers.forEach(cb => cb(value));
        }
    }
    getValue(bb, key) {
        return bb.data.get(key);
    }
    observe(bb, key, callback) {
        if (!bb.observers.has(key)) {
            bb.observers.set(key, new Set());
        }
        bb.observers.get(key).add(callback);
        return () => bb.observers.get(key)?.delete(callback);
    }
};
exports.BlackboardService = BlackboardService;
exports.BlackboardService = BlackboardService = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], BlackboardService);
// ============================================================================
// BEHAVIOR TREE
// ============================================================================
var BTStatus;
(function (BTStatus) {
    BTStatus["Success"] = "success";
    BTStatus["Failure"] = "failure";
    BTStatus["Running"] = "running";
})(BTStatus || (exports.BTStatus = BTStatus = {}));
class BTNode {
    reset() { }
}
exports.BTNode = BTNode;
// Composite Nodes
class BTSequence extends BTNode {
    constructor(children) {
        super();
        this.children = [];
        this.currentIndex = 0;
        this.children = children;
    }
    tick(context) {
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
    reset() {
        this.currentIndex = 0;
        this.children.forEach(c => c.reset());
    }
}
exports.BTSequence = BTSequence;
class BTSelector extends BTNode {
    constructor(children) {
        super();
        this.children = [];
        this.currentIndex = 0;
        this.children = children;
    }
    tick(context) {
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
    reset() {
        this.currentIndex = 0;
        this.children.forEach(c => c.reset());
    }
}
exports.BTSelector = BTSelector;
class BTParallel extends BTNode {
    constructor(children, successThreshold = 1) {
        super();
        this.children = [];
        this.children = children;
        this.successThreshold = successThreshold;
    }
    tick(context) {
        let successCount = 0;
        let failureCount = 0;
        for (const child of this.children) {
            const status = child.tick(context);
            if (status === BTStatus.Success)
                successCount++;
            if (status === BTStatus.Failure)
                failureCount++;
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
exports.BTParallel = BTParallel;
// Decorator Nodes
class BTInverter extends BTNode {
    constructor(child) {
        super();
        this.child = child;
    }
    tick(context) {
        const status = this.child.tick(context);
        if (status === BTStatus.Success)
            return BTStatus.Failure;
        if (status === BTStatus.Failure)
            return BTStatus.Success;
        return BTStatus.Running;
    }
}
exports.BTInverter = BTInverter;
class BTRepeat extends BTNode {
    constructor(child, times) {
        super();
        this.child = child;
        this.times = times;
        this.count = 0;
    }
    tick(context) {
        while (this.count < this.times) {
            const status = this.child.tick(context);
            if (status === BTStatus.Running)
                return BTStatus.Running;
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
exports.BTRepeat = BTRepeat;
class BTCooldown extends BTNode {
    constructor(child, cooldownSeconds) {
        super();
        this.child = child;
        this.cooldownSeconds = cooldownSeconds;
        this.lastExecutionTime = 0;
    }
    tick(context) {
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
exports.BTCooldown = BTCooldown;
// Leaf Nodes
class BTCondition extends BTNode {
    constructor(condition) {
        super();
        this.condition = condition;
    }
    tick(context) {
        return this.condition(context) ? BTStatus.Success : BTStatus.Failure;
    }
}
exports.BTCondition = BTCondition;
class BTAction extends BTNode {
    constructor(action) {
        super();
        this.action = action;
    }
    tick(context) {
        return this.action(context);
    }
}
exports.BTAction = BTAction;
class BTWait extends BTNode {
    constructor(duration) {
        super();
        this.duration = duration;
        this.elapsed = 0;
    }
    tick(context) {
        this.elapsed += context.deltaTime;
        if (this.elapsed >= this.duration) {
            this.elapsed = 0;
            return BTStatus.Success;
        }
        return BTStatus.Running;
    }
    reset() {
        this.elapsed = 0;
    }
}
exports.BTWait = BTWait;
let GOAPPlanner = class GOAPPlanner {
    planActions(currentState, goal, availableActions) {
        // A* planning through action space
        const openSet = [{
                state: { ...currentState },
                actions: [],
                cost: 0,
                heuristic: this.calculateHeuristic(currentState, goal.targetState),
            }];
        const closedSet = new Set();
        while (openSet.length > 0) {
            // Get lowest cost node
            openSet.sort((a, b) => (a.cost + a.heuristic) - (b.cost + b.heuristic));
            const current = openSet.shift();
            // Check if goal reached
            if (goal.isAchieved(current.state)) {
                return current.actions;
            }
            const stateKey = JSON.stringify(current.state);
            if (closedSet.has(stateKey))
                continue;
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
    checkPreconditions(preconditions, state) {
        for (const [key, value] of Object.entries(preconditions)) {
            if (state[key] !== value)
                return false;
        }
        return true;
    }
    applyEffects(state, effects) {
        return { ...state, ...effects };
    }
    calculateHeuristic(current, target) {
        let mismatches = 0;
        for (const [key, value] of Object.entries(target)) {
            if (current[key] !== value)
                mismatches++;
        }
        return mismatches;
    }
};
exports.GOAPPlanner = GOAPPlanner;
exports.GOAPPlanner = GOAPPlanner = __decorate([
    (0, inversify_1.injectable)()
], GOAPPlanner);
let UtilityAISystem = class UtilityAISystem {
    evaluateActions(actions, agent, context) {
        let bestAction = null;
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
    applyCurve(value, curve) {
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
};
exports.UtilityAISystem = UtilityAISystem;
exports.UtilityAISystem = UtilityAISystem = __decorate([
    (0, inversify_1.injectable)()
], UtilityAISystem);
let PerceptionSystem = class PerceptionSystem {
    constructor() {
        this.perceivedEntities = new Map();
    }
    updatePerception(agent, config, worldEntities, raycastFn) {
        const perceived = [];
        const agentMemory = this.getAgentMemory(agent.id);
        const now = Date.now();
        for (const entity of worldEntities) {
            if (entity.id === agent.id)
                continue;
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
                    entityType: entity.type,
                    position: entity.position,
                    lastSeenTime: now,
                    isVisible,
                    isAudible,
                    confidence: isVisible ? 1 : 0.5,
                    faction: entity.faction,
                    threat,
                });
            }
            else if (existing && now - existing.lastSeenTime < config.memoryDuration * 1000) {
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
    getAgentMemory(agentId) {
        if (!this.perceivedEntities.has(agentId)) {
            this.perceivedEntities.set(agentId, new Map());
        }
        return this.perceivedEntities.get(agentId);
    }
    calculateThreat(agent, entity) {
        if (entity.faction === agent.faction)
            return 0;
        if (entity.faction === 'neutral')
            return 0.2;
        return 0.8;
    }
    distance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    subtract(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }
    normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len === 0)
            return { x: 0, y: 0, z: 0 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }
    dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
};
exports.PerceptionSystem = PerceptionSystem;
exports.PerceptionSystem = PerceptionSystem = __decorate([
    (0, inversify_1.injectable)()
], PerceptionSystem);
let NavigationSystem = class NavigationSystem {
    setNavMesh(navMesh) {
        this.navMesh = navMesh;
    }
    findPath(start, end) {
        if (!this.navMesh)
            return null;
        // A* pathfinding on nav mesh
        const startTri = this.findTriangle(start);
        const endTri = this.findTriangle(end);
        if (startTri < 0 || endTri < 0)
            return null;
        const path = this.astarPath(startTri, endTri);
        if (!path)
            return null;
        // Convert triangle path to waypoints
        const waypoints = this.trianglePathToWaypoints(path, start, end);
        return {
            waypoints,
            totalDistance: this.calculatePathDistance(waypoints),
            isPartial: false,
        };
    }
    findTriangle(point) {
        // Find which triangle contains the point
        // Simplified - would use spatial hashing in production
        return 0;
    }
    astarPath(startTri, endTri) {
        // A* through triangle adjacency
        return [startTri, endTri];
    }
    trianglePathToWaypoints(triPath, start, end) {
        // String pulling / funnel algorithm
        return [start, end];
    }
    calculatePathDistance(waypoints) {
        let total = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            const dz = waypoints[i].z - waypoints[i - 1].z;
            total += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return total;
    }
};
exports.NavigationSystem = NavigationSystem;
exports.NavigationSystem = NavigationSystem = __decorate([
    (0, inversify_1.injectable)()
], NavigationSystem);
class AIAgent {
    constructor(config) {
        // Transform
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = 0;
        this.forward = { x: 0, y: 0, z: -1 };
        // State
        this.health = 100;
        this.isAlive = true;
        this.goapActions = [];
        this.goapGoals = [];
        this.utilityActions = [];
        this.currentPlan = [];
        this.perceivedEntities = [];
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
exports.AIAgent = AIAgent;
let SquadAISystem = class SquadAISystem {
    constructor() {
        this.squads = new Map();
        this.agentToSquad = new Map();
    }
    createSquad(leader) {
        const squad = {
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
    addToSquad(squadId, agent) {
        const squad = this.squads.get(squadId);
        if (squad && !squad.memberIds.includes(agent.id)) {
            squad.memberIds.push(agent.id);
            this.agentToSquad.set(agent.id, squadId);
        }
    }
    removeFromSquad(agentId) {
        const squadId = this.agentToSquad.get(agentId);
        if (!squadId)
            return;
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
    getFormationPosition(squad, agentId, leaderPosition, leaderForward) {
        const memberIndex = squad.memberIds.indexOf(agentId);
        if (memberIndex < 0)
            return leaderPosition;
        // Leader is at index 0
        if (memberIndex === 0)
            return leaderPosition;
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
    getLineFormationPosition(pos, forward, index, spacing) {
        const right = { x: -forward.z, y: 0, z: forward.x };
        const offset = (index - 1) * spacing * (index % 2 === 0 ? 1 : -1);
        return {
            x: pos.x + right.x * offset,
            y: pos.y,
            z: pos.z + right.z * offset,
        };
    }
    getWedgeFormationPosition(pos, forward, index, spacing) {
        const right = { x: -forward.z, y: 0, z: forward.x };
        const row = Math.floor((index + 1) / 2);
        const side = index % 2 === 1 ? -1 : 1;
        return {
            x: pos.x - forward.x * row * spacing + right.x * row * spacing * side,
            y: pos.y,
            z: pos.z - forward.z * row * spacing + right.z * row * spacing * side,
        };
    }
    getColumnFormationPosition(pos, forward, index, spacing) {
        return {
            x: pos.x - forward.x * index * spacing,
            y: pos.y,
            z: pos.z - forward.z * index * spacing,
        };
    }
    getDiamondFormationPosition(pos, forward, index, spacing) {
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
    setSquadTactic(squadId, tactic) {
        const squad = this.squads.get(squadId);
        if (squad) {
            squad.currentTactic = tactic;
        }
    }
};
exports.SquadAISystem = SquadAISystem;
exports.SquadAISystem = SquadAISystem = __decorate([
    (0, inversify_1.injectable)()
], SquadAISystem);
let AILLMIntegration = class AILLMIntegration {
    constructor() {
        this.llmEndpoint = '/api/ai/llm';
    }
    async getDecision(request) {
        const prompt = `
You are an NPC named ${request.agentId} with the following personality: ${request.agentPersonality}

Current situation: ${request.currentSituation}

Available actions: ${request.availableActions.join(', ')}

Context: ${JSON.stringify(request.context)}

What action would you take? Respond with only the action name.
        `;
        return this.callLLM(prompt);
    }
    async generateDialogue(request) {
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
    async callLLM(prompt) {
        try {
            const response = await fetch(this.llmEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            const data = await response.json();
            return data.response;
        }
        catch (error) {
            console.error('LLM call failed:', error);
            return '';
        }
    }
};
exports.AILLMIntegration = AILLMIntegration;
exports.AILLMIntegration = AILLMIntegration = __decorate([
    (0, inversify_1.injectable)()
], AILLMIntegration);
// ============================================================================
// MAIN AI ENGINE
// ============================================================================
let GameAIEngine = class GameAIEngine {
    constructor() {
        this.agents = new Map();
        this.onAgentDecisionEmitter = new common_1.Emitter();
        this.onAgentDecision = this.onAgentDecisionEmitter.event;
    }
    createAgent(config) {
        const agent = new AIAgent(config);
        this.agents.set(agent.id, agent);
        this.blackboardService.createBlackboard(agent.id);
        return agent;
    }
    removeAgent(agentId) {
        this.agents.delete(agentId);
        this.squadAI.removeFromSquad(agentId);
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    update(deltaTime) {
        this.agents.forEach(agent => {
            if (!agent.isAlive)
                return;
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
    updateAgentPerception(agent) {
        // Get world entities (would come from game world)
        const worldEntities = [];
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
        const raycast = (from, to) => true;
        agent.perceivedEntities = this.perceptionSystem.updatePerception(agent, agent.perceptionConfig, worldEntities, raycast);
    }
    updateBehaviorTree(agent, deltaTime) {
        if (!agent.behaviorTree)
            return;
        const blackboard = this.blackboardService.getBlackboard(agent.id);
        const context = {
            agent,
            blackboard,
            deltaTime,
        };
        agent.behaviorTree.tick(context);
    }
    updateGOAP(agent, deltaTime) {
        const blackboard = this.blackboardService.getBlackboard(agent.id);
        // Get current world state from blackboard
        const worldState = {};
        blackboard.data.forEach((value, key) => {
            if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
                worldState[key] = value;
            }
        });
        // Find highest priority goal
        let bestGoal = null;
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
                }
                else {
                    // Replan
                    agent.currentPlan = [];
                }
            });
        }
    }
    updateUtility(agent, deltaTime) {
        const blackboard = this.blackboardService.getBlackboard(agent.id);
        // Build utility context
        const threats = agent.perceivedEntities
            .filter(e => e.threat > 0.5)
            .map(e => ({
            source: this.agents.get(e.entityId),
            dangerLevel: e.threat,
            distance: this.distance(agent.position, e.position),
            position: e.position,
        }));
        const context = {
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
    updateHybrid(agent, deltaTime) {
        // Hybrid approach: use Utility AI for high-level decisions, BT for execution
        this.updateUtility(agent, deltaTime);
        this.updateBehaviorTree(agent, deltaTime);
    }
    updateMovement(agent, deltaTime) {
        if (!agent.currentPath || agent.currentPath.waypoints.length === 0)
            return;
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
    distance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    subtract(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }
    normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len === 0)
            return { x: 0, y: 0, z: 0 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }
    getStatistics() {
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
};
exports.GameAIEngine = GameAIEngine;
__decorate([
    (0, inversify_1.inject)(BlackboardService),
    __metadata("design:type", BlackboardService)
], GameAIEngine.prototype, "blackboardService", void 0);
__decorate([
    (0, inversify_1.inject)(GOAPPlanner),
    __metadata("design:type", GOAPPlanner)
], GameAIEngine.prototype, "goapPlanner", void 0);
__decorate([
    (0, inversify_1.inject)(UtilityAISystem),
    __metadata("design:type", UtilityAISystem)
], GameAIEngine.prototype, "utilityAI", void 0);
__decorate([
    (0, inversify_1.inject)(PerceptionSystem),
    __metadata("design:type", PerceptionSystem)
], GameAIEngine.prototype, "perceptionSystem", void 0);
__decorate([
    (0, inversify_1.inject)(NavigationSystem),
    __metadata("design:type", NavigationSystem)
], GameAIEngine.prototype, "navigationSystem", void 0);
__decorate([
    (0, inversify_1.inject)(SquadAISystem),
    __metadata("design:type", SquadAISystem)
], GameAIEngine.prototype, "squadAI", void 0);
__decorate([
    (0, inversify_1.inject)(AILLMIntegration),
    __metadata("design:type", AILLMIntegration)
], GameAIEngine.prototype, "llmIntegration", void 0);
exports.GameAIEngine = GameAIEngine = __decorate([
    (0, inversify_1.injectable)()
], GameAIEngine);
