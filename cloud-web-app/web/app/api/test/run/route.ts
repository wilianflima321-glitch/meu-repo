import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface RunTestsRequest {
  adapter: string;
  testIds: string[];
  workspaceRoot: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RunTestsRequest = await request.json();
    const { adapter, testIds, workspaceRoot } = body;

    console.log(`Running ${testIds.length} tests with ${adapter}`);

    const runId = randomUUID();
    const startTime = new Date();

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    const results: Record<string, any> = {};
    
    for (const testId of testIds) {
      // Simulate random test results
      const passed = Math.random() > 0.2;
      const duration = Math.floor(Math.random() * 500) + 50;

      results[testId] = {
        testId,
        state: passed ? 'passed' : 'failed',
        duration,
        message: passed ? undefined : 'Expected true to be false',
        stack: passed ? undefined : `Error: Expected true to be false\n    at Object.<anonymous> (test.ts:10:5)`
      };
    }

    const endTime = new Date();

    return NextResponse.json({
      success: true,
      runId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      results
    });
  } catch (error) {
    console.error('Failed to run tests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run tests' },
      { status: 500 }
    );
  }
}
