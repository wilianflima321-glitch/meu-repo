import { VisualScriptRuntime } from '@/lib/visual-script/runtime-core/runtime';
import type { VisualScript } from '@/lib/visual-script/runtime-core/types';
import type { LevelObject } from './level-editor-core';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('LevelEditorPlayRuntime');

function extractVisualScript(obj: LevelObject): VisualScript | null {
  const scriptComponent = obj.components.find(
    (component) =>
      component.type === 'VisualScript' ||
      component.type === 'Blueprint' ||
      component.type === 'BlueprintScript',
  );

  if (!scriptComponent) return null;

  const raw = scriptComponent.properties?.script ?? scriptComponent.properties?.graph;
  if (!raw || typeof raw !== 'object') return null;

  const script = raw as VisualScript & { edges?: unknown[] };
  if (!Array.isArray(script.nodes)) return null;
  if (!Array.isArray(script.connections) && !Array.isArray(script.edges)) return null;

  if (!script.connections && script.edges) {
    return {
      ...script,
      connections: script.edges as VisualScript['connections'],
      metadata: script.metadata ?? {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      variables: script.variables ?? [],
    };
  }

  return script;
}

export class LevelEditorPlayRuntime {
  private runtimes = new Map<string, VisualScriptRuntime>();

  start(objects: LevelObject[]): void {
    this.stop();

    for (const obj of objects) {
      const script = extractVisualScript(obj);
      if (!script) continue;

      try {
        const runtime = new VisualScriptRuntime();
        runtime.load(script);
        runtime.start();
        this.runtimes.set(obj.id, runtime);
        log.info('visual_script.started', { objectId: obj.id, nodeCount: script.nodes.length });
      } catch (error) {
        log.error('visual_script.start_failed', { objectId: obj.id, error });
      }
    }
  }

  stop(): void {
    for (const runtime of this.runtimes.values()) {
      runtime.destroy();
    }
    this.runtimes.clear();
  }

  get activeCount(): number {
    return this.runtimes.size;
  }
}
