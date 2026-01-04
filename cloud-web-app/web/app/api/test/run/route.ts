import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

interface RunTestsRequest {
  adapter: string;
  testIds: string[];
  workspaceRoot: string;
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		await requireEntitlementsForUser(user.userId);

		const startTime = new Date();
		const body = (await request.json().catch(() => ({}))) as Partial<RunTestsRequest>;
		const adapter = String(body.adapter || '').toLowerCase();
		const workspaceAbs = resolveWorkspaceRoot(body.workspaceRoot);
		const testIds = Array.isArray(body.testIds) ? body.testIds : [];

		if (adapter !== 'jest' && adapter !== 'pytest' && adapter !== 'gotest') {
			return NextResponse.json(
				{ success: false, error: 'UNSUPPORTED_ADAPTER', message: `Adapter não suportado: ${adapter}` },
				{ status: 422 }
			);
		}

		if (adapter !== 'jest') {
			return NextResponse.json(
				{
					success: false,
					error: 'RUNNER_NOT_CONFIGURED',
					message: `Runner server-side para ${adapter} não está configurado neste build.`,
				},
				{ status: 422 }
			);
		}

		const toPath = (id: string) => {
			const raw = String(id || '');
			const noScheme = raw.startsWith('file://') ? raw.replace(/^file:\/\//, '') : raw;
			const abs = path.isAbsolute(noScheme) ? path.resolve(noScheme) : path.resolve(workspaceAbs, noScheme);
			const rel = path.relative(workspaceAbs, abs);
			if (rel.startsWith('..') || path.isAbsolute(rel)) {
				throw Object.assign(new Error('TEST_PATH_OUT_OF_BOUNDS'), { code: 'TEST_PATH_OUT_OF_BOUNDS' });
			}
			return abs;
		};

		const filePaths = testIds.length ? testIds.map(toPath) : [];

		const jestBin = path.join(workspaceAbs, 'node_modules', 'jest', 'bin', 'jest.js');
		const hasLocalJest = await fs
			.stat(jestBin)
			.then(() => true)
			.catch(() => false);

		const runId = `run_${Date.now()}`;
		const outFile = path.join(os.tmpdir(), `aethel_jest_${runId}.json`);

		const args = hasLocalJest
			? [jestBin]
			: ['node_modules/.bin/jest'];

		const cmd = hasLocalJest ? process.execPath : 'npx';
		const cmdArgs = hasLocalJest
			? [
					...args,
					'--json',
					`--outputFile=${outFile}`,
					'--runInBand',
					'--testLocationInResults',
					'--passWithNoTests',
					...filePaths,
				]
			: [
					'jest',
					'--json',
					`--outputFile=${outFile}`,
					'--runInBand',
					'--testLocationInResults',
					'--passWithNoTests',
					...filePaths,
				];

		const { code, stdout, stderr } = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
			const child = spawn(cmd, cmdArgs, {
				cwd: workspaceAbs,
				shell: process.platform === 'win32',
				env: process.env,
			});
			let out = '';
			let err = '';
			child.stdout.on('data', (d) => (out += String(d)));
			child.stderr.on('data', (d) => (err += String(d)));
			child.on('close', (c) => resolve({ code: typeof c === 'number' ? c : 1, stdout: out, stderr: err }));
		});

		const endTime = new Date();

		const raw = await fs.readFile(outFile, 'utf8').catch(() => '');
		const json = raw ? JSON.parse(raw) : null;

		const results: Record<string, any> = {};

		// Mapeia por arquivo (nível file). O front usa id=uri; aqui retornamos pelo mesmo id.
		const suiteResults: any[] = (json && (json as any).testResults) ? (json as any).testResults : [];
		for (const suite of suiteResults) {
			const filePath = String(suite.name || '');
			const uri = `file://${filePath.split(path.sep).join('/')}`;
			const status = String(suite.status || '').toLowerCase();
			const state = status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'errored';
			results[uri] = {
				testId: uri,
				state,
				duration: typeof suite.perfStats?.end === 'number' && typeof suite.perfStats?.start === 'number'
					? Math.max(0, suite.perfStats.end - suite.perfStats.start)
					: undefined,
				message: state !== 'passed' ? (suite.message ? String(suite.message) : undefined) : undefined,
				output: stderr || stdout || undefined,
			};
		}

		// Se nada foi reportado (por exemplo, nenhum teste), retorna sucesso com results vazio.
		return NextResponse.json({
			success: code === 0,
			runId,
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
			results,
			exitCode: code,
		});
  } catch (error) {
    console.error('Failed to run tests:', error);
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Failed to run tests' },
      { status: 500 }
    );
  }
}
