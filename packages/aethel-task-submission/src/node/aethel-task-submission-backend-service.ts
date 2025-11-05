import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { AethelTaskSubmissionService, AethelTaskSubmissionServicePath, Task } from '../common/aethel-task-submission-service';
import { RpcConnectionHandler } from '@theia/core/lib/common/messaging/proxy-factory';

@injectable()
export class AethelTaskSubmissionBackendService implements AethelTaskSubmissionService, BackendApplicationContribution {

    private tasks: Task[] = [];

    onStart(): void {
        console.log('Aethel Task Submission Backend started');
    }

    async submitTask(task: Task): Promise<string> {
        task.id = `task-${Date.now()}`;
        task.status = 'pending';
        this.tasks.push(task);
        // Process task asynchronously
        setTimeout(() => {
            task.status = 'completed';
        }, 5000);
        return task.id;
    }

    async getTaskStatus(id: string): Promise<Task> {
        const task = this.tasks.find(t => t.id === id);
        if (!task) {
            throw new Error('Task not found');
        }
        return task;
    }

    async downloadResult(id: string): Promise<Buffer> {
        // Mock result
        return Buffer.from('Task result');
    }

    async listTasks(): Promise<Task[]> {
        return this.tasks;
    }
}

export const AethelTaskSubmissionServiceHandler: RpcConnectionHandler<AethelTaskSubmissionService> =
    new RpcConnectionHandler(
        AethelTaskSubmissionServicePath,
        () => new AethelTaskSubmissionBackendService()
    );
