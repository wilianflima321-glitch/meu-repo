import { SceneNode } from '@aethel/engine/scene-graph-node';
import { SceneManager } from '@aethel/engine/scene-graph-manager';

export enum ProxyCommandType {
  SET_POSITION = 'SET_POSITION',
  SET_ROTATION = 'SET_ROTATION',
  SET_SCALE = 'SET_SCALE',
  DESTROY_NODE = 'DESTROY_NODE',
  SPAWN_NODE = 'SPAWN_NODE',
}

export interface ProxyMessage {
  type: ProxyCommandType;
  nodeId: string;
  payload: any;
}

/**
 * SceneGraphProxy (Main Thread)
 * 
 * Safely receives mutations from the Sandbox WebWorker via MessageChannel or SharedArrayBuffer.
 * Translates raw data into real ThreeJS / SceneGraph commands without exposing the engine instance.
 */
export class SceneGraphProxyServer {
  private manager: SceneManager;

  constructor(manager: SceneManager) {
    this.manager = manager;
  }

  public processMessage(msg: ProxyMessage): void {
    if (!this.manager.activeScene) return;

    const node = this.manager.activeScene.getNodeById(msg.nodeId);

    switch (msg.type) {
      case ProxyCommandType.SET_POSITION:
        if (node) {
          node.transform.position.set(msg.payload.x, msg.payload.y, msg.payload.z);
          node.transform.markDirty();
        }
        break;
      case ProxyCommandType.SET_ROTATION:
        if (node) {
          // Assume payload is a quaternion or euler
          node.transform.rotation.set(msg.payload.x, msg.payload.y, msg.payload.z, msg.payload.w);
          node.transform.markDirty();
        }
        break;
      case ProxyCommandType.SET_SCALE:
        if (node) {
          node.transform.scale.set(msg.payload.x, msg.payload.y, msg.payload.z);
          node.transform.markDirty();
        }
        break;
      case ProxyCommandType.DESTROY_NODE:
        if (node) {
          this.manager.activeScene.removeNode(node);
        }
        break;
      case ProxyCommandType.SPAWN_NODE:
        // payload should have basic node info
        const newNode = new SceneNode();
        newNode.name = msg.payload.name || 'AI Spawned Node';
        this.manager.activeScene.addNode(newNode);
        break;
    }
  }

  /**
   * Bind to a Worker's message event
   */
  public bindWorker(worker: Worker): void {
    worker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'PROXY_MUTATION') {
        const mutations: ProxyMessage[] = event.data.mutations;
        for (const mut of mutations) {
          this.processMessage(mut);
        }
      }
    });
  }
}
