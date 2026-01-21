/**
 * Aethel IDE - History Store (Undo/Redo System)
 * 
 * Sistema global de Undo/Redo para a IDE.
 * Implementa o padrão Command com snapshots de estado.
 * 
 * CRÍTICO: Este sistema é essencial para qualquer editor profissional.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export interface HistoryEntry<T = unknown> {
  id: string;
  timestamp: number;
  label: string;
  category: 'scene' | 'code' | 'blueprint' | 'material' | 'animation' | 'level' | 'settings' | 'file' | 'general';
  
  // Snapshot do estado antes da mudança
  beforeState: T;
  
  // Snapshot do estado depois da mudança
  afterState: T;
  
  // Metadados opcionais para debug
  metadata?: {
    component?: string;
    action?: string;
    target?: string;
    userId?: string;
  };
}

export interface HistoryStore {
  // Estado
  past: HistoryEntry[];
  future: HistoryEntry[];
  
  // Configuração
  maxHistory: number;
  isRecording: boolean;
  
  // Transação em andamento (para agrupar múltiplas mudanças)
  currentTransaction: {
    id: string;
    label: string;
    category: HistoryEntry['category'];
    changes: Array<{ beforeState: unknown; afterState: unknown }>;
  } | null;
  
  // Actions
  pushHistory: <T>(entry: Omit<HistoryEntry<T>, 'id' | 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  
  // Transações (agrupa múltiplas mudanças em um único undo)
  beginTransaction: (label: string, category: HistoryEntry['category']) => void;
  commitTransaction: () => void;
  rollbackTransaction: () => void;
  
  // Controle
  clear: () => void;
  clearFuture: () => void;
  setMaxHistory: (max: number) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  
  // Queries
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoLabel: () => string | null;
  getRedoLabel: () => string | null;
  getHistory: () => HistoryEntry[];
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Estado inicial
        past: [],
        future: [],
        maxHistory: 100,
        isRecording: true,
        currentTransaction: null,
        
        /**
         * Adiciona uma entrada ao histórico
         * Limpa o future (redo stack) quando uma nova ação é realizada
         */
        pushHistory: <T>(entry: Omit<HistoryEntry<T>, 'id' | 'timestamp'>) => {
          const state = get();
          
          // Ignora se recording está pausado
          if (!state.isRecording) return;
          
          // Se há transação em andamento, adiciona à transação
          if (state.currentTransaction) {
            set((s) => {
              s.currentTransaction!.changes.push({
                beforeState: entry.beforeState,
                afterState: entry.afterState,
              });
            });
            return;
          }
          
          const newEntry: HistoryEntry<T> = {
            ...entry,
            id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            timestamp: Date.now(),
          };
          
          set((s) => {
            // Adiciona ao past
            s.past.push(newEntry as HistoryEntry);
            
            // Limita o tamanho do histórico
            if (s.past.length > s.maxHistory) {
              s.past.shift();
            }
            
            // Limpa o future (não pode redo após nova ação)
            s.future = [];
          });
        },
        
        /**
         * Desfaz a última ação
         * Retorna a entrada desfeita ou null se não há nada para desfazer
         */
        undo: () => {
          const state = get();
          if (state.past.length === 0) return null;
          
          let undoneEntry: HistoryEntry | null = null;
          
          set((s) => {
            const entry = s.past.pop();
            if (entry) {
              s.future.unshift(entry);
              undoneEntry = entry;
            }
          });
          
          return undoneEntry;
        },
        
        /**
         * Refaz a próxima ação desfeita
         * Retorna a entrada refeita ou null se não há nada para refazer
         */
        redo: () => {
          const state = get();
          if (state.future.length === 0) return null;
          
          let redoneEntry: HistoryEntry | null = null;
          
          set((s) => {
            const entry = s.future.shift();
            if (entry) {
              s.past.push(entry);
              redoneEntry = entry;
            }
          });
          
          return redoneEntry;
        },
        
        /**
         * Inicia uma transação para agrupar múltiplas mudanças
         * Útil para operações complexas como "mover múltiplos objetos"
         */
        beginTransaction: (label: string, category: HistoryEntry['category']) => {
          set((s) => {
            s.currentTransaction = {
              id: `tx_${Date.now()}`,
              label,
              category,
              changes: [],
            };
          });
        },
        
        /**
         * Finaliza a transação atual e adiciona como uma única entrada no histórico
         */
        commitTransaction: () => {
          const state = get();
          if (!state.currentTransaction) return;
          
          const tx = state.currentTransaction;
          
          if (tx.changes.length > 0) {
            // Combina todos os estados em uma única entrada
            const combinedEntry: HistoryEntry = {
              id: tx.id,
              timestamp: Date.now(),
              label: tx.label,
              category: tx.category,
              beforeState: tx.changes.map(c => c.beforeState),
              afterState: tx.changes.map(c => c.afterState),
              metadata: {
                action: 'transaction',
                target: `${tx.changes.length} changes`,
              },
            };
            
            set((s) => {
              s.past.push(combinedEntry);
              if (s.past.length > s.maxHistory) {
                s.past.shift();
              }
              s.future = [];
              s.currentTransaction = null;
            });
          } else {
            set((s) => {
              s.currentTransaction = null;
            });
          }
        },
        
        /**
         * Cancela a transação atual sem adicionar ao histórico
         */
        rollbackTransaction: () => {
          set((s) => {
            s.currentTransaction = null;
          });
        },
        
        /**
         * Limpa todo o histórico
         */
        clear: () => {
          set((s) => {
            s.past = [];
            s.future = [];
            s.currentTransaction = null;
          });
        },
        
        /**
         * Limpa apenas o future (redo stack)
         */
        clearFuture: () => {
          set((s) => {
            s.future = [];
          });
        },
        
        /**
         * Define o tamanho máximo do histórico
         */
        setMaxHistory: (max: number) => {
          set((s) => {
            s.maxHistory = Math.max(10, max);
            // Trunca se necessário
            if (s.past.length > s.maxHistory) {
              s.past = s.past.slice(-s.maxHistory);
            }
          });
        },
        
        /**
         * Pausa a gravação do histórico
         * Útil para operações internas que não devem ser desfeitas
         */
        pauseRecording: () => {
          set((s) => {
            s.isRecording = false;
          });
        },
        
        /**
         * Retoma a gravação do histórico
         */
        resumeRecording: () => {
          set((s) => {
            s.isRecording = true;
          });
        },
        
        // Queries
        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,
        
        getUndoLabel: () => {
          const state = get();
          if (state.past.length === 0) return null;
          return state.past[state.past.length - 1].label;
        },
        
        getRedoLabel: () => {
          const state = get();
          if (state.future.length === 0) return null;
          return state.future[0].label;
        },
        
        getHistory: () => get().past,
      }))
    ),
    { name: 'aethel-history' }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para facilitar o uso de undo/redo com atalhos de teclado
 */
