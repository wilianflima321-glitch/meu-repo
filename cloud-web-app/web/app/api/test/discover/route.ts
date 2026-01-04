import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import path from 'node:path';
import fs from 'node:fs/promises';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

interface DiscoverTestsRequest {
  adapter: string;
  workspaceRoot: string;
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		await requireEntitlementsForUser(user.userId);

		const body = (await request.json().catch(() => ({}))) as Partial<DiscoverTestsRequest>;
		const adapter = String(body.adapter || '').toLowerCase();
		const workspaceAbs = resolveWorkspaceRoot(body.workspaceRoot);

		const patterns: Record<string, RegExp> = {
			jest: /\.(test|spec)\.(js|jsx|ts|tsx)$/i,
			pytest: /(^test_.*\.py$|.*_test\.py$)/i,
			gotest: /_test\.go$/i,
		};

		const filePattern = patterns[adapter];
		if (!filePattern) {
			return NextResponse.json(
				{ success: false, error: 'UNSUPPORTED_ADAPTER', message: `Adapter não suportado: ${adapter}`, tests: [] },
				{ status: 422 }
			);
		}

		const ignoreDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage']);
		const maxFiles = 5000;
		const maxHits = 2000;
		let scanned = 0;
		let hits = 0;
		const tests: any[] = [];

		async function walk(dir: string): Promise<void> {
			if (scanned >= maxFiles || hits >= maxHits) return;
			let entries: any[] = [];
			try {
				entries = await fs.readdir(dir, { withFileTypes: true });
			} catch {
				return;
			}
			for (const ent of entries) {
				if (scanned >= maxFiles || hits >= maxHits) return;
				const name = ent.name;
				if (ent.isDirectory()) {
					if (ignoreDirs.has(name)) continue;
					await walk(path.join(dir, name));
				} else if (ent.isFile()) {
					scanned++;
					if (!filePattern.test(name)) continue;
					const abs = path.join(dir, name);
					const rel = path.relative(workspaceAbs, abs).split(path.sep).join('/');
					const uri = `file://${abs.split(path.sep).join('/')}`;
					tests.push({
						id: uri,
						label: name,
						type: 'file',
						uri,
						children: [],
						parent: undefined,
						relPath: rel,
					});
					hits++;
				}
			}
		}

		await walk(workspaceAbs);

		return NextResponse.json({
			success: true,
			adapter,
			workspaceRoot: workspaceAbs,
			tests,
			truncated: scanned >= maxFiles || hits >= maxHits,
		});
  } catch (error) {
    console.error('Failed to discover tests:', error);
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Failed to discover tests' },
      { status: 500 }
    );
  }
}

