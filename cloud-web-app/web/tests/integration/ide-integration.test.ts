/**
 * IDE Integration Tests
 * End-to-end tests for IDE initialization and system integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getIDEIntegration, resetIDEIntegration } from '../../lib/integration';

describe('IDE Integration', () => {
  const config = {
    workspaceRoot: '/test/workspace',
    userId: 'test-user',
    projectId: 'test-project',
    enableAI: true,
    enableTelemetry: false,
  };

  beforeAll(async () => {
    resetIDEIntegration();
  });

  afterAll(async () => {
    const ide = getIDEIntegration(config);
    if (ide.isInitialized()) {
      await ide.shutdown();
    }
    resetIDEIntegration();
  });

  describe('Initialization', () => {
    it('should initialize IDE with config', async () => {
      const ide = getIDEIntegration(config);
      expect(ide).toBeDefined();
      expect(ide.isInitialized()).toBe(false);

      await ide.initialize();
      expect(ide.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      const ide = getIDEIntegration(config);
      await ide.initialize();
      
      // Second initialization should be no-op
      await ide.initialize();
      expect(ide.isInitialized()).toBe(true);
    });

    it('should return config', () => {
      const ide = getIDEIntegration(config);
      const returnedConfig = ide.getConfig();
      expect(returnedConfig).toEqual(config);
    });

    it('should update config', () => {
      const ide = getIDEIntegration(config);
      ide.updateConfig({ enableAI: false });
      
      const updatedConfig = ide.getConfig();
      expect(updatedConfig.enableAI).toBe(false);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      const ide = getIDEIntegration(config);
      await ide.initialize();
      
      await ide.shutdown();
      expect(ide.isInitialized()).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const ide1 = getIDEIntegration(config);
      const ide2 = getIDEIntegration();
      expect(ide1).toBe(ide2);
    });

    it('should reset instance', () => {
      const ide1 = getIDEIntegration(config);
      resetIDEIntegration();
      
      const ide2 = getIDEIntegration(config);
      expect(ide1).not.toBe(ide2);
    });
  });
});
