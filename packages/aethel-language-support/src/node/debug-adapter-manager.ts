import { injectable, inject } from '@theia/core/shared/inversify';
import { DebugAdapterManager } from '../common/debug-adapter-manager-protocol';
import { FileSystem } from '@theia/filesystem/lib/common/filesystem';
import { ILogger } from '@theia/core/lib/common/logger';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { DebugConfiguration } from '@theia/debug/lib/common/debug-configuration';
import { DebugAdapter } from '../common/debug-adapter-protocol';

@injectable()
export class DebugAdapterManagerImpl implements DebugAdapterManager {
    protected readonly toDispose = new DisposableCollection();

    @inject(FileSystem)
    protected readonly fileSystem: FileSystem;

    @inject(ILogger)
    protected readonly logger: ILogger;

    async install(adapter: DebugAdapter): Promise<void> {
        this.logger.info(`Installing debug adapter: ${adapter.name}`);
        // TODO: Implementar lógica de instalação
    }

    async uninstall(adapter: DebugAdapter): Promise<void> {
        this.logger.info(`Uninstalling debug adapter: ${adapter.name}`);
        // TODO: Implementar lógica de desinstalação
    }

    async list(): Promise<DebugAdapter[]> {
        // TODO: Implementar lógica para listar adaptadores instalados
        return [];
    }

    async createDebugSession(config: DebugConfiguration): Promise<Disposable> {
        this.logger.info(`Creating debug session for: ${config.type}`);
        // TODO: Implementar lógica de criação de sessão DAP
        return Disposable.NULL;
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}