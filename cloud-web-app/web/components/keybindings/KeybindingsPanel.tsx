/**
 * Aethel Keybindings Panel
 * 
 * UI completa para visualizar e customizar atalhos de teclado.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  keybindingsService,
  KeybindingWithSource,
  Keybinding,
  formatKeyCombo,
  parseKeyCombo,
} from '../../lib/keybindings/keybindings-service';

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#1e1e2e',
    color: '#cdd6f4',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #313244',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    marginBottom: '12px',
  },
  searchContainer: {
    position: 'relative' as const,
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    paddingLeft: '36px',
    backgroundColor: '#313244',
    border: '1px solid #45475a',
    borderRadius: '6px',
    color: '#cdd6f4',
    fontSize: '14px',
    outline: 'none',
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6c7086',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #313244',
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #45475a',
    borderRadius: '4px',
    color: '#cdd6f4',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#89b4fa',
    borderColor: '#89b4fa',
    color: '#1e1e2e',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  keybindingRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  keybindingRowHover: {
    backgroundColor: '#313244',
  },
  commandColumn: {
    flex: 1,
    minWidth: 0,
  },
  commandName: {
    fontSize: '14px',
    color: '#cdd6f4',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  commandWhen: {
    fontSize: '11px',
    color: '#6c7086',
    marginTop: '2px',
  },
  keyColumn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  keyBadge: {
    display: 'inline-flex',
    padding: '4px 8px',
    backgroundColor: '#45475a',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#f5c2e7',
  },
  sourceColumn: {
    width: '80px',
    textAlign: 'center' as const,
  },
  sourceBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
  },
  actionsColumn: {
    width: '100px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '4px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  actionsVisible: {
    opacity: 1,
  },
  iconButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: '#cdd6f4',
    cursor: 'pointer',
    fontSize: '12px',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1e1e2e',
    borderRadius: '8px',
    border: '1px solid #313244',
    width: '450px',
    maxWidth: '90%',
  },
  modalHeader: {
    padding: '16px',
    borderBottom: '1px solid #313244',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  modalBody: {
    padding: '16px',
  },
  modalFooter: {
    padding: '16px',
    borderTop: '1px solid #313244',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    backgroundColor: '#89b4fa',
    color: '#1e1e2e',
  },
  secondaryButton: {
    backgroundColor: '#313244',
    color: '#cdd6f4',
  },
  recordBox: {
    padding: '24px',
    backgroundColor: '#313244',
    borderRadius: '8px',
    textAlign: 'center' as const,
    marginBottom: '16px',
  },
  recordKey: {
    fontSize: '24px',
    fontFamily: 'monospace',
    color: '#f5c2e7',
    marginBottom: '8px',
  },
  recordHint: {
    fontSize: '12px',
    color: '#6c7086',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#313244',
    border: '1px solid #45475a',
    borderRadius: '4px',
    color: '#cdd6f4',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#a6adc8',
    marginBottom: '4px',
  },
  conflictWarning: {
    padding: '12px',
    backgroundColor: 'rgba(250, 179, 135, 0.1)',
    border: '1px solid #fab387',
    borderRadius: '4px',
    color: '#fab387',
    fontSize: '12px',
    marginTop: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: '#6c7086',
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface KeybindingRecordModalProps {
  isOpen: boolean;
  command: string;
  existingKey?: string;
  onSave: (key: string, when?: string) => void;
  onClose: () => void;
}

const KeybindingRecordModal: React.FC<KeybindingRecordModalProps> = ({
  isOpen,
  command,
  existingKey,
  onSave,
  onClose,
}) => {
  const [recordedKey, setRecordedKey] = useState<string>(existingKey || '');
  const [whenClause, setWhenClause] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [conflict, setConflict] = useState<KeybindingWithSource | null>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRecording) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('ctrl');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');
      if (e.metaKey) parts.push('meta');
      parts.push(e.key.toLowerCase());
      
      const keyString = parts.join('+');
      setRecordedKey(keyString);
      setIsRecording(false);
      
      // Check for conflicts
      const bindings = keybindingsService.getKeybindingsForCommand(command);
      const conflicting = keybindingsService.getAllKeybindings().find(
        kb => kb.key === keyString && kb.command !== command
      );
      setConflict(conflicting || null);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRecording, command]);
  
  if (!isOpen) return null;
  
  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Definir Atalho</h3>
        </div>
        <div style={styles.modalBody}>
          <label style={styles.label}>Comando</label>
          <div style={{ ...styles.input, backgroundColor: '#45475a', marginBottom: '16px' }}>
            {command}
          </div>
          
          <label style={styles.label}>Atalho</label>
          <div
            style={{
              ...styles.recordBox,
              border: isRecording ? '2px solid #89b4fa' : '2px solid transparent',
            }}
            onClick={() => setIsRecording(true)}
          >
            <div style={styles.recordKey}>
              {recordedKey ? formatKeyCombo(parseKeyCombo(recordedKey)) : '...'}
            </div>
            <div style={styles.recordHint}>
              {isRecording ? 'Pressione as teclas...' : 'Clique para gravar'}
            </div>
          </div>
          
          <label style={styles.label}>Condição (When)</label>
          <input
            type="text"
            style={styles.input}
            value={whenClause}
            onChange={e => setWhenClause(e.target.value)}
            placeholder="ex: editorTextFocus"
          />
          
          {conflict && (
            <div style={styles.conflictWarning}>
              ⚠️ Conflito: Este atalho já está sendo usado por {`"${conflict.command}"`}
            </div>
          )}
        </div>
        <div style={styles.modalFooter}>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => {
              if (recordedKey) {
                onSave(recordedKey, whenClause || undefined);
              }
            }}
            disabled={!recordedKey}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

interface KeybindingRowProps {
  keybinding: KeybindingWithSource;
  onEdit: () => void;
  onReset: () => void;
}

const KeybindingRow: React.FC<KeybindingRowProps> = ({ keybinding, onEdit, onReset }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'user': return '#a6e3a1';
      case 'extension': return '#89b4fa';
      default: return '#6c7086';
    }
  };
  
  return (
    <div
      style={{
        ...styles.keybindingRow,
        ...(isHovered ? styles.keybindingRowHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.commandColumn}>
        <div style={styles.commandName}>{keybinding.command}</div>
        {keybinding.when && (
          <div style={styles.commandWhen}>when: {keybinding.when}</div>
        )}
      </div>
      
      <div style={styles.keyColumn}>
        <span style={styles.keyBadge}>
          {formatKeyCombo(parseKeyCombo(keybinding.key))}
        </span>
      </div>
      
      <div style={styles.sourceColumn}>
        <span
          style={{
            ...styles.sourceBadge,
            backgroundColor: getSourceColor(keybinding.source) + '20',
            color: getSourceColor(keybinding.source),
          }}
        >
          {keybinding.source}
        </span>
      </div>
      
      <div style={{
        ...styles.actionsColumn,
        ...(isHovered ? styles.actionsVisible : {}),
      }}>
        <button style={styles.iconButton} onClick={onEdit} title="Editar">
          ✏️
        </button>
        {keybinding.source === 'user' && (
          <button style={styles.iconButton} onClick={onReset} title="Resetar">
            🔄
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PANEL
// ============================================================================

type FilterType = 'all' | 'default' | 'user' | 'extension';

export const KeybindingsPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [keybindings, setKeybindings] = useState<KeybindingWithSource[]>([]);
  const [editingCommand, setEditingCommand] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | undefined>();
  
  useEffect(() => {
    const loadKeybindings = () => {
      setKeybindings(keybindingsService.getAllKeybindings());
    };
    
    loadKeybindings();
    keybindingsService.on('keybindingsChanged', loadKeybindings);
    
    return () => {
      keybindingsService.off('keybindingsChanged', loadKeybindings);
    };
  }, []);
  
  const filteredKeybindings = useMemo(() => {
    return keybindings.filter(kb => {
      // Filter by source
      if (filter !== 'all' && kb.source !== filter) return false;
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCommand = kb.command.toLowerCase().includes(query);
        const matchesKey = kb.key.toLowerCase().includes(query);
        const matchesWhen = kb.when?.toLowerCase().includes(query);
        if (!matchesCommand && !matchesKey && !matchesWhen) return false;
      }
      
      return true;
    });
  }, [keybindings, filter, searchQuery]);
  
  const handleSaveKeybinding = (key: string, when?: string) => {
    if (!editingCommand) return;
    
    keybindingsService.addUserKeybinding({
      key,
      command: editingCommand,
      when,
    });
    
    setEditingCommand(null);
    setEditingKey(undefined);
  };
  
  const handleResetKeybinding = (key: string) => {
    keybindingsService.removeUserKeybinding(key);
  };
  
  const handleExport = () => {
    const json = keybindingsService.exportUserKeybindings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keybindings.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      keybindingsService.importUserKeybindings(text);
    };
    input.click();
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Atalhos de Teclado</h2>
        <div style={styles.searchContainer}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar atalhos..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div style={styles.toolbar}>
        {(['all', 'default', 'user', 'extension'] as FilterType[]).map(f => (
          <button
            key={f}
            style={{
              ...styles.filterButton,
              ...(filter === f ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'default' ? 'Padrão' : f === 'user' ? 'Usuário' : 'Extensões'}
          </button>
        ))}
        
        <div style={{ flex: 1 }} />
        
        <button style={styles.filterButton} onClick={handleImport}>
          📥 Importar
        </button>
        <button style={styles.filterButton} onClick={handleExport}>
          📤 Exportar
        </button>
      </div>
      
      <div style={styles.content}>
        {filteredKeybindings.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>⌨️</span>
            <span>Nenhum atalho encontrado</span>
          </div>
        ) : (
          filteredKeybindings.map((kb, index) => (
            <KeybindingRow
              key={`${kb.command}-${kb.key}-${index}`}
              keybinding={kb}
              onEdit={() => {
                setEditingCommand(kb.command);
                setEditingKey(kb.key);
              }}
              onReset={() => handleResetKeybinding(kb.key)}
            />
          ))
        )}
      </div>
      
      <KeybindingRecordModal
        isOpen={!!editingCommand}
        command={editingCommand || ''}
        existingKey={editingKey}
        onSave={handleSaveKeybinding}
        onClose={() => {
          setEditingCommand(null);
          setEditingKey(undefined);
        }}
      />
    </div>
  );
};

export default KeybindingsPanel;
