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
exports.PerceptionSystem = exports.NavMeshSystem = exports.BehaviorTreeEngine = exports.Blackboard = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
/**
 * Behavior tree blackboard for data sharing
 */
class Blackboard {
    constructor() {
        this.data = new Map();
        this.observers = new Map();
    }
    get(key) {
        return this.data.get(key);
    }
    set(key, value) {
        this.data.set(key, value);
        const observers = this.observers.get(key);
        if (observers) {
            for (const observer of observers) {
                observer(value);
            }
        }
    }
    has(key) {
        return this.data.has(key);
    }
    delete(key) {
        return this.data.delete(key);
    }
    clear() {
        this.data.clear();
    }
    observe(key, callback) {
        if (!this.observers.has(key)) {
            this.observers.set(key, new Set());
        }
        this.observers.get(key).add(callback);
        return () => {
            this.observers.get(key)?.delete(callback);
        };
    }
}
exports.Blackboard = Blackboard;
/**
 * Behavior Tree Engine
 */
let BehaviorTreeEngine = class BehaviorTreeEngine {
    constructor() {
        this.trees = new Map();
        this.runningNodes = new Map();
        this.actionHandlers = new Map();
        this.conditionHandlers = new Map();
        this.onNodeExecutedEmitter = new common_1.Emitter();
        this.onTreeCompletedEmitter = new common_1.Emitter();
        this.onNodeExecuted = this.onNodeExecutedEmitter.event;
        this.onTreeCompleted = this.onTreeCompletedEmitter.event;
        this.registerBuiltinActions();
        this.registerBuiltinConditions();
    }
    // ========================================================================
    // TREE MANAGEMENT
    // ========================================================================
    /**
     * Register a behavior tree
     */
    registerTree(id, root) {
        this.trees.set(id, root);
    }
    /**
     * Get a behavior tree by ID
     */
    getTree(id) {
        return this.trees.get(id);
    }
    /**
     * Remove a behavior tree
     */
    removeTree(id) {
        this.trees.delete(id);
        this.runningNodes.delete(id);
    }
    /**
     * Register an action handler
     */
    registerAction(type, handler) {
        this.actionHandlers.set(type, handler);
    }
    /**
     * Register a condition handler
     */
    registerCondition(type, handler) {
        this.conditionHandlers.set(type, handler);
    }
    // ========================================================================
    // EXECUTION
    // ========================================================================
    /**
     * Execute a behavior tree tick
     */
    async tick(treeId, context) {
        const tree = this.trees.get(treeId);
        if (!tree) {
            return 'failure';
        }
        // Initialize running nodes tracking for this tree
        if (!this.runningNodes.has(treeId)) {
            this.runningNodes.set(treeId, new Map());
        }
        const status = await this.executeNode(treeId, tree, context);
        this.onTreeCompletedEmitter.fire({ treeId, status });
        return status;
    }
    /**
     * Execute a single node
     */
    async executeNode(treeId, node, context) {
        // Apply decorators
        let status = await this.executeNodeCore(treeId, node, context);
        if (node.decorators) {
            for (const decorator of node.decorators) {
                status = this.applyDecorator(decorator, status);
            }
        }
        this.onNodeExecutedEmitter.fire({ treeId, nodeId: node.id, status });
        return status;
    }
    /**
     * Execute node without decorators
     */
    async executeNodeCore(treeId, node, context) {
        switch (node.type) {
            case 'root':
            case 'sequence':
                return this.executeSequence(treeId, node, context);
            case 'selector':
                return this.executeSelector(treeId, node, context);
            case 'parallel':
                return this.executeParallel(treeId, node, context);
            case 'action':
                return this.executeAction(node, context);
            case 'condition':
                return this.executeCondition(node, context);
            default:
                return 'failure';
        }
    }
    /**
     * Execute sequence node (AND logic)
     */
    async executeSequence(treeId, node, context) {
        for (const child of node.children) {
            const status = await this.executeNode(treeId, child, context);
            if (status !== 'success') {
                return status;
            }
        }
        return 'success';
    }
    /**
     * Execute selector node (OR logic)
     */
    async executeSelector(treeId, node, context) {
        for (const child of node.children) {
            const status = await this.executeNode(treeId, child, context);
            if (status !== 'failure') {
                return status;
            }
        }
        return 'failure';
    }
    /**
     * Execute parallel node
     */
    async executeParallel(treeId, node, context) {
        const results = await Promise.all(node.children.map(child => this.executeNode(treeId, child, context)));
        const successCount = results.filter(r => r === 'success').length;
        const failureCount = results.filter(r => r === 'failure').length;
        const runningCount = results.filter(r => r === 'running').length;
        // Check success policy
        if (node.successPolicy === 'require-all' && successCount === node.children.length) {
            return 'success';
        }
        if (node.successPolicy === 'require-one' && successCount >= 1) {
            return 'success';
        }
        // Check failure policy
        if (node.failurePolicy === 'require-all' && failureCount === node.children.length) {
            return 'failure';
        }
        if (node.failurePolicy === 'require-one' && failureCount >= 1) {
            return 'failure';
        }
        // If any are running, we're still running
        if (runningCount > 0) {
            return 'running';
        }
        return 'failure';
    }
    /**
     * Execute action node
     */
    async executeAction(node, context) {
        const handler = this.actionHandlers.get(node.actionType);
        if (!handler) {
            console.warn(`Unknown action type: ${node.actionType}`);
            return 'failure';
        }
        return handler(context, node.parameters);
    }
    /**
     * Execute condition node
     */
    executeCondition(node, context) {
        const handler = this.conditionHandlers.get(node.conditionType);
        if (!handler) {
            console.warn(`Unknown condition type: ${node.conditionType}`);
            return 'failure';
        }
        let result = handler(context, node.parameters);
        if (node.negate) {
            result = !result;
        }
        return result ? 'success' : 'failure';
    }
    /**
     * Apply decorator to status
     */
    applyDecorator(decorator, status) {
        switch (decorator.type) {
            case 'inverter':
                if (status === 'success')
                    return 'failure';
                if (status === 'failure')
                    return 'success';
                return status;
            case 'force-success':
                return status === 'running' ? 'running' : 'success';
            case 'force-failure':
                return status === 'running' ? 'running' : 'failure';
            default:
                return status;
        }
    }
    // ========================================================================
    // BUILT-IN HANDLERS
    // ========================================================================
    registerBuiltinActions() {
        // Wait action
        this.registerAction('wait', async (ctx, params) => {
            const duration = params.duration || 1;
            const key = `wait_${ctx.entityId}`;
            let elapsed = ctx.blackboard.get(key) || 0;
            elapsed += ctx.deltaTime;
            if (elapsed >= duration) {
                ctx.blackboard.delete(key);
                return 'success';
            }
            ctx.blackboard.set(key, elapsed);
            return 'running';
        });
        // Move to action
        this.registerAction('move-to', async (ctx, params) => {
            const target = params.target;
            const speed = params.speed || 5;
            const path = ctx.services.navigation.findPath(ctx.entityId, target);
            if (!path || path.length === 0) {
                return 'failure';
            }
            const arrived = ctx.services.navigation.moveAlongPath(ctx.entityId, path, speed, ctx.deltaTime);
            return arrived ? 'success' : 'running';
        });
        // Play animation action
        this.registerAction('play-animation', (ctx, params) => {
            const animName = params.animation;
            ctx.services.animation.play(ctx.entityId, animName);
            return 'success';
        });
        // Set blackboard value
        this.registerAction('set-value', (ctx, params) => {
            const key = params.key;
            const value = params.value;
            ctx.blackboard.set(key, value);
            return 'success';
        });
        // Log action (for debugging)
        this.registerAction('log', (ctx, params) => {
            console.log(`[BT] ${ctx.entityId}: ${params.message}`);
            return 'success';
        });
    }
    registerBuiltinConditions() {
        // Check blackboard value
        this.registerCondition('has-value', (ctx, params) => {
            const key = params.key;
            return ctx.blackboard.has(key);
        });
        // Compare blackboard values
        this.registerCondition('compare', (ctx, params) => {
            const key = params.key;
            const value = params.value;
            const operator = params.operator || '==';
            const actual = ctx.blackboard.get(key);
            switch (operator) {
                case '==': return actual === value;
                case '!=': return actual !== value;
                case '>': return actual > value;
                case '<': return actual < value;
                case '>=': return actual >= value;
                case '<=': return actual <= value;
                default: return false;
            }
        });
        // Can see target
        this.registerCondition('can-see', (ctx, params) => {
            const targetId = params.targetId;
            return ctx.services.perception.canSee(ctx.entityId, targetId);
        });
        // Is in range
        this.registerCondition('in-range', (ctx, params) => {
            const targetId = params.targetId;
            const range = params.range;
            return ctx.services.perception.isInRange(ctx.entityId, targetId, range);
        });
        // Path exists
        this.registerCondition('path-exists', (ctx, params) => {
            const target = params.target;
            const path = ctx.services.navigation.findPath(ctx.entityId, target);
            return path !== null && path.length > 0;
        });
    }
    // ========================================================================
    // TREE BUILDING HELPERS
    // ========================================================================
    static sequence(name, ...children) {
        return {
            id: generateId(),
            type: 'sequence',
            name,
            children,
        };
    }
    static selector(name, ...children) {
        return {
            id: generateId(),
            type: 'selector',
            name,
            children,
        };
    }
    static action(name, actionType, parameters = {}) {
        return {
            id: generateId(),
            type: 'action',
            name,
            actionType,
            parameters,
            children: [],
        };
    }
    static condition(name, conditionType, parameters = {}, negate = false) {
        return {
            id: generateId(),
            type: 'condition',
            name,
            conditionType,
            parameters,
            negate,
            children: [],
        };
    }
};
exports.BehaviorTreeEngine = BehaviorTreeEngine;
exports.BehaviorTreeEngine = BehaviorTreeEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], BehaviorTreeEngine);
/**
 * Navigation Mesh System
 */
