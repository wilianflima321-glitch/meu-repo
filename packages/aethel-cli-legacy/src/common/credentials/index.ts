/**
 * ============================================
 * AETHEL ENGINE - Credentials Module
 * ============================================
 * 
 * Sistema unificado de gerenciamento de credenciais
 * para todos os agentes da plataforma.
 */

// Types
export * from './credential-types';

// Core
export { SecureVault } from './secure-vault';
export { CredentialFlowManager, REGISTERED_AGENTS } from './credential-flow-manager';
export { CredentialUIController } from './credential-ui-controller';

// Re-export schemas
export { CREDENTIAL_SCHEMAS } from './credential-types';
