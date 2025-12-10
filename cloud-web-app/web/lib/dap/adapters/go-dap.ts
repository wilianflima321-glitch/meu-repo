/**
 * Go DAP Adapter Implementation
 * Uses Delve debugger
 */

import { DAPAdapterBase, DAPAdapterConfig, LaunchRequestArguments, Capabilities } from '../dap-adapter-base';

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
      supportsRestartFrame: false,
      supportsGotoTargetsRequest: false,
      supportsStepInTargetsRequest: false,
      supportsCompletionsRequest: false,
      supportsModulesRequest: false,
      supportsExceptionOptions: false,
      supportsValueFormattingOptions: true,
      supportsExceptionInfoRequest: false,
      supportTerminateDebuggee: true,
      supportsDelayedStackTraceLoading: true,
      supportsLoadedSourcesRequest: false,
      supportsLogPoints: true,
      supportsTerminateThreadsRequest: false,
      supportsSetExpression: false,
      supportsTerminateRequest: true,
      supportsDataBreakpoints: false,
      supportsReadMemoryRequest: false,
      supportsDisassembleRequest: true,
      supportsCancelRequest: false,
      supportsBreakpointLocationsRequest: false,
      supportsClipboardContext: false,
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
          name: 'main.main',
          source: {
            path: '/workspace/main.go',
            name: 'main.go',
          },
          line: 15,
          column: 2,
          endLine: 15,
          endColumn: 20,
        },
        {
          id: 2,
          name: 'main.processData',
          source: {
            path: '/workspace/utils.go',
            name: 'utils.go',
          },
          line: 32,
          column: 5,
          endLine: 32,
          endColumn: 25,
        },
        {
          id: 3,
          name: 'main.fetchData',
          source: {
            path: '/workspace/api.go',
            name: 'api.go',
          },
          line: 48,
          column: 9,
          endLine: 48,
          endColumn: 30,
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
          name: 'Global',
          variablesReference: 2000,
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
            value: 'map[string]interface {}{"id":1, "name":"Test"}',
            type: 'map[string]interface {}',
            variablesReference: 1001,
            evaluateName: 'data',
          },
          {
            name: 'count',
            value: '42',
            type: 'int',
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
            type: 'bool',
            variablesReference: 0,
            evaluateName: 'isActive',
          },
          {
            name: 'items',
            value: '[]int len: 5, cap: 5, [1,2,3,4,5]',
            type: '[]int',
            variablesReference: 1002,
            evaluateName: 'items',
          },
        ],
      };
    } else if (ref === 1001) {
      // data map items
      return {
        variables: [
          {
            name: '["id"]',
            value: '1',
            type: 'int',
            variablesReference: 0,
            evaluateName: 'data["id"]',
          },
          {
            name: '["name"]',
            value: '"Test"',
            type: 'string',
            variablesReference: 0,
            evaluateName: 'data["name"]',
          },
        ],
      };
    } else if (ref === 1002) {
      // items slice
      return {
        variables: [
          {
            name: '[0]',
            value: '1',
            type: 'int',
            variablesReference: 0,
            evaluateName: 'items[0]',
          },
          {
            name: '[1]',
            value: '2',
            type: 'int',
            variablesReference: 0,
            evaluateName: 'items[1]',
          },
          {
            name: '[2]',
            value: '3',
            type: 'int',
            variablesReference: 0,
            evaluateName: 'items[2]',
          },
          {
            name: '[3]',
            value: '4',
            type: 'int',
            variablesReference: 0,
            evaluateName: 'items[3]',
          },
          {
            name: '[4]',
            value: '5',
            type: 'int',
            variablesReference: 0,
            evaluateName: 'items[4]',
          },
        ],
      };
    } else if (ref === 2000) {
      // Global variables
      return {
        variables: [
          {
            name: 'runtime.GOOS',
            value: '"linux"',
            type: 'string',
            variablesReference: 0,
            evaluateName: 'runtime.GOOS',
          },
          {
            name: 'runtime.GOARCH',
            value: '"amd64"',
            type: 'string',
            variablesReference: 0,
            evaluateName: 'runtime.GOARCH',
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
        type: 'int',
        variablesReference: 0,
      };
    } else if (expression === 'len(items)') {
      return {
        result: '5',
        type: 'int',
        variablesReference: 0,
      };
    } else if (expression.startsWith('fmt.Println')) {
      return {
        result: '(int, error)',
        type: '(int, error)',
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
          name: 'Goroutine 1',
        },
      ],
    };
  }

  /**
   * Go-specific launch
   */
  async launchGo(args: GoLaunchRequestArguments): Promise<void> {
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
   * Set function breakpoints
   */
  async setFunctionBreakpoints(breakpoints: Array<{ name: string }>): Promise<any[]> {
    if (this.capabilities.supportsFunctionBreakpoints) {
      const result = await this.sendRequest('setFunctionBreakpoints', {
        breakpoints,
      });
      return result.breakpoints || [];
    }
    return [];
  }

  /**
   * Disassemble
   */
  async disassemble(memoryReference: string, offset: number, instructionCount: number): Promise<any> {
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