let NavMeshSystem = class NavMeshSystem {
    constructor() {
        this.navMeshes = new Map();
        this.activeNavMesh = null;
        this.entityPositions = new Map();
        this.onPathFoundEmitter = new common_1.Emitter();
        this.onPathFailedEmitter = new common_1.Emitter();
        this.onPathFound = this.onPathFoundEmitter.event;
        this.onPathFailed = this.onPathFailedEmitter.event;
    }
    // ========================================================================
    // NAVMESH MANAGEMENT
    // ========================================================================
    /**
     * Load a navigation mesh
     */
    loadNavMesh(data) {
        this.navMeshes.set(data.id, data);
        if (!this.activeNavMesh) {
            this.activeNavMesh = data;
        }
    }
    /**
     * Set active navigation mesh
     */
    setActiveNavMesh(id) {
        const navMesh = this.navMeshes.get(id);
        if (navMesh) {
            this.activeNavMesh = navMesh;
        }
    }
    /**
     * Generate NavMesh from geometry (simplified)
     */
    generateFromGeometry(vertices, indices, options = {}) {
        // Simplified navmesh generation
        // In production, use a proper navmesh generation library like recast-navigation
        const cellSize = options.cellSize || 0.3;
        const _agentRadius = options.agentRadius || 0.6;
        // Calculate bounding box
        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const v of vertices) {
            min.x = Math.min(min.x, v.x);
            min.y = Math.min(min.y, v.y);
            min.z = Math.min(min.z, v.z);
            max.x = Math.max(max.x, v.x);
            max.y = Math.max(max.y, v.y);
            max.z = Math.max(max.z, v.z);
        }
        // Generate polygons from triangles
        const polygons = [];
        for (let i = 0; i < indices.length; i += 3) {
            const v0 = vertices[indices[i]];
            const v1 = vertices[indices[i + 1]];
            const v2 = vertices[indices[i + 2]];
            const center = {
                x: (v0.x + v1.x + v2.x) / 3,
                y: (v0.y + v1.y + v2.y) / 3,
                z: (v0.z + v1.z + v2.z) / 3,
            };
            const area = this.calculateTriangleArea(v0, v1, v2);
            polygons.push({
                id: polygons.length,
                vertices: [v0, v1, v2],
                center,
                neighbors: [],
                area,
                cost: 1,
            });
        }
        // Find neighbors (polygons that share an edge)
        for (let i = 0; i < polygons.length; i++) {
            for (let j = i + 1; j < polygons.length; j++) {
                if (this.polygonsShareEdge(polygons[i], polygons[j])) {
                    polygons[i].neighbors.push(j);
                    polygons[j].neighbors.push(i);
                }
            }
        }
        const navMesh = {
            id: generateId(),
            polygons,
            vertices,
            boundingBox: { min, max },
        };
        this.loadNavMesh(navMesh);
        return navMesh;
    }
    // ========================================================================
    // PATHFINDING
    // ========================================================================
    /**
     * Find path using A* algorithm
     */
    findPath(entityId, target) {
        if (!this.activeNavMesh) {
            this.onPathFailedEmitter.fire({ entityId, reason: 'No active navmesh' });
            return null;
        }
        const startPos = this.entityPositions.get(entityId);
        if (!startPos) {
            this.onPathFailedEmitter.fire({ entityId, reason: 'Entity position unknown' });
            return null;
        }
        // Find start and end polygons
        const startPoly = this.findContainingPolygon(startPos);
        const endPoly = this.findContainingPolygon(target);
        if (!startPoly || !endPoly) {
            this.onPathFailedEmitter.fire({ entityId, reason: 'Start or end not on navmesh' });
            return null;
        }
        // A* pathfinding
        const path = this.aStarPath(startPoly.id, endPoly.id, startPos, target);
        if (path) {
            this.onPathFoundEmitter.fire({ entityId, path });
        }
        else {
            this.onPathFailedEmitter.fire({ entityId, reason: 'No path found' });
        }
        return path;
    }
    /**
     * A* pathfinding implementation
     */
    aStarPath(startId, endId, startPos, endPos) {
        if (!this.activeNavMesh)
            return null;
        const openSet = new Set([startId]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        gScore.set(startId, 0);
        fScore.set(startId, this.heuristic(startId, endId));
        while (openSet.size > 0) {
            // Find node with lowest fScore
            let current = -1;
            let lowestF = Infinity;
            for (const node of openSet) {
                const f = fScore.get(node) ?? Infinity;
                if (f < lowestF) {
                    lowestF = f;
                    current = node;
                }
            }
            if (current === endId) {
                return this.reconstructPath(cameFrom, current, startPos, endPos);
            }
            openSet.delete(current);
            const currentPoly = this.activeNavMesh.polygons[current];
            for (const neighborId of currentPoly.neighbors) {
                const neighbor = this.activeNavMesh.polygons[neighborId];
                const tentativeG = (gScore.get(current) ?? Infinity) +
                    this.distance(currentPoly.center, neighbor.center) * neighbor.cost;
                if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
                    cameFrom.set(neighborId, current);
                    gScore.set(neighborId, tentativeG);
                    fScore.set(neighborId, tentativeG + this.heuristic(neighborId, endId));
                    openSet.add(neighborId);
                }
            }
        }
        return null;
    }
    /**
     * Heuristic function (straight-line distance)
     */
    heuristic(fromId, toId) {
        if (!this.activeNavMesh)
            return Infinity;
        const from = this.activeNavMesh.polygons[fromId];
        const to = this.activeNavMesh.polygons[toId];
        return this.distance(from.center, to.center);
    }
    /**
     * Reconstruct path from A* result
     */
    reconstructPath(cameFrom, current, startPos, endPos) {
        const path = [];
        // Add destination
        path.unshift({
            position: endPos,
            polygonId: current,
            type: 'destination',
        });
        while (cameFrom.has(current)) {
            const prev = cameFrom.get(current);
            const poly = this.activeNavMesh.polygons[current];
            // Add portal point between polygons
            path.unshift({
                position: poly.center,
                polygonId: current,
                type: 'portal',
            });
            current = prev;
        }
        // Add start
        path.unshift({
            position: startPos,
            polygonId: current,
            type: 'waypoint',
        });
        return this.smoothPath(path);
    }
    /**
     * Smooth path using string pulling (funnel algorithm)
     */
    smoothPath(path) {
        if (path.length <= 2)
            return path;
        // Simplified path smoothing
        const smoothed = [path[0]];
        let current = 0;
        while (current < path.length - 1) {
            // Try to skip waypoints if direct line is clear
            let furthest = current + 1;
            for (let i = current + 2; i < path.length; i++) {
                if (this.hasDirectPath(path[current].position, path[i].position)) {
                    furthest = i;
                }
            }
            smoothed.push(path[furthest]);
            current = furthest;
        }
        return smoothed;
    }
    /**
     * Check if there's a direct path between two points
     */
    hasDirectPath(start, end) {
        const result = this.raycast(start, end);
        return !result.hit;
    }
    // ========================================================================
    // MOVEMENT
    // ========================================================================
    /**
     * Move entity along path
     */
    moveAlongPath(entityId, path, speed, deltaTime) {
        const currentPos = this.entityPositions.get(entityId);
        if (!currentPos || path.length === 0)
            return true;
        const target = path[0].position;
        const direction = this.normalize(this.subtract(target, currentPos));
        const distance = this.distance(currentPos, target);
        const moveDistance = speed * deltaTime;
        if (moveDistance >= distance) {
            // Reached waypoint
            this.entityPositions.set(entityId, target);
            path.shift();
            return path.length === 0;
        }
        // Move towards waypoint
        const newPos = {
            x: currentPos.x + direction.x * moveDistance,
            y: currentPos.y + direction.y * moveDistance,
            z: currentPos.z + direction.z * moveDistance,
        };
        this.entityPositions.set(entityId, newPos);
        return false;
    }
    /**
     * Set entity position
     */
    setEntityPosition(entityId, position) {
        this.entityPositions.set(entityId, position);
    }
    // ========================================================================
    // QUERIES
    // ========================================================================
    /**
     * Get closest point on navmesh
     */
    getClosestPointOnNavMesh(point) {
        if (!this.activeNavMesh)
            return null;
        let closestPoint = null;
        let closestDist = Infinity;
        for (const poly of this.activeNavMesh.polygons) {
            const projected = this.projectPointOnPolygon(point, poly);
            const dist = this.distance(point, projected);
            if (dist < closestDist) {
                closestDist = dist;
                closestPoint = projected;
            }
        }
        return closestPoint;
    }
    /**
     * Check if point is on navmesh
     */
    isPointOnNavMesh(point) {
        return this.findContainingPolygon(point) !== null;
    }
    /**
     * Raycast on navmesh
     */
    raycast(start, end) {
        if (!this.activeNavMesh)
            return { hit: false };
        // Simplified raycast - check if line crosses any polygon boundary
        const startPoly = this.findContainingPolygon(start);
        const endPoly = this.findContainingPolygon(end);
        if (!startPoly || startPoly === endPoly) {
            return { hit: false };
        }
        // Find intersection point with polygon edges
        // This is a simplified implementation
        return { hit: true, point: this.lerp(start, end, 0.5) };
    }
    /**
     * Find polygon containing point
     */
    findContainingPolygon(point) {
        if (!this.activeNavMesh)
            return null;
        for (const poly of this.activeNavMesh.polygons) {
            if (this.pointInPolygon(point, poly)) {
                return poly;
            }
        }
        return null;
    }
    /**
     * Check if point is inside polygon (2D projection)
     */
    pointInPolygon(point, poly) {
        const verts = poly.vertices;
        let inside = false;
        for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            const xi = verts[i].x, zi = verts[i].z;
            const xj = verts[j].x, zj = verts[j].z;
            if (((zi > point.z) !== (zj > point.z)) &&
                (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
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
    lerp(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
        };
    }
    calculateTriangleArea(a, b, c) {
        const ab = this.subtract(b, a);
        const ac = this.subtract(c, a);
        const cross = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x,
        };
        return 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    }
    polygonsShareEdge(a, b) {
        let sharedCount = 0;
        const threshold = 0.001;
        for (const va of a.vertices) {
            for (const vb of b.vertices) {
                if (this.distance(va, vb) < threshold) {
                    sharedCount++;
                    if (sharedCount >= 2)
                        return true;
                }
            }
        }
        return false;
    }
    projectPointOnPolygon(point, poly) {
        // Project point to polygon plane and clamp to polygon bounds
        // Simplified: return polygon center
        return poly.center;
    }
};
exports.NavMeshSystem = NavMeshSystem;
exports.NavMeshSystem = NavMeshSystem = __decorate([
    (0, inversify_1.injectable)()
], NavMeshSystem);
/**
 * Perception System
 */
