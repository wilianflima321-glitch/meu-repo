/**
 * Task Manager
 *
 * Camada client-side para detecção/carregamento de tasks do workspace.
 * Integra com as rotas Next reais:
 * - POST /api/tasks/detect
 * - POST /api/tasks/load
 */

export type DetectedTask = {
	label: string;
	type: string;
	command: string;
	args?: string[];
	problemMatcher?: string[];
	presentation?: Record<string, unknown>;
};

export class TaskManager {
	private tasks: DetectedTask[] = [];

	async detectTasks(workspaceRoot: string): Promise<DetectedTask[]> {
		const res = await fetch('/api/tasks/detect', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ workspaceRoot }),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`TASK_DETECT_FAILED: ${res.status} ${text || res.statusText}`);
		}

		const data = (await res.json().catch(() => ({}))) as any;
		this.tasks = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
		return this.tasks;
	}

	async loadTasks(workspaceRoot: string): Promise<DetectedTask[]> {
		const res = await fetch('/api/tasks/load', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ workspaceRoot }),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`TASK_LOAD_FAILED: ${res.status} ${text || res.statusText}`);
		}

		const data = (await res.json().catch(() => ({}))) as any;
		this.tasks = Array.isArray(data?.tasks) ? data.tasks : [];
		return this.tasks;
	}

	getTasks(): DetectedTask[] {
		return [...this.tasks];
	}

	clear(): void {
		this.tasks = [];
	}
}

let taskManagerInstance: TaskManager | null = null;

export function getTaskManager(): TaskManager {
	if (!taskManagerInstance) {
		taskManagerInstance = new TaskManager();
	}
	return taskManagerInstance;
}

export function resetTaskManager(): void {
	taskManagerInstance = null;
}
