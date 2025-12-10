import { NextRequest, NextResponse } from 'next/server';

interface DAPRequest {
  sessionId: string;
  command: string;
  arguments: any;
  seq: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: DAPRequest = await request.json();
    const { sessionId, command, arguments: args, seq } = body;

    if (!sessionId || !command) {
      return NextResponse.json(
        { success: false, message: 'Session ID and command are required' },
        { status: 400 }
      );
    }

    console.log(`DAP Request [${sessionId}]: ${command}`);

    // Mock DAP responses
    const response = await handleDAPCommand(command, args);

    return NextResponse.json({
      success: true,
      seq,
      command,
      body: response
    });
  } catch (error) {
    console.error('DAP request failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Request failed'
      },
      { status: 500 }
    );
  }
}

async function handleDAPCommand(command: string, args: any): Promise<any> {
  switch (command) {
    case 'initialize':
      return {
        supportsConfigurationDoneRequest: true,
        supportsEvaluateForHovers: true,
        supportsStepBack: false,
        supportsSetVariable: true,
        supportsRestartFrame: false,
        supportsGotoTargetsRequest: false,
        supportsStepInTargetsRequest: false,
        supportsCompletionsRequest: true,
        supportsModulesRequest: false,
        supportsExceptionOptions: false,
        supportsValueFormattingOptions: true,
        supportsExceptionInfoRequest: true,
        supportTerminateDebuggee: true,
        supportsDelayedStackTraceLoading: true,
        supportsLoadedSourcesRequest: false,
        supportsLogPoints: true,
        supportsTerminateThreadsRequest: false,
        supportsSetExpression: false,
        supportsTerminateRequest: true,
        supportsDataBreakpoints: false,
        supportsReadMemoryRequest: false,
        supportsDisassembleRequest: false,
        supportsCancelRequest: false,
        supportsBreakpointLocationsRequest: false,
        supportsClipboardContext: false
      };

    case 'launch':
    case 'attach':
      return {};

    case 'configurationDone':
      return {};

    case 'setBreakpoints':
      return {
        breakpoints: (args.breakpoints || []).map((bp: any, index: number) => ({
          id: index + 1,
          verified: true,
          line: bp.line,
          column: bp.column,
          source: args.source
        }))
      };

    case 'threads':
      return {
        threads: [
          { id: 1, name: 'Main Thread' }
        ]
      };

    case 'stackTrace':
      return {
        stackFrames: [
          {
            id: 1,
            name: 'main',
            source: {
              path: '/workspace/index.js',
              name: 'index.js'
            },
            line: 10,
            column: 5
          },
          {
            id: 2,
            name: 'processData',
            source: {
              path: '/workspace/utils.js',
              name: 'utils.js'
            },
            line: 25,
            column: 10
          }
        ],
        totalFrames: 2
      };

    case 'scopes':
      return {
        scopes: [
          {
            name: 'Local',
            variablesReference: 1,
            expensive: false
          },
          {
            name: 'Global',
            variablesReference: 2,
            expensive: true
          }
        ]
      };

    case 'variables':
      if (args.variablesReference === 1) {
        return {
          variables: [
            {
              name: 'x',
              value: '42',
              type: 'number',
              variablesReference: 0
            },
            {
              name: 'message',
              value: '"Hello, World!"',
              type: 'string',
              variablesReference: 0
            },
            {
              name: 'data',
              value: 'Object',
              type: 'object',
              variablesReference: 3,
              namedVariables: 2
            }
          ]
        };
      } else if (args.variablesReference === 3) {
        return {
          variables: [
            {
              name: 'id',
              value: '123',
              type: 'number',
              variablesReference: 0
            },
            {
              name: 'name',
              value: '"Test"',
              type: 'string',
              variablesReference: 0
            }
          ]
        };
      }
      return { variables: [] };

    case 'evaluate':
      return {
        result: 'Evaluation result',
        type: 'string',
        variablesReference: 0
      };

    case 'continue':
    case 'pause':
    case 'next':
    case 'stepIn':
    case 'stepOut':
      return {};

    case 'disconnect':
      return {};

    default:
      console.warn(`Unhandled DAP command: ${command}`);
      return {};
  }
}
