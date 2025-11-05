/**
 * Language Package Protocol
 */

export interface LanguagePackage {
    /**
     * Nome do pacote de linguagem
     */
    name: string;
    
    /**
     * Identificador da linguagem (e.g., 'python', 'typescript')
     */
    languageId: string;
    
    /**
     * Versão do pacote
     */
    version: string;
    
    /**
     * Path para o executável do Language Server
     */
    serverPath?: string;
    
    /**
     * Path para o executável do Debug Adapter
     */
    debugAdapterPath?: string;
    
    /**
     * Configurações de inicialização do Language Server
     */
    serverConfig?: {
        args?: string[];
        env?: { [key: string]: string };
    };
    
    /**
     * Configurações de inicialização do Debug Adapter
     */
    debugConfig?: {
        args?: string[];
        env?: { [key: string]: string };
    };
    
    /**
     * Extensões de arquivo associadas
     */
    fileExtensions: string[];
    
    /**
     * Dependências que precisam ser instaladas
     */
    dependencies?: {
        name: string;
        version: string;
    }[];
}