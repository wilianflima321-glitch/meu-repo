/**
 * Material Editor - split runtime modules.
 *
 * Three.js material factory and editor state stay behind Studio/material routes
 * instead of public route imports.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MaterialEditor } from './editor';
import type { MaterialSettings, TextureSlot } from './types';

export function useMaterialEditor() {
  const editorRef = useRef<MaterialEditor>(new MaterialEditor());
  const [materials, setMaterials] = useState<MaterialSettings[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  useEffect(() => {
    const editor = editorRef.current;
    
    const updateMaterials = () => setMaterials(editor.getAllMaterials());
    
    editor.on('materialCreated', updateMaterials);
    editor.on('materialUpdated', updateMaterials);
    editor.on('materialDeleted', updateMaterials);
    editor.on('activeMaterialChanged', ({ id }) => setActiveMaterialId(id));
    editor.on('historyChanged', ({ canUndo: u, canRedo: r }) => {
      setCanUndo(u);
      setCanRedo(r);
    });
    
    return () => {
      editor.removeAllListeners();
      editor.dispose();
    };
  }, []);
  
  const activeMaterial = useMemo(() => {
    return materials.find(m => m.id === activeMaterialId) || null;
  }, [materials, activeMaterialId]);
  
  const presetsByCategory = useMemo(() => {
    return editorRef.current.getPresetsByCategory();
  }, []);
  
  const createMaterial = useCallback((name?: string) => {
    return editorRef.current.createMaterial(name);
  }, []);
  
  const deleteMaterial = useCallback((id: string) => {
    editorRef.current.deleteMaterial(id);
  }, []);
  
  const duplicateMaterial = useCallback((id: string) => {
    return editorRef.current.duplicateMaterial(id);
  }, []);
  
  const updateMaterial = useCallback((id: string, updates: Partial<MaterialSettings>) => {
    editorRef.current.updateMaterial(id, updates);
  }, []);
  
  const setTexture = useCallback(async (id: string, slot: TextureSlot, uri: string) => {
    await editorRef.current.setTexture(id, slot, uri);
  }, []);
  
  const removeTexture = useCallback((id: string, slot: TextureSlot) => {
    editorRef.current.removeTexture(id, slot);
  }, []);
  
  const applyPreset = useCallback((id: string, presetId: string) => {
    editorRef.current.applyPreset(id, presetId);
  }, []);
  
  const undo = useCallback(() => {
    editorRef.current.undo();
  }, []);
  
  const redo = useCallback(() => {
    editorRef.current.redo();
  }, []);
  
  const getMaterial = useCallback(async (id: string) => {
    return editorRef.current.getMaterial(id);
  }, []);
  
  return {
    editor: editorRef.current,
    materials,
    activeMaterial,
    activeMaterialId,
    presetsByCategory,
    canUndo,
    canRedo,
    createMaterial,
    deleteMaterial,
    duplicateMaterial,
    updateMaterial,
    setTexture,
    removeTexture,
    applyPreset,
    setActiveMaterial: (id: string | null) => editorRef.current.setActiveMaterial(id),
    undo,
    redo,
    getMaterial,
    exportMaterial: (id: string) => editorRef.current.exportMaterial(id),
    importMaterial: (json: string) => editorRef.current.importMaterial(json),
  };
}
