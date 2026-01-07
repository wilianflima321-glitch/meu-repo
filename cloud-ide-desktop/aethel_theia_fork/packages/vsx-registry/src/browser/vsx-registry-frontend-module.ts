import { ContainerModule } from 'inversify';
import { VSXRegistryService } from './vsx-registry-service';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';

export default new ContainerModule(bind => {
    bind(VSXRegistryService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(VSXRegistryService);
});
