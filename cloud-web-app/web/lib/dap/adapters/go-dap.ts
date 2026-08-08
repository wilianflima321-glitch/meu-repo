/**
 * Go DAP Adapter — real `/api/dap` session only (P2b BLOCKER 11).
 * No fabricated stack frames / breakpoints / stopped events.
 */

import {
  DAPAdapterBase,
  DAPAdapterConfig,
  LaunchRequestArguments,
} from '../dap-adapter-base';

export interface GoLaunchRequestArguments extends LaunchRequestArguments {
  mode?: 'debug' | 'test' | 'exec';
  remotePath?: string;
  host?: string;
  port?: number;
  showLog?: boolean;
  logOutput?: string;
  buildFlags?: string;
  dlvToolPath?: string;
}

export class GoDAPAdapter extends DAPAdapterBase {
  constructor(workspaceRoot: string) {
    const config: DAPAdapterConfig = {
      command: 'dlv',
      args: ['dap', '--listen=127.0.0.1:0'],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        GOPATH: process.env.GOPATH || `${process.env.HOME}/go`,
      },
    };

    super(config);
  }

  protected getAdapterID(): string {
    return 'go';
  }

  async launchGo(args: GoLaunchRequestArguments): Promise<void> {
    await this.launch(args);
  }

  async setFunctionBreakpoints(breakpoints: Array<{ name: string }>): Promise<unknown[]> {
    if (this.capabilities.supportsFunctionBreakpoints) {
      const result = await this.sendRequest<{ breakpoints?: unknown[] }>('setFunctionBreakpoints', {
        breakpoints,
      });
      return result.breakpoints || [];
    }
    return [];
  }

  async disassemble(memoryReference: string, offset: number, instructionCount: number): Promise<unknown> {
    if (this.capabilities.supportsDisassembleRequest) {
      return await this.sendRequest('disassemble', {
        memoryReference,
        offset,
        instructionCount,
      });
    }
    return null;
  }
}

export function createGoDAPAdapter(workspaceRoot: string): GoDAPAdapter {
  return new GoDAPAdapter(workspaceRoot);
}
