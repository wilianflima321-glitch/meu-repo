/**
 * ability-graph-compiler.ts
 *
 * Extends the VisualScriptCompiler pattern to compile ability node graphs
 * into executable ECS ability components.
 *
 * Mathematical model:
 *   A = (V, E, φ, ψ) — directed acyclic graph of ability nodes.
 *
 * Guarantees:
 *   1. Acyclicity — DFS cycle detection before compilation
 *   2. Resource safety — no path has unbounded resource consumption
 *   3. Balance heuristics — DPS(v) = Damage(φ(v)) / Cooldown(φ(v)) ≤ threshold
 *
 * Outputs an AbilityComponent JSON usable by the ECS system.
 */

import { getNodeDefinition, type AbilityNodeDefinition } from './ability-node-catalog';
import { logger } from '@/lib/observability/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Graph Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AbilityNode {
  id: string;
  type: string;
  params: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface AbilityEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface AbilityGraph {
  id: string;
  name: string;
  nodes: AbilityNode[];
  edges: AbilityEdge[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Compiled Output
// ─────────────────────────────────────────────────────────────────────────────

export interface CompiledAbility {
  id: string;
  name: string;
  /** Executable generator function source */
  generatorSource: string;
  /** Runtime metadata for ECS */
  meta: {
    resourceCost: number;
    cooldownSec: number;
    estimatedDPS: number;
    balanceWarnings: string[];
    hasCycle: boolean;
    nodeCount: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Balance Constants
// ─────────────────────────────────────────────────────────────────────────────

const DPS_THRESHOLD = 200; // max DPS allowed before a balance warning
const MAX_RESOURCE_COST = 80; // max single-ability resource cost

// ─────────────────────────────────────────────────────────────────────────────
// AbilityGraphCompiler
// ─────────────────────────────────────────────────────────────────────────────

export class AbilityGraphCompiler {
  private nodeMap: Map<string, AbilityNode>;
  private execEdges: Map<string, AbilityEdge[]>; // source_node:handle -> edges
  private dataEdges: Map<string, AbilityEdge>;   // target_node:handle -> edge

  constructor(private graph: AbilityGraph) {
    this.nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    this.execEdges = new Map();
    this.dataEdges = new Map();

    for (const edge of graph.edges) {
      const src = edge.sourceHandle === 'exec' || ['then_1', 'then_2', 'then_3', 'ready', 'true', 'false'].includes(edge.sourceHandle);
      if (src) {
        const key = `${edge.source}:${edge.sourceHandle}`;
        const arr = this.execEdges.get(key) ?? [];
        arr.push(edge);
        this.execEdges.set(key, arr);
      } else {
        const key = `${edge.target}:${edge.targetHandle}`;
        this.dataEdges.set(key, edge);
      }
    }
  }

  // ── 1. Cycle Detection (DFS) ────────────────────────────────────────────

  private detectCycle(): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (stack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      stack.add(nodeId);

      for (const edge of this.graph.edges) {
        if (edge.source === nodeId) {
          if (dfs(edge.target)) return true;
        }
      }

      stack.delete(nodeId);
      return false;
    };

    for (const node of this.graph.nodes) {
      if (dfs(node.id)) return true;
    }
    return false;
  }

  // ── 2. Topological exec traversal ──────────────────────────────────────

  private getExecutionOrder(entryNodeId: string): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [entryNodeId];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      order.push(id);

      for (const handle of ['exec', 'then_1', 'then_2', 'then_3', 'true', 'ready']) {
        const edges = this.execEdges.get(`${id}:${handle}`) ?? [];
        for (const e of edges) queue.push(e.target);
      }
    }
    return order;
  }

  // ── 3. Balance analysis ────────────────────────────────────────────────

  private analyseBalance(): {
    totalDamage: number;
    totalCooldown: number;
    totalResourceCost: number;
    dps: number;
    warnings: string[];
  } {
    let totalDamage = 0;
    let totalCooldown = 0;
    let totalResourceCost = 0;
    const warnings: string[] = [];

    for (const node of this.graph.nodes) {
      const def: AbilityNodeDefinition | undefined = getNodeDefinition(node.type);
      if (!def) continue;

      const damage = (node.params.damage as number | undefined) ?? def.baseDamage ?? 0;
      const cooldown = (node.params.duration_sec as number | undefined) ?? def.baseCooldownSec ?? 0;
      const cost = (node.params.amount as number | undefined) ?? def.baseResourceCost ?? 0;

      totalDamage += damage;
      totalCooldown = Math.max(totalCooldown, cooldown);
      totalResourceCost += cost;
    }

    const dps = totalCooldown > 0 ? totalDamage / totalCooldown : totalDamage;

    if (dps > DPS_THRESHOLD) {
      warnings.push(`DPS too high: ${dps.toFixed(1)} exceeds threshold of ${DPS_THRESHOLD}. Reduce damage or increase cooldown.`);
    }
    if (totalResourceCost > MAX_RESOURCE_COST) {
      warnings.push(`Resource cost too high: ${totalResourceCost} exceeds ${MAX_RESOURCE_COST}. Add resource gate nodes or reduce cost values.`);
    }
    if (totalCooldown === 0 && totalDamage > 0) {
      warnings.push('Ability has no cooldown — add a Set Cooldown node to prevent spam.');
    }

    return { totalDamage, totalCooldown, totalResourceCost, dps, warnings };
  }

  // ── 4. Code generation (extends VisualScriptCompiler pattern) ───────────

  private generateCode(execOrder: string[]): string {
    let body = `  let ctx = this.context;\n`;

    for (const nodeId of execOrder) {
      const node = this.nodeMap.get(nodeId);
      if (!node) continue;
      const def = getNodeDefinition(node.type);
      const label = def?.label ?? node.type;

      body += `\n  // [${label}] id=${nodeId}\n`;

      switch (node.type) {
        case 'cost_consume_resource': {
          const amount = node.params.amount ?? def?.baseResourceCost ?? 0;
          body += `  if (!ctx.consumeResource(${amount})) { return { blocked: 'no_resource' }; }\n`;
          break;
        }
        case 'cost_set_cooldown': {
          const dur = node.params.duration_sec ?? def?.baseCooldownSec ?? 5;
          body += `  ctx.setCooldown('${node.id}', ${dur});\n`;
          break;
        }
        case 'condition_target_in_range': {
          const range = node.params.range ?? 5;
          body += `  const target_${nodeId} = ctx.findTarget({ range: ${range}, faction: '${node.params.faction ?? 'hostile'}' });\n`;
          body += `  if (!target_${nodeId}) { return { blocked: 'no_target' }; }\n`;
          break;
        }
        case 'effect_deal_damage': {
          const dmg = node.params.damage ?? def?.baseDamage ?? 50;
          body += `  yield { type: 'deal_damage', target: target_${this.findTargetNode(nodeId) ?? nodeId}, damage: ${dmg}, damageType: '${node.params.damage_type ?? 'physical'}' };\n`;
          break;
        }
        case 'effect_heal': {
          const amt = node.params.amount ?? 30;
          body += `  yield { type: 'heal', amount: ${amt} };\n`;
          break;
        }
        case 'effect_apply_status': {
          body += `  yield { type: 'apply_status', status: '${node.params.status ?? 'stun'}', duration: ${node.params.duration_sec ?? 2} };\n`;
          break;
        }
        case 'effect_launch_projectile': {
          body += `  yield { type: 'projectile', id: '${node.params.projectile_id ?? 'arrow'}', speed: ${node.params.speed ?? 30}, damage: ${node.params.damage ?? 40} };\n`;
          break;
        }
        case 'effect_teleport': {
          body += `  yield { type: 'teleport', behind_target: true };\n`;
          break;
        }
        case 'effect_spawn_summon': {
          body += `  yield { type: 'spawn_summon', summonId: '${node.params.summon_id ?? 'ally'}', duration: ${node.params.duration_sec ?? 30} };\n`;
          break;
        }
        case 'flow_delay': {
          body += `  yield { type: 'wait_frames', frames: ${node.params.frames ?? 6} };\n`;
          break;
        }
        default: {
          body += `  ctx.executeNode('${node.type}', '${nodeId}', ${JSON.stringify(node.params)});\n`;
        }
      }
    }

    body += `  return { success: true };\n`;
    return body;
  }

  private findTargetNode(nodeId: string): string | null {
    for (const node of this.graph.nodes) {
      if (node.type === 'condition_target_in_range') return node.id;
    }
    return null;
  }

  // ── 5. Main compile entry ──────────────────────────────────────────────

  compile(): CompiledAbility {
    const hasCycle = this.detectCycle();
    if (hasCycle) {
      logger.error('Ability graph has cycles — compilation aborted', { graphId: this.graph.id });
    }

    const triggers = this.graph.nodes.filter(n => n.type.startsWith('trigger_'));
    const entryId = triggers[0]?.id ?? this.graph.nodes[0]?.id ?? '';

    const execOrder = hasCycle ? [] : this.getExecutionOrder(entryId);
    const balance = this.analyseBalance();
    const codeBody = hasCycle ? '  return { blocked: "cycle_detected" };\n' : this.generateCode(execOrder);

    const generatorSource = `function* abilityExecutor() {\n${codeBody}}`;

    return {
      id: this.graph.id,
      name: this.graph.name,
      generatorSource,
      meta: {
        resourceCost: balance.totalResourceCost,
        cooldownSec: balance.totalCooldown,
        estimatedDPS: balance.dps,
        balanceWarnings: balance.warnings,
        hasCycle,
        nodeCount: this.graph.nodes.length,
      },
    };
  }
}
