/**
 * Provider Secrets Manager
 * 
 * Manages encrypted API keys for LLM providers
 */

import { injectable } from '@theia/core/shared/inversify';
import { getSecretsVault } from '../node/secrets-vault';

export interface ProviderConfig {
    id: string;
    name: string;
    type: string;
    endpoint?: string;
    apiKey?: string;
    _encryptedApiKey?: string;
    [key: string]: unknown;
}

@injectable()
export class ProviderSecretsManager {
    private vault = getSecretsVault();

    /**
     * Encrypt and store API key
     */
    encryptApiKey(config: ProviderConfig): ProviderConfig {
        if (config.apiKey) {
            const encrypted = this.vault.encrypt(config.apiKey);
            
            return {
                ...config,
                _encryptedApiKey: encrypted,
                apiKey: undefined // Remove plaintext
            };
        }
        
        return config;
    }

    /**
     * Decrypt API key for use
     */
    decryptApiKey(config: ProviderConfig): string | undefined {
        if (config._encryptedApiKey) {
            try {
                return this.vault.decrypt(config._encryptedApiKey);
            } catch (error) {
                console.error('[ProviderSecrets] Failed to decrypt API key:', error);
                return undefined;
            }
        }
        
        // Fallback to plaintext (for migration)
        return config.apiKey;
    }

    /**
     * Migrate existing providers to use encryption
     */
    migrateProvider(config: ProviderConfig): ProviderConfig {
        // If has plaintext key but no encrypted key
        if (config.apiKey && !config._encryptedApiKey) {
            console.log(`[ProviderSecrets] Migrating provider ${config.id} to encrypted storage`);
            return this.encryptApiKey(config);
        }
        
        return config;
    }

    /**
     * Validate encrypted key
     */
    validateEncryptedKey(config: ProviderConfig): boolean {
        if (!config._encryptedApiKey) {
            return false;
        }
        
        try {
            const decrypted = this.vault.decrypt(config._encryptedApiKey);
            return !!decrypted && decrypted.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Get provider config with decrypted key for use
     */
    getProviderForUse(config: ProviderConfig): ProviderConfig & { apiKey: string } {
        const apiKey = this.decryptApiKey(config);
        
        if (!apiKey) {
            throw new Error(`No API key available for provider ${config.id}`);
        }
        
        return {
            ...config,
            apiKey,
            _encryptedApiKey: undefined // Don't expose encrypted key
        };
    }
}
