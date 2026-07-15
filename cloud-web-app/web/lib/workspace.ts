import path from 'path';

export function getWorkspaceRoot(): string {
	return process.env.WORKSPACE_ROOT || '/workspace';
}

export function assertWorkspacePath(inputPath: string, label = 'path'): string {
	if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
		throw Object.assign(new Error(`INVALID_${label.toUpperCase()}: value is required`), {
			code: `INVALID_${label.toUpperCase()}`,
		});
	}

	const workspaceRoot = path.resolve(getWorkspaceRoot());
	const resolved = path.resolve(inputPath);

	if (resolved === workspaceRoot) return resolved;

	// Must stay inside workspace root
	if (!resolved.startsWith(workspaceRoot + path.sep)) {
		throw Object.assign(
			new Error(`PATH_OUTSIDE_WORKSPACE: ${label} must be inside workspace root`),
			{ code: 'PATH_OUTSIDE_WORKSPACE', label, workspaceRoot, resolved }
		);
	}

	return resolved;
}
