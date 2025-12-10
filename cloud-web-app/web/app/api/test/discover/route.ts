import { NextRequest, NextResponse } from 'next/server';

interface DiscoverTestsRequest {
  adapter: string;
  workspaceRoot: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscoverTestsRequest = await request.json();
    const { adapter, workspaceRoot } = body;

    console.log(`Discovering tests with ${adapter} in ${workspaceRoot}`);

    // Mock test discovery
    const tests = getMockTests(adapter);

    return NextResponse.json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('Failed to discover tests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to discover tests' },
      { status: 500 }
    );
  }
}

function getMockTests(adapter: string) {
  if (adapter === 'jest') {
    return [
      {
        id: 'file:src/utils.test.ts',
        label: 'utils.test.ts',
        type: 'file',
        uri: 'file:///workspace/src/utils.test.ts',
        children: [
          {
            id: 'suite:utils',
            label: 'Utils',
            type: 'suite',
            parent: 'file:src/utils.test.ts',
            children: [
              {
                id: 'test:utils:add',
                label: 'should add two numbers',
                type: 'test',
                parent: 'suite:utils',
                range: { start: { line: 5, character: 2 }, end: { line: 7, character: 4 } }
              },
              {
                id: 'test:utils:subtract',
                label: 'should subtract two numbers',
                type: 'test',
                parent: 'suite:utils',
                range: { start: { line: 9, character: 2 }, end: { line: 11, character: 4 } }
              }
            ]
          }
        ]
      },
      {
        id: 'file:src/api.test.ts',
        label: 'api.test.ts',
        type: 'file',
        uri: 'file:///workspace/src/api.test.ts',
        children: [
          {
            id: 'suite:api',
            label: 'API',
            type: 'suite',
            parent: 'file:src/api.test.ts',
            children: [
              {
                id: 'test:api:fetch',
                label: 'should fetch data',
                type: 'test',
                parent: 'suite:api',
                range: { start: { line: 10, character: 2 }, end: { line: 15, character: 4 } }
              },
              {
                id: 'test:api:post',
                label: 'should post data',
                type: 'test',
                parent: 'suite:api',
                range: { start: { line: 17, character: 2 }, end: { line: 22, character: 4 } }
              }
            ]
          }
        ]
      }
    ];
  }

  if (adapter === 'pytest') {
    return [
      {
        id: 'file:tests/test_utils.py',
        label: 'test_utils.py',
        type: 'file',
        uri: 'file:///workspace/tests/test_utils.py',
        children: [
          {
            id: 'test:test_add',
            label: 'test_add',
            type: 'test',
            parent: 'file:tests/test_utils.py',
            range: { start: { line: 3, character: 0 }, end: { line: 5, character: 0 } }
          },
          {
            id: 'test:test_subtract',
            label: 'test_subtract',
            type: 'test',
            parent: 'file:tests/test_utils.py',
            range: { start: { line: 7, character: 0 }, end: { line: 9, character: 0 } }
          }
        ]
      }
    ];
  }

  if (adapter === 'gotest') {
    return [
      {
        id: 'file:utils_test.go',
        label: 'utils_test.go',
        type: 'file',
        uri: 'file:///workspace/utils_test.go',
        children: [
          {
            id: 'test:TestAdd',
            label: 'TestAdd',
            type: 'test',
            parent: 'file:utils_test.go',
            range: { start: { line: 5, character: 0 }, end: { line: 10, character: 1 } }
          },
          {
            id: 'test:TestSubtract',
            label: 'TestSubtract',
            type: 'test',
            parent: 'file:utils_test.go',
            range: { start: { line: 12, character: 0 }, end: { line: 17, character: 1 } }
          }
        ]
      }
    ];
  }

  return [];
}
