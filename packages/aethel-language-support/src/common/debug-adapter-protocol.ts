/**
 * Debug Adapter Protocol
 */

export interface DebugAdapter {
    /**
     * Nome do adaptador de depuração
     */
    name: string;
    
    /**
     * Tipo de depurador (e.g., 'python', 'cppdbg')
     */
    type: string;
    
    /**
     * Versão do adaptador
     */
    version: string;
    
    /**
     * Path para o executável do adaptador
     */
    adapterPath?: string;
    
    /**
     * Configurações de inicialização
     */
    configuration?: {
        args?: string[];
        env?: { [key: string]: string };
        runtime?: string;
    };
    
    /**
     * Templates de configuração de depuração
     */
    configurationSnippets?: {
        label: string;
        description: string;
        body: any;
    }[];
    
    /**
     * Variáveis de configuração disponíveis
     */
    variables?: { [key: string]: string };
    
    /**
     * Dependências que precisam ser instaladas
     */
    dependencies?: {
        name: string;
        version: string;
    }[];
}