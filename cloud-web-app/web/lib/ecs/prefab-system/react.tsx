'use client';

import type * as THREE from 'three';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ComponentRegistry } from './component-registry';
import { EntityManager } from './entity-manager';
import { PrefabManager } from './prefab-manager';
import { type Component, type ComponentData, type ComponentType, type Entity, type EntityId, type PrefabData } from './types';

// ============================================================================



interface ECSContextValue {
  componentRegistry: ComponentRegistry;
  entityManager: EntityManager;
  prefabManager: PrefabManager;
}

const ECSContext = createContext<ECSContextValue | null>(null);

export function ECSProvider({ children }: { children: ReactNode }) {
  const valueRef = useRef<ECSContextValue | null>(null);
  
  if (!valueRef.current) {
    const componentRegistry = new ComponentRegistry();
    const entityManager = new EntityManager(componentRegistry);
    const prefabManager = new PrefabManager(entityManager, componentRegistry);
    
    valueRef.current = {
      componentRegistry,
      entityManager,
      prefabManager,
    };
  }
  
  return (
    <ECSContext.Provider value={valueRef.current}>
      {children}
    </ECSContext.Provider>
  );
}

export function useECS(): ECSContextValue {
  const context = useContext(ECSContext);
  if (!context) {
    throw new Error('useECS must be used within an ECSProvider');
  }
  return context;
}

export function useEntity(entityId: EntityId) {
  const { entityManager } = useECS();
  const [entity, setEntity] = useState<Entity | undefined>(() => 
    entityManager.getEntity(entityId)
  );
  
  useEffect(() => {
    const handleChange = () => {
      setEntity(entityManager.getEntity(entityId));
    };
    
    entityManager.on('entityCreated', handleChange);
    entityManager.on('entityDestroyed', handleChange);
    entityManager.on('componentAttached', handleChange);
    entityManager.on('componentDetached', handleChange);
    
    return () => {
      entityManager.off('entityCreated', handleChange);
      entityManager.off('entityDestroyed', handleChange);
      entityManager.off('componentAttached', handleChange);
      entityManager.off('componentDetached', handleChange);
    };
  }, [entityManager, entityId]);
  
  return entity;
}

export function useComponent<T extends ComponentData>(
  entity: Entity | undefined,
  componentType: ComponentType
): Component<T> | undefined {
  const [component, setComponent] = useState<Component<T> | undefined>(
    () => entity?.components.get(componentType) as Component<T> | undefined
  );
  
  useEffect(() => {
    if (entity) {
      setComponent(entity.components.get(componentType) as Component<T> | undefined);
    }
  }, [entity, componentType]);
  
  return component;
}

export function usePrefabs() {
  const { prefabManager } = useECS();
  const [prefabs, setPrefabs] = useState<PrefabData[]>(() => prefabManager.getAllPrefabs());
  
  useEffect(() => {
    const updatePrefabs = () => {
      setPrefabs(prefabManager.getAllPrefabs());
    };
    
    prefabManager.on('prefabCreated', updatePrefabs);
    prefabManager.on('prefabUpdated', updatePrefabs);
    prefabManager.on('prefabDeleted', updatePrefabs);
    prefabManager.on('prefabImported', updatePrefabs);
    prefabManager.on('prefabsLoaded', updatePrefabs);
    
    return () => {
      prefabManager.off('prefabCreated', updatePrefabs);
      prefabManager.off('prefabUpdated', updatePrefabs);
      prefabManager.off('prefabDeleted', updatePrefabs);
      prefabManager.off('prefabImported', updatePrefabs);
      prefabManager.off('prefabsLoaded', updatePrefabs);
    };
  }, [prefabManager]);
  
  const createPrefab = useCallback((entity: Entity, name: string, description?: string) => {
    return prefabManager.createPrefab(entity, name, description);
  }, [prefabManager]);
  
  const instantiate = useCallback((
    prefabId: string,
    position?: THREE.Vector3,
    rotation?: THREE.Quaternion,
    parent?: Entity
  ) => {
    return prefabManager.instantiate(prefabId, position, rotation, parent);
  }, [prefabManager]);
  
  const deletePrefab = useCallback((prefabId: string) => {
    prefabManager.deletePrefab(prefabId);
  }, [prefabManager]);
  
  return {
    prefabs,
    createPrefab,
    instantiate,
    deletePrefab,
    exportPrefab: (id: string) => prefabManager.exportPrefab(id),
    importPrefab: (json: string) => prefabManager.importPrefab(json),
    savePrefabsToFile: () => prefabManager.savePrefabsToFile(),
    loadPrefabsFromFile: () => prefabManager.loadPrefabsFromFile(),
  };
}
