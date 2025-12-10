/**
 * Python DAP Adapter Implementation
 * Uses debugpy protocol
 */

import { DAPAdapterBase, DAPAdapterConfig, LaunchRequestArguments, Capabilities } from '../dap-adapter-base';

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
      supportsFunctionBreakpoints: false,
      supportsConditionalBreakpoints: true,
      supportsHitConditionalBreakpoints: true,
      supportsEvaluateForHovers: true,
      supportsStepBack: false,
      supportsSetVariable: true,
      supportsRestartFrame: false,
      supportsGotoTargetsRequest: false,
      supportsStepInTargetsRequest: false,
      supportsCompletionsRequest: true,
      supportsModulesRequest: true,
      supportsExceptionOptions: true,
      supportsValueFormattingOptions: true,
      supportsExceptionInfoRequest: true,
      supportTerminateDebuggee: true,
      supportsDelayedStackTraceLoading: false,
      supportsLoadedSourcesRequest: false,
      supportsLogPoints: true,
      supportsTerminateThreadsRequest: false,
      supportsSetExpression: true,
      supportsTerminateRequest: true,
      supportsDataBreakpoints: false,
      supportsReadMemoryRequest: false,
      supportsDisassembleRequest: false,
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
          name: 'main',
          source: {
            path: '/workspace/main.py',
            name: 'main.py',
          },
          line: 15,
          column: 1,
          endLine: 15,
          endColumn: 20,
        },
        {
          id: 2,
          name: 'process_data',
          source: {
            path: '/workspace/utils.py',
            name: 'utils.py',
          },
          line: 32,
          column: 5,
          endLine: 32,
          endColumn: 25,
        },
        {
          id: 3,
          name: 'fetch_data',
          source: {
            path: '/workspace/api.py',
            name: 'api.py',
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
          name: 'Locals',
          variablesReference: 1000,
          expensive: false,
        },
        {
          name: 'Globals',
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
            value: "{'id': 1, 'name': 'Test'}",
            type: 'dict',
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
            value: "'Hello World'",
            type: 'str',
            variablesReference: 0,
            evaluateName: 'message',
          },
          {
            name: 'is_active',
            value: 'True',
            type: 'bool',
            variablesReference: 0,
            evaluateName: 'is_active',
          },
          {
            name: 'items',
            value: '[1, 2, 3, 4, 5]',
            type: 'list',
            variablesReference: 1002,
            evaluateName: 'items',
          },
        ],
      };
    } else if (ref === 1001) {
      // data dict items
      return {
        variables: [
          {
            name: "'id'",
            value: '1',
            type: 'int',
            variablesReference: 0,
            evaluateName: "data['id']",
          },
          {
            name: "'name'",
            value: "'Test'",
            type: 'str',
            variablesReference: 0,
            evaluateName: "data['name']",
          },
        ],
      };
    } else if (ref === 1002) {
      // items list
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
            name: '__name__',
            value: "'__main__'",
            type: 'str',
            variablesReference: 0,
            evaluateName: '__name__',
          },
          {
            name: '__file__',
            value: "'/workspace/main.py'",
            type: 'str',
            variablesReference: 0,
            evaluateName: '__file__',
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
    } else if (expression === 'message.upper()') {
      return {
        result: "'HELLO WORLD'",
        type: 'str',
        variablesReference: 0,
      };
    } else if (expression === 'len(items)') {
      return {
        result: '5',
        type: 'int',
        variablesReference: 0,
      };
    } else if (expression.startsWith('print(')) {
      return {
        result: 'None',
        type: 'NoneType',
        variablesReference: 0,
      };
    }

    return {
      result: `'${expression}'`,
      type: 'str',
      variablesReference: 0,
    };
  }

  private getMockThreadsResponse(): any {
    return {
      threads: [
        {
          id: 1,
          name: 'MainThread',
        },
      ],
    };
  }

  /**
   * Python specific launch
   */
  async launchPython(args: PythonLaunchRequestArguments): Promise<void> {
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
  async setExceptionBreakpoints(filters: string[], exceptionOptions?: any[]): Promise<void> {
    await this.sendRequest('setExceptionBreakpoints', {
      filters,
      exceptionOptions,
    });
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

  /**
   * Get exception info
   */
  async exceptionInfo(threadId: number): Promise<any> {
    if (this.capabilities.supportsExceptionInfoRequest) {
      return await this.sendRequest('exceptionInfo', { threadId });
    }
    return null;
  }
}

export function createPythonDAPAdapter(workspaceRoot: string): PythonDAPAdapter {
  return new PythonDAPAdapter(workspaceRoot);
}
