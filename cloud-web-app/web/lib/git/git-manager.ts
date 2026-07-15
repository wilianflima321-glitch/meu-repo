/**
 * Git Manager
 * Camada de conveniência acima do GitClient para uso na integração do IDE.
 */

import { GitClient, GitFileStatus, GitStatus } from './git-client';

export type GitManagerFile = GitFileStatus & {
	area: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
};

export interface GitManagerStatus {
	branch: string;
	ahead: number;
	behind: number;
	files: GitManagerFile[];
	raw: GitStatus;
}

export class GitManager {
	private client: GitClient;

	constructor(workspaceRoot: string = '/workspace') {
		this.client = new GitClient(workspaceRoot);
	}

	async getStatus(): Promise<GitManagerStatus> {
		const status = await this.client.status();
		return {
			branch: status.branch,
			ahead: status.ahead,
			behind: status.behind,
			files: [
				...status.staged.map(f => ({ ...f, area: 'staged' as const })),
				...status.unstaged.map(f => ({ ...f, area: 'unstaged' as const })),
				...status.untracked.map(f => ({ ...f, area: 'untracked' as const })),
				...status.conflicted.map(f => ({ ...f, area: 'conflicted' as const })),
			],
			raw: status,
		};
	}
}

let gitManagerInstance: GitManager | null = null;

export function getGitManager(): GitManager {
	if (!gitManagerInstance) {
		gitManagerInstance = new GitManager();
	}
	return gitManagerInstance;
}

export function resetGitManager(): void {
	gitManagerInstance = null;
}
