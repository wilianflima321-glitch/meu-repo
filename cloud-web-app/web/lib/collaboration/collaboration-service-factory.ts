import { CollaborationService } from './collaboration-service';
import type { CollaborationOptions } from './collaboration-service-contracts';

const collaborationInstances: Map<string, CollaborationService> = new Map();

export function getCollaborationService(options: CollaborationOptions): CollaborationService {
  const key = `${options.roomId}:${options.documentId}`;

  if (!collaborationInstances.has(key)) {
    const service = new CollaborationService(options);
    collaborationInstances.set(key, service);

    service.on('destroy', () => {
      collaborationInstances.delete(key);
    });
  }

  return collaborationInstances.get(key)!;
}

export function destroyAllCollaborationServices(): void {
  collaborationInstances.forEach(service => service.destroy());
  collaborationInstances.clear();
}
