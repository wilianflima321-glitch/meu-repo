/**
 * Java DAP Adapter — real `/api/dap` session only (P2b BLOCKER 11).
 * No fabricated stack frames / breakpoints / stopped events.
 */

import {
  DAPAdapterBase,
  DAPAdapterConfig,
  LaunchRequestArguments,
} from '../dap-adapter-base';

export interface JavaLaunchRequestArguments extends LaunchRequestArguments {
  mainClass?: string;
  projectName?: string;
  classPaths?: string[];
  modulePaths?: string[];
  vmArgs?: string;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
  shortenCommandLine?: 'none' | 'jarmanifest' | 'argfile' | 'auto';
}

export class JavaDAPAdapter extends DAPAdapterBase {
  constructor(workspaceRoot: string) {
    const config: DAPAdapterConfig = {
      command: 'java',
      args: [
        '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005',
        '-jar',
        'java-debug-server.jar',
      ],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        JAVA_HOME: process.env.JAVA_HOME || '/usr/lib/jvm/default-java',
      },
    };

    super(config);
  }

  protected getAdapterID(): string {
    return 'java';
  }

  async launchJava(args: JavaLaunchRequestArguments): Promise<void> {
    await this.launch(args);
  }

  async setExceptionBreakpoints(filters: string[], exceptionOptions?: unknown[]): Promise<void> {
    await this.sendRequest('setExceptionBreakpoints', {
      filters,
      exceptionOptions,
    });
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

  async exceptionInfo(threadId: number): Promise<unknown> {
    if (this.capabilities.supportsExceptionInfoRequest) {
      return await this.sendRequest('exceptionInfo', { threadId });
    }
    return null;
  }

  async loadedSources(): Promise<unknown[]> {
    if (this.capabilities.supportsLoadedSourcesRequest) {
      const result = await this.sendRequest<{ sources?: unknown[] }>('loadedSources', {});
      return result.sources || [];
    }
    return [];
  }
}

export function createJavaDAPAdapter(workspaceRoot: string): JavaDAPAdapter {
  return new JavaDAPAdapter(workspaceRoot);
}
