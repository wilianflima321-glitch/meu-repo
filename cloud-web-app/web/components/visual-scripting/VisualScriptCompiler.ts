import type { VisualScript, VisualNodeType } from './VisualScriptEditor';
import type { Edge } from '@xyflow/react';
import { logger } from '@/lib/observability/logger';

export class VisualScriptCompiler {
  private script: VisualScript;
  private nodeMap: Map<string, VisualNodeType>;
  private edgesBySource: Map<string, Edge[]>;
  private edgesByTarget: Map<string, Edge[]>;

  constructor(script: VisualScript) {
    this.script = script;
    this.nodeMap = new Map(script.nodes.map(n => [n.id, n]));
    this.edgesBySource = new Map();
    this.edgesByTarget = new Map();

    script.edges.forEach(edge => {
      const sourceKey = `${edge.source}:${edge.sourceHandle}`;
      const sourceEdges = this.edgesBySource.get(sourceKey) || [];
      sourceEdges.push(edge);
      this.edgesBySource.set(sourceKey, sourceEdges);

      const targetKey = `${edge.target}:${edge.targetHandle}`;
      const targetEdges = this.edgesByTarget.get(targetKey) || [];
      targetEdges.push(edge);
      this.edgesByTarget.set(targetKey, targetEdges);
    });
  }

  /**
   * Compiles the visual script into a Javascript Generator function for $O(N)$ execution.
   */
  public compile(entryEventNodeId: string): GeneratorFunction {
    const executionMap: string[] = [];
    let currentNodeId: string | null = entryEventNodeId;
    const visited = new Set<string>();

    // Topological traverse from Entry Node along 'exec' edges
    while (currentNodeId && !visited.has(currentNodeId)) {
      executionMap.push(currentNodeId);
      visited.add(currentNodeId);

      // Find next execution node connected to 'exec' output
      const sourceKey = `${currentNodeId}:exec`;
      const execEdges = this.edgesBySource.get(sourceKey);
      
      if (execEdges && execEdges.length > 0) {
        currentNodeId = execEdges[0].target;
      } else {
        currentNodeId = null;
      }
    }

    // Now we construct a generator string
    let generatorBody = `
      let ctx = this.context;
      // Pre-evaluate data dependencies
    `;

    for (const nodeId of executionMap) {
      const node = this.nodeMap.get(nodeId)!;
      const type = node.data?.definition?.type;

      // Special handling for Async/Yield Nodes
      if (type === 'action_wait') {
        generatorBody += `
          yield { type: 'wait', duration: 1000 }; // Wait placeholder
        `;
      } else if (type === 'action_print') {
        generatorBody += `
          ctx.log("Executing Print Node " + "${nodeId}");
        `;
      } else {
        // Generic node execution 
        generatorBody += `
          // Node ${type} (${nodeId})
          this.executeCompiledNode("${nodeId}");
        `;
      }
    }

    generatorBody += ` return;`;

    try {
      const AsyncFunction = Object.getPrototypeOf(function*(){}).constructor;
      return new AsyncFunction(generatorBody) as GeneratorFunction;
    } catch (e) {
      logger.error('Failed to compile script', e);
      return function* () {} as GeneratorFunction;
    }
  }
}
