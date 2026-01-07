import { ContainerModule } from 'inversify';
import { CollaborationService } from './collaboration-service';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';

export default new ContainerModule(bind => {
    bind(CollaborationService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CollaborationService);
});
