/**
 * AETHEL ENGINE - Project State Manager
 * 
 * Sistema robusto de persistência e recuperação de estado do projeto.
 * Permite "Load Project" com restauração completa do estado da UI.
 * 
 * Features:
 * - Auto-save periódico
 * - Recuperação de crash
 * - Versionamento de snapshots
 * - Sincronização com backend
 * - Undo/Redo global
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback,
  useRef,
  useState
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectNode {
  id: string;
  type: string;
  name: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  properties: Record<string, any>;
  children?: string[];
  parent?: string;
}

export interface SceneState {
  nodes: Record<string, ProjectNode>;
  rootNodes: string[];
  selectedNodes: string[];
  activeCamera?: string;
}

export interface EditorState {
  activeFile?: string;
  openFiles: string[];
  cursorPositions: Record<string, { line: number; column: number }>;
  foldedRegions: Record<string, number[]>;
}

export interface ViewportState {
  camera: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    fov: number;
  };
  gridVisible: boolean;
  wireframeMode: boolean;
  selectedTool: string;
}

export interface ProjectState {
  version: number;
  projectId: string;
  projectName: string;
  lastModified: string;
  scene: SceneState;
  editor: EditorState;
  viewport: ViewportState;
  panels: {
    layout: string;
    sizes: Record<string, number>;
    collapsed: string[];
  };
  preferences: {
    autoSave: boolean;
    autoSaveInterval: number;
    theme: string;
  };
  metadata: {
    createdAt: string;
    modifiedAt: string;
    author?: string;
    tags?: string[];
  };
}

export interface StateSnapshot {
  id: string;
  state: ProjectState;
  timestamp: Date;
  label?: string;
  auto: boolean;
}

type StateAction =
  | { type: 'LOAD_STATE'; payload: Partial<ProjectState> }
  | { type: 'UPDATE_SCENE'; payload: Partial<SceneState> }
  | { type: 'UPDATE_EDITOR'; payload: Partial<EditorState> }
  | { type: 'UPDATE_VIEWPORT'; payload: Partial<ViewportState> }
  | { type: 'UPDATE_PANELS'; payload: Partial<ProjectState['panels']> }
  | { type: 'ADD_NODE'; payload: ProjectNode }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<ProjectNode> } }
  | { type: 'DELETE_NODES'; payload: string[] }
  | { type: 'SELECT_NODES'; payload: string[] }
  | { type: 'SET_ACTIVE_FILE'; payload: string | undefined }
  | { type: 'OPEN_FILE'; payload: string }
  | { type: 'CLOSE_FILE'; payload: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

// ============================================================================
// DEFAULT STATE
// ============================================================================

const defaultState: ProjectState = {
  version: 1,
  projectId: '',
  projectName: 'Untitled Project',
  lastModified: new Date().toISOString(),
  scene: {
    nodes: {},
    rootNodes: [],
    selectedNodes: [],
  },
  editor: {
    openFiles: [],
    cursorPositions: {},
    foldedRegions: {},
  },
  viewport: {
    camera: {
      position: { x: 0, y: 5, z: 10 },
      rotation: { x: -15, y: 0, z: 0 },
      fov: 60,
    },
    gridVisible: true,
    wireframeMode: false,
    selectedTool: 'select',
  },
  panels: {
    layout: 'default',
    sizes: {},
    collapsed: [],
  },
  preferences: {
    autoSave: true,
    autoSaveInterval: 60000,
    theme: 'dark',
  },
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  },
};

// ============================================================================
// REDUCER
// ============================================================================

function projectReducer(state: ProjectState, action: StateAction): ProjectState {
  const now = new Date().toISOString();
  
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...defaultState,
        ...action.payload,
        metadata: {
          ...defaultState.metadata,
          ...action.payload.metadata,
          modifiedAt: now,
        },
      };

    case 'UPDATE_SCENE':
      return {
        ...state,
        scene: { ...state.scene, ...action.payload },
        lastModified: now,
      };

    case 'UPDATE_EDITOR':
      return {
        ...state,
        editor: { ...state.editor, ...action.payload },
        lastModified: now,
      };

    case 'UPDATE_VIEWPORT':
      return {
        ...state,
        viewport: { ...state.viewport, ...action.payload },
        lastModified: now,
      };

    case 'UPDATE_PANELS':
      return {
        ...state,
        panels: { ...state.panels, ...action.payload },
        lastModified: now,
      };

    case 'ADD_NODE': {
      const node = action.payload;
      const nodes = { ...state.scene.nodes, [node.id]: node };
      const rootNodes = node.parent 
        ? state.scene.rootNodes 
        : [...state.scene.rootNodes, node.id];
      
      return {
        ...state,
        scene: { ...state.scene, nodes, rootNodes },
        lastModified: now,
      };
    }

    case 'UPDATE_NODE': {
      const { id, updates } = action.payload;
      if (!state.scene.nodes[id]) return state;
      
      return {
        ...state,
        scene: {
          ...state.scene,
          nodes: {
            ...state.scene.nodes,
            [id]: { ...state.scene.nodes[id], ...updates },
          },
        },
        lastModified: now,
      };
    }

    case 'DELETE_NODES': {
      const idsToDelete = new Set(action.payload);
      const nodes = { ...state.scene.nodes };
      const rootNodes = state.scene.rootNodes.filter(id => !idsToDelete.has(id));
      
      for (const id of idsToDelete) {
        delete nodes[id];
      }
      
      return {
        ...state,
        scene: {
          ...state.scene,
          nodes,
          rootNodes,
          selectedNodes: state.scene.selectedNodes.filter(id => !idsToDelete.has(id)),
        },
        lastModified: now,
      };
    }

    case 'SELECT_NODES':
      return {
        ...state,
        scene: { ...state.scene, selectedNodes: action.payload },
      };

    case 'SET_ACTIVE_FILE':
      return {
        ...state,
        editor: { ...state.editor, activeFile: action.payload },
      };

    case 'OPEN_FILE': {
      const file = action.payload;
      if (state.editor.openFiles.includes(file)) {
        return {
          ...state,
          editor: { ...state.editor, activeFile: file },
        };
      }
      return {
        ...state,
        editor: {
          ...state.editor,
          openFiles: [...state.editor.openFiles, file],
          activeFile: file,
        },
      };
    }

    case 'CLOSE_FILE': {
      const file = action.payload;
      const openFiles = state.editor.openFiles.filter(f => f !== file);
      const activeFile = state.editor.activeFile === file
        ? openFiles[openFiles.length - 1]
        : state.editor.activeFile;
      
      return {
        ...state,
        editor: { ...state.editor, openFiles, activeFile },
      };
    }

    case 'RESET':
      return { ...defaultState };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ProjectContextValue {
  state: ProjectState;
  dispatch: React.Dispatch<StateAction>;
  // Actions
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  createSnapshot: (label?: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  listSnapshots: () => StateSnapshot[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Status
  isDirty: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ProjectProviderProps {
  children: React.ReactNode;
  apiEndpoint?: string;
  projectId?: string;
}

export const ProjectStateProvider: React.FC<ProjectProviderProps> = ({
  children,
  apiEndpoint = '/api',
  projectId,
}) => {
  const [state, dispatch] = useReducer(projectReducer, defaultState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Undo/Redo stacks
  const undoStack = useRef<ProjectState[]>([]);
  const redoStack = useRef<ProjectState[]>([]);
  const maxUndoSize = 50;
  
  // Snapshots
  const snapshots = useRef<StateSnapshot[]>([]);
  const maxSnapshots = 20;
  
  // Track if state is dirty (unsaved changes)
  const savedStateRef = useRef<string>('');
  const isDirty = JSON.stringify(state) !== savedStateRef.current;
  
  // Auto-save timer
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // ==========================================================================
  // UNDO/REDO
  // ==========================================================================

  const pushUndo = useCallback((prevState: ProjectState) => {
    undoStack.current.push(prevState);
    if (undoStack.current.length > maxUndoSize) {
      undoStack.current.shift();
    }
    redoStack.current = []; // Clear redo on new action
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    
    redoStack.current.push(state);
    const prevState = undoStack.current.pop()!;
    dispatch({ type: 'LOAD_STATE', payload: prevState });
  }, [state]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    
    undoStack.current.push(state);
    const nextState = redoStack.current.pop()!;
    dispatch({ type: 'LOAD_STATE', payload: nextState });
  }, [state]);

  // ==========================================================================
  // SNAPSHOTS
  // ==========================================================================

  const createSnapshot = useCallback((label?: string, auto = false) => {
    const snapshot: StateSnapshot = {
      id: crypto.randomUUID(),
      state: { ...state },
      timestamp: new Date(),
      label,
      auto,
    };
    
    snapshots.current.push(snapshot);
    
    // Remove old auto-snapshots if exceeding limit
    const autoSnapshots = snapshots.current.filter(s => s.auto);
    if (autoSnapshots.length > maxSnapshots) {
      const oldest = autoSnapshots[0];
      snapshots.current = snapshots.current.filter(s => s.id !== oldest.id);
    }
    
    // Persist to localStorage
    try {
      const key = `aethel-snapshots-${state.projectId}`;
      localStorage.setItem(key, JSON.stringify(snapshots.current.slice(-10)));
    } catch { /* ignore quota exceeded */ }
    
    return snapshot.id;
  }, [state]);

  const restoreSnapshot = useCallback((snapshotId: string) => {
    const snapshot = snapshots.current.find(s => s.id === snapshotId);
    if (!snapshot) return;
    
    pushUndo(state);
    dispatch({ type: 'LOAD_STATE', payload: snapshot.state });
  }, [state, pushUndo]);

  const listSnapshots = useCallback(() => {
    return [...snapshots.current];
  }, []);

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  const loadProject = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from server
      const response = await fetch(`${apiEndpoint}/projects/${id}/state`);
      
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'LOAD_STATE', payload: { ...data, projectId: id } });
        savedStateRef.current = JSON.stringify(data);
        setLastSaved(new Date(data.lastModified));
      } else {
        // Try to load from localStorage (offline mode)
        const localData = localStorage.getItem(`aethel-project-${id}`);
        if (localData) {
          const data = JSON.parse(localData);
          dispatch({ type: 'LOAD_STATE', payload: { ...data, projectId: id } });
          savedStateRef.current = JSON.stringify(data);
          setLastSaved(new Date(data.lastModified));
        } else {
          // New project
          dispatch({ type: 'LOAD_STATE', payload: { ...defaultState, projectId: id } });
        }
      }
      
      // Load snapshots from localStorage
      const snapshotsData = localStorage.getItem(`aethel-snapshots-${id}`);
      if (snapshotsData) {
        snapshots.current = JSON.parse(snapshotsData);
      }
      
    } catch (err: any) {
      setError(err.message);
      
      // Fallback to localStorage
      const localData = localStorage.getItem(`aethel-project-${id}`);
      if (localData) {
        const data = JSON.parse(localData);
        dispatch({ type: 'LOAD_STATE', payload: data });
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint]);

  const saveProject = useCallback(async () => {
    if (!state.projectId) return;
    
    setIsLoading(true);
    
    try {
      // Save to server
      const response = await fetch(`${apiEndpoint}/projects/${state.projectId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save project');
      }
      
      savedStateRef.current = JSON.stringify(state);
      setLastSaved(new Date());
      
    } catch {
      // Save to localStorage as fallback
      localStorage.setItem(`aethel-project-${state.projectId}`, JSON.stringify(state));
      savedStateRef.current = JSON.stringify(state);
      setLastSaved(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [state, apiEndpoint]);

  // ==========================================================================
  // AUTO-SAVE
  // ==========================================================================

  useEffect(() => {
    if (!state.preferences.autoSave || !isDirty) return;
    
    // Clear previous timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    // Set new timer
    autoSaveTimer.current = setTimeout(() => {
      saveProject();
      createSnapshot(undefined, true);
    }, state.preferences.autoSaveInterval);
    
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [state, isDirty, saveProject, createSnapshot]);

  // ==========================================================================
  // CRASH RECOVERY
  // ==========================================================================

  useEffect(() => {
    // Save state before unload
    const handleBeforeUnload = () => {
      if (state.projectId && isDirty) {
        localStorage.setItem(`aethel-crash-recovery-${state.projectId}`, JSON.stringify(state));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state, isDirty]);

  // Check for crash recovery on mount
  useEffect(() => {
    if (!projectId) return;
    
    const recoveryData = localStorage.getItem(`aethel-crash-recovery-${projectId}`);
    if (recoveryData) {
      const recovered = JSON.parse(recoveryData);
      const shouldRecover = window.confirm(
        'Foram encontradas alterações não salvas de uma sessão anterior. Deseja recuperar?'
      );
      
      if (shouldRecover) {
        dispatch({ type: 'LOAD_STATE', payload: recovered });
      }
      
      localStorage.removeItem(`aethel-crash-recovery-${projectId}`);
    }
  }, [projectId]);

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: ProjectContextValue = {
    state,
    dispatch: (action) => {
      pushUndo(state);
      dispatch(action);
    },
    loadProject,
    saveProject,
    createSnapshot,
    restoreSnapshot,
    listSnapshots,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    isDirty,
    isLoading,
    lastSaved,
    error,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

export function useProjectState(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectState must be used within a ProjectStateProvider');
  }
  return context;
}

export function useSceneNodes() {
  const { state, dispatch } = useProjectState();
  
  const addNode = useCallback((node: Omit<ProjectNode, 'id'>) => {
    dispatch({
      type: 'ADD_NODE',
      payload: { ...node, id: crypto.randomUUID() },
    });
  }, [dispatch]);
  
  const updateNode = useCallback((id: string, updates: Partial<ProjectNode>) => {
    dispatch({ type: 'UPDATE_NODE', payload: { id, updates } });
  }, [dispatch]);
  
  const deleteNodes = useCallback((ids: string[]) => {
    dispatch({ type: 'DELETE_NODES', payload: ids });
  }, [dispatch]);
  
  const selectNodes = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_NODES', payload: ids });
  }, [dispatch]);
  
  return {
    nodes: state.scene.nodes,
    rootNodes: state.scene.rootNodes,
    selectedNodes: state.scene.selectedNodes,
    addNode,
    updateNode,
    deleteNodes,
    selectNodes,
  };
}

export function useEditorState() {
  const { state, dispatch } = useProjectState();
  
  const openFile = useCallback((file: string) => {
    dispatch({ type: 'OPEN_FILE', payload: file });
  }, [dispatch]);
  
  const closeFile = useCallback((file: string) => {
    dispatch({ type: 'CLOSE_FILE', payload: file });
  }, [dispatch]);
  
  const setActiveFile = useCallback((file?: string) => {
    dispatch({ type: 'SET_ACTIVE_FILE', payload: file });
  }, [dispatch]);
  
  return {
    activeFile: state.editor.activeFile,
    openFiles: state.editor.openFiles,
    openFile,
    closeFile,
    setActiveFile,
  };
}

export function useViewportState() {
  const { state, dispatch } = useProjectState();
  
  const updateViewport = useCallback((updates: Partial<ViewportState>) => {
    dispatch({ type: 'UPDATE_VIEWPORT', payload: updates });
  }, [dispatch]);
  
  return {
    viewport: state.viewport,
    updateViewport,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default ProjectStateProvider;
