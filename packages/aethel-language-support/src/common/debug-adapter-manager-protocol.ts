import { JsonRpcServer } from '@theia/core/lib/common/messaging/proxy-factory';
import { Disposable } from '@theia/core/lib/common/disposable';
import { DebugAdapter } from './debug-adapter-protocol';
import { DebugConfiguration } from '@theia/debug/lib/common/debug-configuration';

export const DebugAdapterManagerPath = '/services/debug-adapter-manager';

export interface DebugAdapterManager extends JsonRpcServer<void> {
    /**
     * Instala um adaptador de depuração
     */
    install(adapter: DebugAdapter): Promise<void>;
    
    /**
     * Desinstala um adaptador de depuração
     */
    uninstall(adapter: DebugAdapter): Promise<void>;
    
    /**
     * Lista os adaptadores de depuração instalados
     */
    list(): Promise<DebugAdapter[]>;
    
    /**
     * Cria uma nova sessão de depuração
     */
    createDebugSession(config: DebugConfiguration): Promise<Disposable>;
    
    /**
     * Libera recursos
     */
    dispose(): void;
}