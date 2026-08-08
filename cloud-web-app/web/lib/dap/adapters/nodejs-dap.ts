/**
 * Node.js DAP Adapter — real `/api/dap` session only (P2b BLOCKER 11).
 * No fabricated stack frames / breakpoints / stopped events.
 */

import {
  DAPAdapterBase,
  DAPAdapterConfig,
  LaunchRequestArguments,
} from '../dap-adapter-base';

export interface NodeLaunchRequestArguments extends LaunchRequestArguments {
  runtimeExecutable?: string;
  runtimeArgs?: string[];
  port?: number;
  address?: string;
  timeout?: number;
  sourceMaps?: boolean;
  outFiles?: string[];
  skipFiles?: string[];
  smartStep?: boolean;
  showAsyncStacks?: boolean;
}

export class NodeJSDAPAdapter extends DAPAdapterBase {
  constructor(workspaceRoot: string) {
    const config: DAPAdapterConfig = {
      command: 'node',
      args: ['--inspect-brk'],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    };

    super(config);
  }

  protected getAdapterID(): string {
    return 'node';
  }

  async launchNode(args: NodeLaunchRequestArguments): Promise<void> {
    await this.launch(args);
  }

  async setExceptionBreakpoints(filters: string[]): Promise<void> {
    await this.sendRequest('setExceptionBreakpoints', { filters });
  }

  async restartFrame(frameId: number): Promise<void> {
    if (this.capabilities.supportsRestartFrame) {
      await this.sendRequest('restartFrame', { frameId });
    }
  }

  async setVariable(variablesReference: number, name: string, value: string): Promise<unknown> {
    if (this.capabilities.supportsSetVariable) {
      return await this.sendRequest('setVariable', {
        variablesReference,
        name,
        value,
      });
    }
    return null;
  }

  async completions(text: string, column: number, frameId?: number): Promise<unknown[]> {
    if (this.capabilities.supportsCompletionsRequest) {
      const result = await this.sendRequest<{ targets?: unknown[] }>('completions', {
        text,
        column,
        frameId,
      });
      return result.targets || [];
    }
    return [];
  }
}

export function createNodeJSDAPAdapter(workspaceRoot: string): NodeJSDAPAdapter {
  return new NodeJSDAPAdapter(workspaceRoot);
}
