/**
 * Python DAP Adapter — real `/api/dap` session only (P2b BLOCKER 11).
 * No fabricated stack frames / breakpoints / stopped events.
 */

import {
  DAPAdapterBase,
  DAPAdapterConfig,
  LaunchRequestArguments,
} from '../dap-adapter-base';

export interface PythonLaunchRequestArguments extends LaunchRequestArguments {
  module?: string;
  django?: boolean;
  flask?: boolean;
  pyramid?: boolean;
  jinja?: boolean;
  justMyCode?: boolean;
  redirectOutput?: boolean;
  showReturnValue?: boolean;
  subProcess?: boolean;
  pythonPath?: string;
}

export class PythonDAPAdapter extends DAPAdapterBase {
  constructor(workspaceRoot: string) {
    const config: DAPAdapterConfig = {
      command: 'python',
      args: ['-m', 'debugpy', '--listen', '5678', '--wait-for-client'],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    };

    super(config);
  }

  protected getAdapterID(): string {
    return 'python';
  }

  async launchPython(args: PythonLaunchRequestArguments): Promise<void> {
    await this.launch(args);
  }

  async setExceptionBreakpoints(filters: string[], exceptionOptions?: unknown[]): Promise<void> {
    await this.sendRequest('setExceptionBreakpoints', {
      filters,
      exceptionOptions,
    });
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

  async exceptionInfo(threadId: number): Promise<unknown> {
    if (this.capabilities.supportsExceptionInfoRequest) {
      return await this.sendRequest('exceptionInfo', { threadId });
    }
    return null;
  }
}

export function createPythonDAPAdapter(workspaceRoot: string): PythonDAPAdapter {
  return new PythonDAPAdapter(workspaceRoot);
}
