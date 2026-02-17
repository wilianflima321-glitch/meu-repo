/**
 * Asset Drag-Drop Integration
 * 
 * Conecta o Content Browser ao Scene Editor via drag-and-drop.
 * Permite arrastar assets e soltá-los no viewport 3D.
 */

import { useCallback, useRef } from 'react';
import type { Asset, DragData } from '../components/assets/ContentBrowser';

// ============================================================================
// TYPES
// ============================================================================

export interface SceneObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'prefab' | 'audio' | 'blueprint';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  assetPath?: string;
  assetId?: string;
  metadata?: Record<string, unknown>;
}

interface DropResult {
  success: boolean;
  sceneObject?: SceneObject;
  error?: string;
}

interface DropHandlerOptions {
  worldPosition?: { x: number; y: number; z: number };
  screenPosition?: { x: number; y: number };
  targetObject?: SceneObject;
}

type OnDropCallback = (sceneObject: SceneObject) => void;
type OnErrorCallback = (error: string) => void;

// ============================================================================
// ASSET TO SCENE OBJECT MAPPING
// ============================================================================

const assetTypeToSceneType: Record<string, SceneObject['type']> = {
  mesh: 'mesh',
  prefab: 'prefab',
  audio: 'audio',
  blueprint: 'blueprint',
  texture: 'mesh', // Texture -> Plane com material
  material: 'mesh',
  animation: 'mesh',
  level: 'empty',
  video: 'mesh', // Video -> Plane com video texture
  folder: 'empty',
  other: 'empty',
};

