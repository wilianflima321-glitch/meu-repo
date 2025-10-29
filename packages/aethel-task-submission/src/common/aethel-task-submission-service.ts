export const AethelTaskSubmissionService = Symbol('AethelTaskSubmissionService');
export const AethelTaskSubmissionServicePath = '/services/aethel-task-submission';

export interface Task {
    id: string;
    description: string;
    files: Buffer[];
    channel: 'api' | 'websocket' | 'cli' | 'github' | 'slack';
    status: 'pending' | 'processing' | 'completed';
}

export interface AethelTaskSubmissionService {
    submitTask(task: Task): Promise<string>;
    getTaskStatus(id: string): Promise<Task>;
    downloadResult(id: string): Promise<Buffer>;
    listTasks(): Promise<Task[]>;
}