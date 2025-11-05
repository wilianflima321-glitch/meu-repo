import { injectable, inject } from '@theia/core/shared/inversify';
import { LanguageExtensionManager } from '../common/language-extension-manager-protocol';
import { FileSystem } from '@theia/filesystem/lib/common/filesystem';
import { ILogger } from '@theia/core/lib/common/logger';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { LanguagePackage } from '../common/language-package-protocol';

@injectable()
export class LanguageExtensionManagerImpl implements LanguageExtensionManager {
    protected readonly toDispose = new DisposableCollection();

    @inject(FileSystem)
    protected readonly fileSystem: FileSystem;

    @inject(ILogger)
    protected readonly logger: ILogger;

    async install(languagePackage: LanguagePackage): Promise<void> {
        this.logger.info(`Installing language package: ${languagePackage.name}`);
        // TODO: Implementar lógica de instalação
    }

    async uninstall(languagePackage: LanguagePackage): Promise<void> {
        this.logger.info(`Uninstalling language package: ${languagePackage.name}`);
        // TODO: Implementar lógica de desinstalação
    }

    async list(): Promise<LanguagePackage[]> {
        // TODO: Implementar lógica para listar pacotes instalados
        return [];
    }

    async startLanguageServer(languageId: string): Promise<Disposable> {
        this.logger.info(`Starting language server for: ${languageId}`);
        // TODO: Implementar lógica de inicialização do LSP
        return Disposable.NULL;
    }

    async stopLanguageServer(languageId: string): Promise<void> {
        this.logger.info(`Stopping language server for: ${languageId}`);
        // TODO: Implementar lógica de parada do LSP
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}