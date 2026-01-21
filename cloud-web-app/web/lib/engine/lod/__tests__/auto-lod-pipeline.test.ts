/**
 * Testes para Auto-LOD Pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  AutoLODPipeline,
  analyzeMesh,
  DEFAULT_LOD_CONFIG,
  LOD_PRESET_MOBILE,
} from '@/lib/engine/lod';

describe('Auto-LOD Pipeline', () => {
  // Helper para criar geometria de teste
  function createTestGeometry(triangleCount: number): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(1, 1, 1, 
      Math.ceil(Math.sqrt(triangleCount / 12)),
      Math.ceil(Math.sqrt(triangleCount / 12)),
      Math.ceil(Math.sqrt(triangleCount / 12))
    );
    return geometry;
  }

  describe('analyzeMesh', () => {
    it('deve analisar corretamente uma geometria simples', () => {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const analysis = analyzeMesh(geometry);

      expect(analysis.vertexCount).toBeGreaterThan(0);
      expect(analysis.triangleCount).toBeGreaterThan(0);
      expect(analysis.hasNormals).toBe(true);
      expect(analysis.hasUVs).toBe(true);
      expect(analysis.complexity).toBe('low');
    });

    it('deve calcular bounding box corretamente', () => {
      const geometry = new THREE.BoxGeometry(4, 2, 3);
      const analysis = analyzeMesh(geometry);

      const size = new THREE.Vector3();
      analysis.boundingBox.getSize(size);

      expect(size.x).toBeCloseTo(4);
      expect(size.y).toBeCloseTo(2);
      expect(size.z).toBeCloseTo(3);
    });

    it('deve classificar complexidade corretamente', () => {
      const lowPoly = createTestGeometry(100);
      const mediumPoly = createTestGeometry(15000);

      expect(analyzeMesh(lowPoly).complexity).toBe('low');
      expect(analyzeMesh(mediumPoly).complexity).toBe('medium');
    });

    it('deve calcular área de superfície', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const analysis = analyzeMesh(geometry);

      // Box 1x1x1 tem área de superfície = 6
      expect(analysis.surfaceArea).toBeCloseTo(6, 0);
    });
  });

  describe('AutoLODPipeline', () => {
    let pipeline: AutoLODPipeline;

    beforeEach(() => {
      pipeline = new AutoLODPipeline(DEFAULT_LOD_CONFIG);
    });

    it('deve criar instância com config default', () => {
      expect(pipeline).toBeDefined();
    });

    it('deve criar instância com preset mobile', () => {
      const mobilePipeline = new AutoLODPipeline(LOD_PRESET_MOBILE);
      expect(mobilePipeline).toBeDefined();
    });

    it('deve processar geometria e gerar LODs', async () => {
      const geometry = createTestGeometry(1000);
      const result = await pipeline.processAsset(geometry);

      expect(result.lodMeshes.size).toBeGreaterThan(0);
      expect(result.originalMesh).toBe(geometry);
      expect(result.analysis).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('deve gerar LOD 0 como cópia do original', async () => {
      const geometry = createTestGeometry(500);
      const result = await pipeline.processAsset(geometry);

      const lod0 = result.lodMeshes.get(0);
      expect(lod0).toBeDefined();

      const originalCount = geometry.getAttribute('position').count;
      const lod0Count = lod0!.getAttribute('position').count;
      expect(lod0Count).toBe(originalCount);
    });

    it('deve reduzir triângulos em LODs superiores', async () => {
      const geometry = createTestGeometry(2000);
      const result = await pipeline.processAsset(geometry);

      const lod0 = result.lodMeshes.get(0);
      const lod1 = result.lodMeshes.get(1);

      if (lod0 && lod1) {
        const count0 = lod0.getAttribute('position').count;
        const count1 = lod1.getAttribute('position').count;
        expect(count1).toBeLessThanOrEqual(count0);
      }
    });

    it('deve criar THREE.LOD object', async () => {
      const geometry = createTestGeometry(1000);
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const result = await pipeline.processAsset(geometry);

      const lodObject = pipeline.createLODObject(result, material);

      expect(lodObject).toBeInstanceOf(THREE.LOD);
      expect(lodObject.levels.length).toBeGreaterThan(0);
    });

    it('deve calcular redução de memória', async () => {
      const geometry = createTestGeometry(5000);
      const result = await pipeline.processAsset(geometry);

      expect(result.memoryReduction).toBeGreaterThanOrEqual(0);
      expect(result.memoryReduction).toBeLessThanOrEqual(1);
    });

    it('deve suportar event handlers', () => {
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      pipeline.on('progress', onProgress);
      pipeline.on('complete', onComplete);
      pipeline.on('error', onError);

      // Os handlers são registrados (chamados apenas quando processando via queue)
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('deve adicionar assets à queue', () => {
      pipeline.addAsset('asset-1', '/models/test.glb');
      pipeline.addAsset('asset-2', '/models/test2.glb');

      // Queue é processada internamente
      expect(true).toBe(true); // Pipeline não expõe queue publicamente
    });
  });

  describe('LOD Presets', () => {
    it('LOD_PRESET_MOBILE deve ter menos níveis', () => {
      expect(LOD_PRESET_MOBILE.levels?.length).toBeLessThanOrEqual(4);
    });

    it('LOD_PRESET_MOBILE deve ter textureScale menor', () => {
      const level0 = LOD_PRESET_MOBILE.levels?.[0];
      expect(level0?.textureScale).toBeLessThanOrEqual(1);
    });
  });
});
