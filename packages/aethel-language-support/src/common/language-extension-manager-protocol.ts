import { JsonRpcServer } from '@theia/core/lib/common/messaging/proxy-factory';
import { Disposable } from '@theia/core/lib/common/disposable';
import { LanguagePackage } from './language-package-protocol';

export const LanguageExtensionManagerPath = '/services/language-extension-manager';

export interface LanguageExtensionManager extends JsonRpcServer<void> {
    /**
     * Instala um pacote de linguagem
     */
    install(languagePackage: LanguagePackage): Promise<void>;
    
    /**
     * Desinstala um pacote de linguagem
     */
    uninstall(languagePackage: LanguagePackage): Promise<void>;
    
    /**
     * Lista os pacotes de linguagem instalados
     */
    list(): Promise<LanguagePackage[]>;
    
    /**
     * Inicia um servidor de linguagem para um determinado languageId
     */
    startLanguageServer(languageId: string): Promise<Disposable>;
    
    /**
     * Para um servidor de linguagem
     */
    stopLanguageServer(languageId: string): Promise<void>;
    
    /**
     * Libera recursos
     */
    dispose(): void;
}