export function useUndoRedo() {
  const { 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    getUndoLabel, 
    getRedoLabel 
  } = useHistoryStore();
  
  return {
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    undoLabel: getUndoLabel(),
    redoLabel: getRedoLabel(),
  };
}

/**
 * Hook para criar entradas de histórico automaticamente
 * Retorna uma função que envolve mudanças de estado com registro automático
 */
export function useHistoryAction<T>(
  label: string,
  category: HistoryEntry['category'] = 'general'
) {
  const { pushHistory, beginTransaction, commitTransaction } = useHistoryStore();
  
  /**
   * Executa uma ação com registro automático no histórico
   */
  const execute = (
    getBeforeState: () => T,
    performAction: () => void,
    getAfterState: () => T
  ) => {
    const beforeState = getBeforeState();
    performAction();
    const afterState = getAfterState();
    
    pushHistory({
      label,
      category,
      beforeState,
      afterState,
    });
  };
  
  /**
   * Executa múltiplas ações como uma única transação
   */
  const executeTransaction = (actions: Array<{
    getBeforeState: () => T;
    performAction: () => void;
    getAfterState: () => T;
  }>) => {
    beginTransaction(label, category);
    
    for (const action of actions) {
      const beforeState = action.getBeforeState();
      action.performAction();
      const afterState = action.getAfterState();
      
      pushHistory({
        label,
        category,
        beforeState,
        afterState,
      });
    }
    
    commitTransaction();
  };
  
  return { execute, executeTransaction };
}

// ============================================================================
// KEYBOARD SHORTCUTS INTEGRATION
// ============================================================================

/**
 * Registra os atalhos de teclado globais para Undo/Redo
 * Deve ser chamado uma vez no componente raiz da aplicação
 */
export function registerUndoRedoShortcuts(
  onUndo?: (entry: HistoryEntry | null) => void,
  onRedo?: (entry: HistoryEntry | null) => void
) {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignora se está em input/textarea
    const target = e.target as HTMLElement;
    const isEditable = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;
    
    // Ctrl+Z - Undo
    if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
      // Se está em campo editável, deixa o comportamento padrão
      if (isEditable) return;
      
      e.preventDefault();
      const entry = useHistoryStore.getState().undo();
      onUndo?.(entry);
    }
    
    // Ctrl+Shift+Z ou Ctrl+Y - Redo
    if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
      if (isEditable) return;
      
      e.preventDefault();
      const entry = useHistoryStore.getState().redo();
      onRedo?.(entry);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  
  // Retorna função de cleanup
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}

// ============================================================================
// SCENE-SPECIFIC HISTORY (para o editor 3D)
// ============================================================================

export interface SceneObject {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  visible: boolean;
  locked: boolean;
  components: Record<string, unknown>;
}

export interface SceneHistoryState {
  objects: SceneObject[];
  selection: string[];
}

/**
 * Hook especializado para histórico de cena 3D
 */
export function useSceneHistory() {
  const { pushHistory } = useHistoryStore();
  
  const recordSceneChange = (
    label: string,
    beforeState: SceneHistoryState,
    afterState: SceneHistoryState,
    metadata?: HistoryEntry['metadata']
  ) => {
    pushHistory({
      label,
      category: 'scene',
      beforeState,
      afterState,
      metadata,
    });
  };
  
  const recordObjectMove = (
    objectId: string,
    beforePosition: { x: number; y: number; z: number },
    afterPosition: { x: number; y: number; z: number }
  ) => {
    pushHistory({
      label: `Mover objeto`,
      category: 'scene',
      beforeState: { objectId, position: beforePosition },
      afterState: { objectId, position: afterPosition },
      metadata: { action: 'move', target: objectId },
    });
  };
  
  const recordObjectDelete = (
    objectId: string,
    object: SceneObject
  ) => {
    pushHistory({
      label: `Deletar ${object.name}`,
      category: 'scene',
      beforeState: { object },
      afterState: { deleted: true },
      metadata: { action: 'delete', target: objectId },
    });
  };
  
  const recordObjectCreate = (
    object: SceneObject
  ) => {
    pushHistory({
      label: `Criar ${object.name}`,
      category: 'scene',
      beforeState: { created: false },
      afterState: { object },
      metadata: { action: 'create', target: object.id },
    });
  };
  
  return {
    recordSceneChange,
    recordObjectMove,
    recordObjectDelete,
    recordObjectCreate,
  };
}

export default useHistoryStore;
