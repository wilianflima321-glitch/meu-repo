/**
 * ============================================
 * AETHEL ENGINE - Secure Vault
 * ============================================
 * 
 * Cofre criptografado para armazenamento seguro
 * de credenciais dos usuários.
 * 
 * Características:
 * - Criptografia AES-256-GCM
 * - Derivação de chave PBKDF2
 * - Nunca armazena master password
 * - Auto-lock após inatividade
 * - Auditoria completa de acessos
 */

import { EventEmitter } from 'events';
import {
  StoredCredential,
  CredentialSchema,
  EncryptedValue,
  VaultEvent,
  VaultEventType,
  CredentialCategory,
  SecurityLevel,
  CREDENTIAL_SCHEMAS,
} from './credential-types';

// ============================================
// CRYPTO UTILITIES (Browser-compatible)
// ============================================

interface CryptoUtils {
  encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedValue>;
  decrypt(encrypted: EncryptedValue, key: CryptoKey): Promise<string>;
  deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>;
  generateSalt(): Uint8Array;
  hashPassword(password: string): Promise<string>;
}

const createCryptoUtils = (): CryptoUtils => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    async encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedValue> {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedText = encoder.encode(plaintext);
      
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedText
      );

      // Extract ciphertext and tag
      const cipherArray = new Uint8Array(cipherBuffer);
      const ciphertext = cipherArray.slice(0, -16);
      const tag = cipherArray.slice(-16);

      return {
        ciphertext: btoa(String.fromCharCode(...ciphertext)),
        iv: btoa(String.fromCharCode(...iv)),
        tag: btoa(String.fromCharCode(...tag)),
        algorithm: 'AES-256-GCM',
      };
    },

    async decrypt(encrypted: EncryptedValue, key: CryptoKey): Promise<string> {
      const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));
      const tag = Uint8Array.from(atob(encrypted.tag), c => c.charCodeAt(0));
      
      // Combine ciphertext and tag
      const combined = new Uint8Array(ciphertext.length + tag.length);
      combined.set(ciphertext);
      combined.set(tag, ciphertext.length);

      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        combined
      );

      return decoder.decode(plainBuffer);
    },

    async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt.buffer as ArrayBuffer,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    },

    generateSalt(): Uint8Array {
      return crypto.getRandomValues(new Uint8Array(16));
    },

    async hashPassword(password: string): Promise<string> {
      const encoded = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    },
  };
};

// ============================================
// SECURE VAULT CLASS
// ============================================

interface VaultConfig {
  autoLockTimeout: number;      // ms, 0 = never
  maxFailedAttempts: number;
  lockoutDuration: number;      // ms
  requireReauthFor: SecurityLevel[];
  persistToStorage: boolean;
  storageKey: string;
}

const DEFAULT_CONFIG: VaultConfig = {
  autoLockTimeout: 15 * 60 * 1000, // 15 minutes
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  requireReauthFor: ['critical'],
  persistToStorage: true,
  storageKey: 'aethel_secure_vault',
};

export class SecureVault extends EventEmitter {
  private config: VaultConfig;
  private crypto: CryptoUtils;
  
  // Vault state
  private isLocked: boolean = true;
  private masterKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private credentials: Map<string, StoredCredential> = new Map();
  private events: VaultEvent[] = [];
  