let PerceptionSystem = class PerceptionSystem {
    constructor() {
        this.entities = new Map();
        this.stimuli = [];
        this.teamRelationships = new Map();
        /**
         * Physics provider for line-of-sight raycasting
         * Set this to enable occlusion-based visibility checks
         */
        this.physicsProvider = null;
        this.onEntityPerceivedEmitter = new common_1.Emitter();
        this.onEntityLostEmitter = new common_1.Emitter();
        this.onStimulusReceivedEmitter = new common_1.Emitter();
        this.onEntityPerceived = this.onEntityPerceivedEmitter.event;
        this.onEntityLost = this.onEntityLostEmitter.event;
        this.onStimulusReceived = this.onStimulusReceivedEmitter.event;
    }
    // ========================================================================
    // PHYSICS INTEGRATION
    // ========================================================================
    /**
     * Set physics provider for line-of-sight raycasting
     */
    setPhysicsProvider(provider) {
        this.physicsProvider = provider;
    }
    /**
     * Remove physics provider
     */
    clearPhysicsProvider() {
        this.physicsProvider = null;
    }
    // ========================================================================
    // ENTITY MANAGEMENT
    // ========================================================================
    /**
     * Register entity for perception
     */
    registerEntity(entityId, config = {}, teamId = 0) {
        const defaultConfig = {
            sightRange: 20,
            sightAngle: 120,
            hearingRange: 15,
            memoryDuration: 10000,
            updateInterval: 100,
        };
        this.entities.set(entityId, {
            position: { x: 0, y: 0, z: 0 },
            forward: { x: 0, y: 0, z: 1 },
            config: { ...defaultConfig, ...config },
            perceived: new Map(),
            teamId,
        });
    }
    /**
     * Update entity transform
     */
    updateEntityTransform(entityId, position, forward) {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.position = position;
            entity.forward = forward;
        }
    }
    /**
     * Remove entity from perception
     */
    removeEntity(entityId) {
        this.entities.delete(entityId);
        // Remove from other entities' perception
        for (const entity of this.entities.values()) {
            entity.perceived.delete(entityId);
        }
    }
    // ========================================================================
    // PERCEPTION UPDATE
    // ========================================================================
    /**
     * Update perception for all entities
     */
    update(deltaTime) {
        const now = Date.now();
        // Clean up expired stimuli
        this.cleanupStimuli(now);
        // Update perception for each entity
        for (const [entityId, entity] of this.entities) {
            this.updateEntityPerception(entityId, entity, now);
        }
    }
    /**
     * Update perception for a single entity
     */
    updateEntityPerception(entityId, entity, now) {
        if (!entity)
            return;
        // Check sight for all other entities
        for (const [targetId, target] of this.entities) {
            if (targetId === entityId)
                continue;
            const wasPerceived = entity.perceived.has(targetId);
            const canSeeNow = this.canSeeEntity(entity, target);
            const canHearNow = this.canHearEntity(entity, target);
            if (canSeeNow || canHearNow) {
                const perceived = entity.perceived.get(targetId) || {
                    entityId: targetId,
                    lastSeenPosition: target.position,
                    lastSeenTime: 0,
                    threat: 0,
                    relationship: this.getRelationship(entity.teamId, target.teamId),
                };
                if (canSeeNow) {
                    perceived.lastSeenPosition = { ...target.position };
                    perceived.lastSeenTime = now;
                }
                if (canHearNow) {
                    perceived.lastHeardPosition = { ...target.position };
                    perceived.lastHeardTime = now;
                }
                entity.perceived.set(targetId, perceived);
                if (!wasPerceived) {
                    this.onEntityPerceivedEmitter.fire({ perceiverI: entityId, targetId });
                }
            }
            else if (wasPerceived) {
                const perceived = entity.perceived.get(targetId);
                // Check if memory has expired
                const timeSinceSeen = now - perceived.lastSeenTime;
                const timeSinceHeard = perceived.lastHeardTime ? now - perceived.lastHeardTime : Infinity;
                if (timeSinceSeen > entity.config.memoryDuration &&
                    timeSinceHeard > entity.config.memoryDuration) {
                    entity.perceived.delete(targetId);
                    this.onEntityLostEmitter.fire({ perceiverId: entityId, targetId });
                }
            }
        }
        // Process stimuli
        for (const stimulus of this.stimuli) {
            if (this.canReceiveStimulus(entity, stimulus)) {
                this.onStimulusReceivedEmitter.fire({ entityId, stimulus });
                // Update perceived entity if stimulus has source
                if (stimulus.sourceId && this.entities.has(stimulus.sourceId)) {
                    const perceived = entity.perceived.get(stimulus.sourceId) || {
                        entityId: stimulus.sourceId,
                        lastSeenPosition: stimulus.position,
                        lastSeenTime: 0,
                        threat: 0,
                        relationship: 'unknown',
                    };
                    if (stimulus.type === 'hearing') {
                        perceived.lastHeardPosition = stimulus.position;
                        perceived.lastHeardTime = now;
                    }
                    else if (stimulus.type === 'damage') {
                        perceived.threat += stimulus.strength;
                    }
                    entity.perceived.set(stimulus.sourceId, perceived);
                }
            }
        }
    }
    /**
     * Check if entity can see target
     */
    canSeeEntity(perceiver, target) {
        const distance = this.distance(perceiver.position, target.position);
        // Range check
        if (distance > perceiver.config.sightRange)
            return false;
        // Angle check
        const toTarget = this.normalize(this.subtract(target.position, perceiver.position));
        const dot = this.dot(perceiver.forward, toTarget);
        const angle = Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI);
        if (angle > perceiver.config.sightAngle / 2)
            return false;
        // Line of sight check using physics raycasting
        if (this.physicsProvider) {
            const rayResult = this.physicsProvider.raycast(perceiver.position, toTarget, distance);
            // If we hit something, check if it's the target or an obstacle
            if (rayResult && rayResult.hit) {
                // If the hit distance is significantly less than the distance to target,
                // there's an obstacle blocking the view
                if (rayResult.distance !== undefined && rayResult.distance < distance * 0.95) {
                    return false; // Obstacle blocks view
                }
            }
        }
        return true;
    }
    /**
     * Check if entity can hear target
     */
    canHearEntity(perceiver, target) {
        const distance = this.distance(perceiver.position, target.position);
        return distance <= perceiver.config.hearingRange;
    }
    /**
     * Check if entity can receive stimulus
     */
    canReceiveStimulus(entity, stimulus) {
        const distance = this.distance(entity.position, stimulus.position);
        return distance <= stimulus.radius;
    }
    // ========================================================================
    // STIMULUS MANAGEMENT
    // ========================================================================
    /**
     * Create a new stimulus
     */
    createStimulus(stimulus) {
        const id = generateId();
        this.stimuli.push({ ...stimulus, id });
        return id;
    }
    /**
     * Remove a stimulus
     */
    removeStimulus(id) {
        const index = this.stimuli.findIndex(s => s.id === id);
        if (index !== -1) {
            this.stimuli.splice(index, 1);
        }
    }
    /**
     * Clean up expired stimuli
     */
    cleanupStimuli(now) {
        for (let i = this.stimuli.length - 1; i >= 0; i--) {
            if (this.stimuli[i].expiresAt <= now) {
                this.stimuli.splice(i, 1);
            }
        }
    }
    // ========================================================================
    // QUERIES
    // ========================================================================
    /**
     * Check if perceiver can see target
     */
    canSee(perceiverId, targetId) {
        const perceiver = this.entities.get(perceiverId);
        const target = this.entities.get(targetId);
        if (!perceiver || !target)
            return false;
        return this.canSeeEntity(perceiver, target);
    }
    /**
     * Check if target is in range
     */
    isInRange(perceiverId, targetId, range) {
        const perceiver = this.entities.get(perceiverId);
        const target = this.entities.get(targetId);
        if (!perceiver || !target)
            return false;
        return this.distance(perceiver.position, target.position) <= range;
    }
    /**
     * Get perceived entities for an entity
     */
    getPerceivedEntities(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity)
            return [];
        return Array.from(entity.perceived.values());
    }
    /**
     * Get hostile perceived entities
     */
    getHostileEntities(entityId) {
        return this.getPerceivedEntities(entityId).filter(e => e.relationship === 'hostile');
    }
    /**
     * Get nearest perceived entity
     */
    getNearestPerceived(entityId, filter) {
        const perceiver = this.entities.get(entityId);
        if (!perceiver)
            return null;
        let nearest = null;
        let nearestDist = Infinity;
        for (const perceived of perceiver.perceived.values()) {
            if (filter && !filter(perceived))
                continue;
            const dist = this.distance(perceiver.position, perceived.lastSeenPosition);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = perceived;
            }
        }
        return nearest;
    }
    // ========================================================================
    // TEAM MANAGEMENT
    // ========================================================================
    /**
     * Set relationship between teams
     */
    setTeamRelationship(team1, team2, relationship) {
        const key = `${Math.min(team1, team2)}_${Math.max(team1, team2)}`;
        this.teamRelationships.set(key, relationship);
    }
    /**
     * Get relationship between teams
     */
    getRelationship(team1, team2) {
        if (team1 === team2)
            return 'friendly';
        const key = `${Math.min(team1, team2)}_${Math.max(team1, team2)}`;
        return this.teamRelationships.get(key) || 'unknown';
    }
    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
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
// ============================================================================
// UTILITY
// ============================================================================
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
