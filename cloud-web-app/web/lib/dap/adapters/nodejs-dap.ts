/**
 * Node.js DAP Adapter Implementation
 * Uses vscode-node-debug2 protocol
 */

import { DAPAdapterBase, DAPAdapterConfig, LaunchRequestArguments, Capabilities } from '../dap-adapter-base';

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

  protected getMockResponse(command: string, args: any): any {
    switch (command) {
      case 'initialize':
        return this.getMockInitializeResponse();
      
      case 'launch':
        return {};
      
      case 'attach':
        return {};
      
      case 'setBreakpoints':
        return this.getMockSetBreakpointsResponse(args);
      
      case 'stackTrace':
        return this.getMockStackTraceResponse(args);
      
      case 'scopes':
        return this.getMockScopesResponse(args);
      
      case 'variables':
        return this.getMockVariablesResponse(args);
      
      case 'evaluate':
        return this.getMockEvaluateResponse(args);
      
      case 'threads':
        return this.getMockThreadsResponse();
      
      case 'continue':
      case 'next':
      case 'stepIn':
      case 'stepOut':
      case 'pause':
        return { allThreadsContinued: false };
      
      case 'disconnect':
        return {};
      
      default:
        return {};
    }
  }

  private getMockInitializeResponse(): Capabilities {
    return {
      supportsConfigurationDoneRequest: true,
      supportsFunctionBreakpoints: true,
      supportsConditionalBreakpoints: true,
      supportsHitConditionalBreakpoints: true,
      supportsEvaluateForHovers: true,
      supportsStepBack: false,
      supportsSetVariable: true,
      supportsRestartFrame: true,
      supportsGotoTargetsRequest: false,
      supportsStepInTargetsRequest: true,
      supportsCompletionsRequest: true,
      supportsModulesRequest: false,
      supportsExceptionOptions: true,
      supportsValueFormattingOptions: true,
      supportsExceptionInfoRequest: true,
      supportTerminateDebuggee: true,
      supportsDelayedStackTraceLoading: true,
      supportsLoadedSourcesRequest: true,
      supportsLogPoints: true,
      supportsTerminateThreadsRequest: false,
      supportsSetExpression: true,
      supportsTerminateRequest: true,
      supportsDataBreakpoints: false,
      supportsReadMemoryRequest: false,
      supportsDisassembleRequest: false,
      supportsCancelRequest: true,
      supportsBreakpointLocationsRequest: true,
      supportsClipboardContext: true,
    };
  }

  private getMockSetBreakpointsResponse(args: any): any {
    const breakpoints = args.breakpoints || [];
    return {
      breakpoints: breakpoints.map((bp: any, index: number) => ({
        id: index + 1,
        verified: true,
        line: bp.line,
        column: bp.column,
        message: bp.condition ? `Condition: ${bp.condition}` : undefined,
      })),
    };
  }

  private getMockStackTraceResponse(args: any): any {
    return {
      stackFrames: [
        {
          id: 1,
          name: 'main',
          source: {
            path: '/workspace/index.js',
            name: 'index.js',
          },
          line: 10,
          column: 5,
          endLine: 10,
          endColumn: 20,
        },
        {
          id: 2,
          name: 'processData',
          source: {
            path: '/workspace/utils.js',
            name: 'utils.js',
          },
          line: 25,
          column: 3,
          endLine: 25,
          endColumn: 15,
        },
        {
          id: 3,
          name: 'fetchData',
          source: {
            path: '/workspace/api.js',
            name: 'api.js',
          },
          line: 42,
          column: 8,
          endLine: 42,
          endColumn: 25,
        },
      ],
      totalFrames: 3,
    };
  }

  private getMockScopesResponse(args: any): any {
    return {
      scopes: [
        {
          name: 'Local',
          variablesReference: 1000,
          expensive: false,
        },
        {
          name: 'Closure',
          variablesReference: 2000,
          expensive: false,
        },
        {
          name: 'Global',
          variablesReference: 3000,
          expensive: true,
        },
      ],
    };
  }

  private getMockVariablesResponse(args: any): any {
    const ref = args.variablesReference;
    
    if (ref === 1000) {
      // Local variables
      return {
        variables: [
          {
            name: 'data',
            value: '{ id: 1, name: "Test" }',
            type: 'object',
            variablesReference: 1001,
            evaluateName: 'data',
          },
          {
            name: 'count',
            value: '42',
            type: 'number',
            variablesReference: 0,
            evaluateName: 'count',
          },
          {
            name: 'message',
            value: '"Hello World"',
            type: 'string',
            variablesReference: 0,
            evaluateName: 'message',
          },
          {
            name: 'isActive',
            value: 'true',
            type: 'boolean',
            variablesReference: 0,
            evaluateName: 'isActive',
          },
        ],
      };
    } else if (ref === 1001) {
      // data object properties
      return {
        variables: [
          {
            name: 'id',
            value: '1',
            type: 'number',
            variablesReference: 0,
            evaluateName: 'data.id',
          },
          {
            name: 'name',
            value: '"Test"',
            type: 'string',
            variablesReference: 0,
            evaluateName: 'data.name',
          },
        ],
      };
    } else if (ref === 2000) {
      // Closure variables
      return {
        variables: [
          {
            name: 'callback',
            value: 'function callback() { ... }',
            type: 'function',
            variablesReference: 0,
            evaluateName: 'callback',
          },
        ],
      };
    } else if (ref === 3000) {
      // Global variables
      return {
        variables: [
          {
            name: 'console',
            value: 'Console',
            type: 'object',
            variablesReference: 3001,
            evaluateName: 'console',
          },
          {
            name: 'process',
            value: 'Process',
            type: 'object',
            variablesReference: 3002,
            evaluateName: 'process',
          },
        ],
      };
    }

    return { variables: [] };
  }

  private getMockEvaluateResponse(args: any): any {
    const expression = args.expression;
    
    // Simple mock evaluation
    if (expression === 'count + 1') {
      return {
        result: '43',
        type: 'number',
        variablesReference: 0,
      };
    } else if (expression === 'message.toUpperCase()') {
      return {
        result: '"HELLO WORLD"',
        type: 'string',
        variablesReference: 0,
      };
    } else if (expression.startsWith('console.log')) {
      return {
        result: 'undefined',
        type: 'undefined',
        variablesReference: 0,
      };
    }

    return {
      result: `"${expression}"`,
      type: 'string',
      variablesReference: 0,
    };
  }

  private getMockThreadsResponse(): any {
    return {
      threads: [
        {
          id: 1,
          name: 'Main Thread',
        },
      ],
    };
  }

  /**
   * Node.js specific launch
   */
  async launchNode(args: NodeLaunchRequestArguments): Promise<void> {
    await this.launch(args);
    
    // Simulate stopped event after launch
    setTimeout(() => {
      this.handleEvent({
        type: 'event',
        event: 'stopped',
        body: {
          reason: 'entry',
          threadId: 1,
          allThreadsStopped: true,
        },
      });
    }, 100);
  }

  /**
   * Set exception breakpoints
   */
  async setExceptionBreakpoints(filters: string[]): Promise<void> {
    await this.sendRequest('setExceptionBreakpoints', { filters });
  }

  /**
   * Restart frame
   */
  async restartFrame(frameId: number): Promise<void> {
    if (this.capabilities.supportsRestartFrame) {
      await this.sendRequest('restartFrame', { frameId });
    }
  }

  /**
   * Set variable value
   */
  async setVariable(variablesReference: number, name: string, value: string): Promise<any> {
    if (this.capabilities.supportsSetVariable) {
      return await this.sendRequest('setVariable', {
        variablesReference,
        name,
        value,
      });
    }
    return null;
  }

  /**
   * Get completions for REPL
   */
  async completions(text: string, column: number, frameId?: number): Promise<any[]> {
    if (this.capabilities.supportsCompletionsRequest) {
      const result = await this.sendRequest('completions', {
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
