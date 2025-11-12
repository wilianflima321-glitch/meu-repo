import * as crypto from 'crypto';

export interface EncryptedSecret {
    iv: string;
    encrypted: string;
    authTag: string;
}

export class SecretsVault {
    private readonly algorithm = 'aes-256-gcm';
    private readonly masterKey: Buffer;

    constructor(masterKeyBase64?: string) {
        if (masterKeyBase64) {
            this.masterKey = Buffer.from(masterKeyBase64, 'base64');
        } else {
            // Generate a random master key if none provided
            this.masterKey = crypto.randomBytes(32);
            console.warn('[SecretsVault] Generated random master key. Store this securely:', this.masterKey.toString('base64'));
        }
    }

    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        const result: EncryptedSecret = {
            iv: iv.toString('hex'),
            encrypted,
            authTag: authTag.toString('hex')
        };

        return JSON.stringify(result);
    }

    decrypt(ciphertext: string): string {
        const data: EncryptedSecret = JSON.parse(ciphertext);
        
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.masterKey,
            Buffer.from(data.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
        
        let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    getMasterKey(): string {
        return this.masterKey.toString('base64');
    }
}

// Singleton instance
let vaultInstance: SecretsVault | null = null;

export function getSecretsVault(masterKey?: string): SecretsVault {
    if (!vaultInstance) {
        vaultInstance = new SecretsVault(masterKey);
    }
    return vaultInstance;
}

export function resetSecretsVault(): void {
    vaultInstance = null;
}