  // Security tracking
  private lastActivity: number = 0;
  private failedAttempts: number = 0;
  private lockoutUntil: number = 0;
  private autoLockTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<VaultConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.crypto = createCryptoUtils();
    this.setupAutoLock();
  }

  // ============================================
  // VAULT LIFECYCLE
  // ============================================

  /**
   * Initialize vault with master password
   * Creates new vault if doesn't exist
   */
  async initialize(masterPassword: string): Promise<{ success: boolean; isNew: boolean; error?: string }> {
    // Check lockout
    if (this.isLockedOut()) {
      const remaining = Math.ceil((this.lockoutUntil - Date.now()) / 60000);
      return { success: false, isNew: false, error: `Vault bloqueado. Tente novamente em ${remaining} minutos.` };
    }

    try {
      // Try to load existing vault
      const existingData = await this.loadFromStorage();
      
      if (existingData) {
        // Existing vault - verify password
        this.salt = Uint8Array.from(atob(existingData.salt), c => c.charCodeAt(0));
        this.masterKey = await this.crypto.deriveKey(masterPassword, this.salt);
        
        // Try to decrypt test value
        try {
          await this.crypto.decrypt(existingData.testValue, this.masterKey);
          
          // Load credentials
          for (const [id, encrypted] of Object.entries(existingData.credentials)) {
            this.credentials.set(id, await this.decryptCredential(encrypted as any));
          }
          
          this.isLocked = false;
          this.failedAttempts = 0;
          this.recordActivity();
          this.emitEvent('vault_unlocked', {});
          
          return { success: true, isNew: false };
        } catch {
          this.failedAttempts++;
          if (this.failedAttempts >= this.config.maxFailedAttempts) {
            this.lockoutUntil = Date.now() + this.config.lockoutDuration;
          }
          return { success: false, isNew: false, error: 'Senha incorreta.' };
        }
      } else {
        // New vault
        this.salt = this.crypto.generateSalt();
        this.masterKey = await this.crypto.deriveKey(masterPassword, this.salt);
        this.isLocked = false;
        this.recordActivity();
        
        // Save initial state
        await this.saveToStorage();
        this.emitEvent('vault_unlocked', { isNew: true });
        
        return { success: true, isNew: true };
      }
    } catch (error) {
      return { success: false, isNew: false, error: `Erro ao inicializar vault: ${error}` };
    }
  }

  /**
   * Lock the vault
   */
  lock(): void {
    this.isLocked = true;
    this.masterKey = null;
    this.credentials.clear();
    this.emitEvent('vault_locked', {});
    this.emit('locked');
  }

  /**
   * Check if vault is locked
   */
  isVaultLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Check if in lockout period
   */
  isLockedOut(): boolean {
    return Date.now() < this.lockoutUntil;
  }

  // ============================================
  // CREDENTIAL MANAGEMENT
  // ============================================

  /**
   * Store a new credential
   */
  async storeCredential(
    schemaId: string,
    name: string,
    values: Record<string, string>,
    userId: string
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    if (this.isLocked || !this.masterKey) {
      return { success: false, error: 'Vault está bloqueado.' };
    }

    const schema = CREDENTIAL_SCHEMAS[schemaId];
    if (!schema) {
      return { success: false, error: `Schema '${schemaId}' não encontrado.` };
    }

    // Validate required fields
    for (const field of schema.fields) {
      if (field.required && !values[field.id]) {
        return { success: false, error: `Campo obrigatório '${field.label}' não fornecido.` };
      }
      
      // Validate pattern if exists
      if (field.validation?.pattern && values[field.id]) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(values[field.id])) {
          return { success: false, error: `Campo '${field.label}' não está no formato esperado.` };
        }
      }
    }

    try {
      const credentialId = this.generateId();
      const encryptedValues: Record<string, EncryptedValue> = {};

      for (const [key, value] of Object.entries(values)) {
        encryptedValues[key] = await this.crypto.encrypt(value, this.masterKey);
      }

      const credential: StoredCredential = {
        id: credentialId,
        schemaId,
        userId,
        name,
        category: schema.category,
        values: encryptedValues,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          source: 'user_input',
          verified: false,
          usageCount: 0,
        },
      };

      if (schema.expiresIn) {
        credential.expiresAt = new Date(Date.now() + schema.expiresIn);
      }

      this.credentials.set(credentialId, credential);
      await this.saveToStorage();
      
      this.emitEvent('credential_provided', { credentialId, schemaId, name });
      this.recordActivity();

      return { success: true, credentialId };
    } catch (error) {
      return { success: false, error: `Erro ao armazenar credencial: ${error}` };
    }
  }

  /**
   * Get credential values (decrypted)
   */
  async getCredentialValues(
    credentialId: string,
    agentId: string,
    reason: string
  ): Promise<{ success: boolean; values?: Record<string, string>; error?: string }> {
    if (this.isLocked || !this.masterKey) {
      return { success: false, error: 'Vault está bloqueado.' };
    }

    const credential = this.credentials.get(credentialId);
    if (!credential) {
      return { success: false, error: 'Credencial não encontrada.' };
    }

    // Check expiration
    if (credential.expiresAt && new Date() > credential.expiresAt) {
      this.emitEvent('credential_expired', { credentialId });
      return { success: false, error: 'Credencial expirada.' };
    }

    try {
      const values: Record<string, string> = {};
      for (const [key, encrypted] of Object.entries(credential.values)) {
        values[key] = await this.crypto.decrypt(encrypted, this.masterKey);
      }

      // Update usage
      credential.lastUsedAt = new Date();
      credential.metadata.usageCount++;
      await this.saveToStorage();

      this.emitEvent('credential_used', { credentialId, agentId, reason });
      this.recordActivity();

      return { success: true, values };
    } catch (error) {
      return { success: false, error: `Erro ao decriptar credencial: ${error}` };
    }
  }

  /**
   * List all stored credentials (without sensitive values)
   */
  listCredentials(): StoredCredential[] {
    return Array.from(this.credentials.values()).map(cred => ({
      ...cred,
      values: {}, // Don't expose encrypted values in list
    }));
  }

  /**
   * Get credential by ID (without values)
   */
  getCredential(credentialId: string): StoredCredential | null {
    const cred = this.credentials.get(credentialId);
    if (!cred) return null;
    return { ...cred, values: {} };
  }

  /**
   * Check if credential exists for schema
   */
  hasCredentialForSchema(schemaId: string): boolean {
    return Array.from(this.credentials.values()).some(c => c.schemaId === schemaId);
  }

  /**
   * Get credentials by category
   */
  getCredentialsByCategory(category: CredentialCategory): StoredCredential[] {
    return Array.from(this.credentials.values())
      .filter(c => c.category === category)
      .map(c => ({ ...c, values: {} }));
  }

  /**
   * Delete a credential
   */
  async deleteCredential(credentialId: string): Promise<boolean> {
    if (this.isLocked) return false;
    
    const deleted = this.credentials.delete(credentialId);
    if (deleted) {
      await this.saveToStorage();
      this.emitEvent('credential_revoked', { credentialId });
    }
    return deleted;
  }

  /**
   * Update credential values
   */
  async updateCredential(
    credentialId: string,
    values: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isLocked || !this.masterKey) {
      return { success: false, error: 'Vault está bloqueado.' };
    }

    const credential = this.credentials.get(credentialId);
    if (!credential) {
      return { success: false, error: 'Credencial não encontrada.' };
    }

    try {
      const encryptedValues: Record<string, EncryptedValue> = {};
      for (const [key, value] of Object.entries(values)) {
        encryptedValues[key] = await this.crypto.encrypt(value, this.masterKey);
      }

      credential.values = { ...credential.values, ...encryptedValues };
      credential.updatedAt = new Date();
      await this.saveToStorage();
      
      this.recordActivity();
      return { success: true };
    } catch (error) {
      return { success: false, error: `Erro ao atualizar: ${error}` };
    }
  }

  // ============================================
  // EVENT LOGGING
  // ============================================

  private emitEvent(type: VaultEventType, details: Record<string, unknown>): void {
    const event: VaultEvent = {
      eventId: this.generateId(),
      type,
      timestamp: new Date(),
      userId: 'current_user', // Should be from context
      details,
      severity: this.getEventSeverity(type),
    };

    this.events.push(event);
    
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    this.emit('event', event);
  }

  private getEventSeverity(type: VaultEventType): VaultEvent['severity'] {
    const severityMap: Record<VaultEventType, VaultEvent['severity']> = {
      'credential_requested': 'info',
      'credential_provided': 'info',
      'credential_used': 'info',
      'credential_expired': 'warning',
      'credential_revoked': 'warning',
      'permission_requested': 'info',
      'permission_granted': 'info',
      'permission_denied': 'warning',
      'security_alert': 'critical',
      'vault_locked': 'info',
      'vault_unlocked': 'info',
    };
    return severityMap[type] || 'info';
  }

  getRecentEvents(limit: number = 50): VaultEvent[] {
    return this.events.slice(-limit);
  }

  // ============================================
  // STORAGE
  // ============================================

  private async saveToStorage(): Promise<void> {
    if (!this.config.persistToStorage || !this.masterKey || !this.salt) return;

    const testValue = await this.crypto.encrypt('vault_test', this.masterKey);
    
    const encryptedCredentials: Record<string, any> = {};
    for (const [id, cred] of this.credentials) {
      encryptedCredentials[id] = await this.encryptCredential(cred);
    }

    const data = {
      version: 1,
      salt: btoa(String.fromCharCode(...this.salt)),
      testValue,
      credentials: encryptedCredentials,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch {
      // Storage might not be available
      console.warn('Could not persist vault to storage');
    }
  }

  private async loadFromStorage(): Promise<any | null> {
    if (!this.config.persistToStorage) return null;

    try {
      const data = localStorage.getItem(this.config.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async encryptCredential(cred: StoredCredential): Promise<any> {
    if (!this.masterKey) throw new Error('Vault locked');
    
    const sensitiveData = JSON.stringify({
      values: cred.values,
      metadata: cred.metadata,
    });
    
    return {
      ...cred,
      values: undefined,
      metadata: undefined,
      encrypted: await this.crypto.encrypt(sensitiveData, this.masterKey),
    };
  }

  private async decryptCredential(encrypted: any): Promise<StoredCredential> {
    if (!this.masterKey) throw new Error('Vault locked');
    
    const decrypted = JSON.parse(await this.crypto.decrypt(encrypted.encrypted, this.masterKey));
    
    return {
      ...encrypted,
      values: decrypted.values,
      metadata: decrypted.metadata,
      encrypted: undefined,
      createdAt: new Date(encrypted.createdAt),
      updatedAt: new Date(encrypted.updatedAt),
      lastUsedAt: encrypted.lastUsedAt ? new Date(encrypted.lastUsedAt) : undefined,
      expiresAt: encrypted.expiresAt ? new Date(encrypted.expiresAt) : undefined,
    };
  }

  // ============================================
  // AUTO-LOCK
  // ============================================

  private setupAutoLock(): void {
    if (this.config.autoLockTimeout <= 0) return;

    this.autoLockTimer = setInterval(() => {
      if (!this.isLocked && Date.now() - this.lastActivity > this.config.autoLockTimeout) {
        this.lock();
      }
    }, 60000); // Check every minute
  }

  private recordActivity(): void {
    this.lastActivity = Date.now();
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export vault (encrypted) for backup
   */
  async exportVault(): Promise<string | null> {
    if (this.isLocked) return null;
    
    try {
      const data = localStorage.getItem(this.config.storageKey);
      return data ? btoa(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Import vault from backup
   */
  async importVault(encoded: string, masterPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = JSON.parse(atob(encoded));
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
      return await this.initialize(masterPassword);
    } catch (error) {
      return { success: false, error: `Erro ao importar: ${error}` };
    }
  }

  /**
   * Change master password
   */
  async changeMasterPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (this.isLocked) {
      return { success: false, error: 'Vault está bloqueado.' };
    }

    // Verify current password
    const currentKey = await this.crypto.deriveKey(currentPassword, this.salt!);
    try {
      const testData = await this.loadFromStorage();
      await this.crypto.decrypt(testData.testValue, currentKey);
    } catch {
      return { success: false, error: 'Senha atual incorreta.' };
    }

    // Create new key
    this.salt = this.crypto.generateSalt();
    this.masterKey = await this.crypto.deriveKey(newPassword, this.salt);
    
    // Re-encrypt all credentials
    const newCredentials = new Map<string, StoredCredential>();
    for (const [id, cred] of this.credentials) {
      // Values are already in memory decrypted form
      const newEncryptedValues: Record<string, EncryptedValue> = {};
      for (const [key, encrypted] of Object.entries(cred.values)) {
        const decrypted = await this.crypto.decrypt(encrypted, currentKey);
        newEncryptedValues[key] = await this.crypto.encrypt(decrypted, this.masterKey);
      }
      newCredentials.set(id, { ...cred, values: newEncryptedValues });
    }
    this.credentials = newCredentials;
    
    await this.saveToStorage();
    return { success: true };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.autoLockTimer) {
      clearInterval(this.autoLockTimer);
    }
    this.lock();
    this.removeAllListeners();
  }
}