const defaultGeometryForType: Record<string, string> = {
  mesh: 'imported',
  texture: 'plane',
  material: 'sphere',
  video: 'plane',
  audio: 'sphere',
  blueprint: 'cube',
  prefab: 'imported',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseAssetName(filename: string): string {
  // Remove extensão e converte underscores/hyphens em espaços
  const name = filename.replace(/\.[^/.]+$/, '');
  return name.replace(/[_-]/g, ' ');
}

function createSceneObjectFromAsset(
  asset: Asset,
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
): SceneObject {
  return {
    id: generateId(),
    name: parseAssetName(asset.name),
    type: assetTypeToSceneType[asset.type] || 'empty',
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    assetPath: asset.path,
    assetId: asset.id,
    metadata: {
      originalAsset: asset,
      geometry: defaultGeometryForType[asset.type],
      importedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para gerenciar drag-drop de assets no viewport
 */
export function useAssetDrop(
  onDrop: OnDropCallback,
  onError?: OnErrorCallback
) {
  const isDraggingRef = useRef(false);
  const dropTargetRef = useRef<HTMLElement | null>(null);

  /**
   * Handler para quando um item entra na zona de drop
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    
    // Visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.outline = '2px solid #6366f1';
      e.currentTarget.style.outlineOffset = '-2px';
    }
  }, []);

  /**
   * Handler para quando um item está sobre a zona de drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  /**
   * Handler para quando um item sai da zona de drop
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = false;
    
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.outline = '';
      e.currentTarget.style.outlineOffset = '';
    }
  }, []);

  /**
   * Handler para quando um item é solto
   */
  const handleDrop = useCallback((e: React.DragEvent, options?: DropHandlerOptions) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = false;

    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.outline = '';
      e.currentTarget.style.outlineOffset = '';
    }

    try {
      // Tenta ler dados JSON do drag
      const jsonData = e.dataTransfer.getData('application/json');
      
      if (!jsonData) {
        // Tenta ler arquivos nativos
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          onError?.('NATIVE_FILE_DROP_GATED: use Content Browser upload before dragging into scene.');
          return;
        }
        
        onError?.('No valid asset data found in drop');
        return;
      }

      const dragData: DragData = JSON.parse(jsonData);
      
      if (dragData.type !== 'asset') {
        onError?.(`Invalid drag type: ${dragData.type}`);
        return;
      }

      const { asset } = dragData;

      // Calcula posição baseado nas coordenadas do mouse
      let worldPos = options?.worldPosition || { x: 0, y: 0, z: 0 };
      
      if (!options?.worldPosition && options?.screenPosition) {
        const target = e.currentTarget as HTMLElement | null;
        if (target) {
          const rect = target.getBoundingClientRect();
          const normalizedX = (options.screenPosition.x - rect.left) / Math.max(rect.width, 1);
          const normalizedY = (options.screenPosition.y - rect.top) / Math.max(rect.height, 1);
          worldPos = {
            x: (normalizedX - 0.5) * 20,
            y: 0,
            z: (normalizedY - 0.5) * -20,
          };
        }
      }

      // Cria o objeto de cena
      const sceneObject = createSceneObjectFromAsset(asset, worldPos);
      
      // Notifica callback
      onDrop(sceneObject);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during drop';
      onError?.(message);
    }
  }, [onDrop, onError]);

  /**
   * Retorna props para aplicar ao elemento drop target
   */
  const getDropTargetProps = useCallback(() => ({
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }), [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  return {
    isDragging: isDraggingRef.current,
    dropTargetRef,
    getDropTargetProps,
    handleDrop,
  };
}

/**
 * Hook para gerenciar drag de assets do Content Browser
 */
export function useAssetDrag() {
  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    const dragData: DragData = { type: 'asset', asset };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Cria imagem fantasma customizada
    const ghost = document.createElement('div');
    ghost.style.cssText = `
      padding: 8px 12px;
      background: #16161d;
      border: 1px solid #6366f1;
      border-radius: 6px;
      color: #e4e4eb;
      font-size: 12px;
      font-family: system-ui;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      position: absolute;
      top: -1000px;
    `;
    ghost.textContent = asset.name;
    document.body.appendChild(ghost);
    
    e.dataTransfer.setDragImage(ghost, 0, 0);
    
    // Remove ghost após drag
    requestAnimationFrame(() => {
      document.body.removeChild(ghost);
    });
  }, []);

  return { handleDragStart };
}

// ============================================================================
// SCENE INTEGRATION
// ============================================================================

/**
 * Serviço para integrar assets à cena 3D
 */
export class SceneAssetIntegration {
  private sceneObjects: Map<string, SceneObject> = new Map();
  private listeners: Set<(objects: SceneObject[]) => void> = new Set();

  /**
   * Adiciona um objeto à cena
   */
  addObject(obj: SceneObject): void {
    this.sceneObjects.set(obj.id, obj);
    this.notifyListeners();
  }

  /**
   * Remove um objeto da cena
   */
  removeObject(id: string): boolean {
    const deleted = this.sceneObjects.delete(id);
    if (deleted) this.notifyListeners();
    return deleted;
  }

  /**
   * Atualiza um objeto existente
   */
  updateObject(id: string, updates: Partial<SceneObject>): SceneObject | null {
    const obj = this.sceneObjects.get(id);
    if (!obj) return null;
    
    const updated = { ...obj, ...updates };
    this.sceneObjects.set(id, updated);
    this.notifyListeners();
    return updated;
  }

  /**
   * Retorna todos os objetos
   */
  getObjects(): SceneObject[] {
    return Array.from(this.sceneObjects.values());
  }

  /**
   * Retorna um objeto por ID
   */
  getObject(id: string): SceneObject | undefined {
    return this.sceneObjects.get(id);
  }

  /**
   * Inscreve para atualizações
   */
  subscribe(callback: (objects: SceneObject[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const objects = this.getObjects();
    this.listeners.forEach(cb => cb(objects));
  }

  /**
   * Limpa todos os objetos
   */
  clear(): void {
    this.sceneObjects.clear();
    this.notifyListeners();
  }

  /**
   * Serializa a cena para JSON
   */
  serialize(): string {
    return JSON.stringify(this.getObjects(), null, 2);
  }

  /**
   * Carrega objetos de JSON
   */
  deserialize(json: string): void {
    try {
      const objects: SceneObject[] = JSON.parse(json);
      this.sceneObjects.clear();
      objects.forEach(obj => this.sceneObjects.set(obj.id, obj));
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to deserialize scene:', err);
    }
  }
}

// Singleton global para integração
export const sceneIntegration = new SceneAssetIntegration();

// ============================================================================
// EXPORTS
// ============================================================================

export type { DropResult, DropHandlerOptions, OnDropCallback, OnErrorCallback };
export { createSceneObjectFromAsset, generateId };
