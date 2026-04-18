'use client';

/**
 * Aethel Engine - Advanced Debug Components
 *
 * VS Code-style debugging with:
 * - Conditional Breakpoints
 * - Logpoints
 * - Watch Expressions
 * - Call Stack with inline preview
 * - Exception Breakpoints
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import {
  Bug,
  Circle,
  CircleDot,
  CircleSlash,
  MessageSquare,
  Plus,
  Minus,
  X,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Copy,
  Play,
  Pause,
  FastForward,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Square,
  AlertTriangle,
  Info,
  FileCode,
  Hash,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type BreakpointType = 'breakpoint' | 'conditional' | 'logpoint';

export interface Breakpoint {
  id: string;
  type: BreakpointType;
  filePath: string;
  line: number;
  column?: number;
  enabled: boolean;
  verified?: boolean;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  hitCount?: number;
}

export interface WatchExpression {
  id: string;
  expression: string;
  value?: string;
  type?: string;
  error?: string;
  expandable?: boolean;
  expanded?: boolean;
  children?: WatchExpression[];
}

export interface StackFrame {
  id: number;
  name: string;
  source?: {
    name: string;
    path: string;
  };
  line: number;
  column: number;
  moduleId?: number;
  presentationHint?: 'normal' | 'label' | 'subtle';
}

export interface Thread {
  id: number;
  name: string;
  stopped?: boolean;
  stoppedReason?: string;
}

export interface ExceptionBreakpoint {
  id: string;
  label: string;
  enabled: boolean;
  description?: string;
  conditionDescription?: string;
  condition?: string;
}

// ============================================================================
// Breakpoint Editor Dialog
// ============================================================================

export function BreakpointEditor({
  breakpoint,
  onSave,
  onCancel,
  position,
}: {
  breakpoint?: Partial<Breakpoint>;
  onSave: (breakpoint: Partial<Breakpoint>) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
}) {
  const [type, setType] = useState<BreakpointType>(breakpoint?.type || 'breakpoint');
  const [condition, setCondition] = useState(breakpoint?.condition || '');
  const [hitCondition, setHitCondition] = useState(breakpoint?.hitCondition || '');
  const [logMessage, setLogMessage] = useState(breakpoint?.logMessage || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const handleSave = () => {
    onSave({
      ...breakpoint,
      type,
      condition: type === 'conditional' ? condition : undefined,
      hitCondition: hitCondition || undefined,
      logMessage: type === 'logpoint' ? logMessage : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="absolute z-50 w-80 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-2xl overflow-hidden"
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {/* Type selector */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        {[
          { value: 'breakpoint', label: 'Breakpoint', icon: Circle },
          { value: 'conditional', label: 'Conditional', icon: CircleDot },
          { value: 'logpoint', label: 'Logpoint', icon: MessageSquare },
        ].map(({ value, label, icon: Icon }) => (
          <button type="button" aria-label={`Selecionar tipo ${label} para breakpoint`}
            key={value}
            onClick={() => setType(value as BreakpointType)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
 type === value
 ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)] border-b-2 border-[var(--aethel-info)]'
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]'
 }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3" onKeyDown={handleKeyDown}>
        {/* Conditional expression */}
        {type === 'conditional' && (
          <div>
            <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">
              Expression (break when true)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={condition}
              onChange={e => setCondition(e.target.value)}
              placeholder="e.g., i > 10 && user.name === 'test'"
              className="w-full px-2 py-1.5 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
            />
          </div>
        )}

        {/* Log message */}
        {type === 'logpoint' && (
          <div>
            <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">
              Log message (use {'{expression}'} for values)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={logMessage}
              onChange={e => setLogMessage(e.target.value)}
              placeholder="e.g., Value: {myVar}, Count: {count}"
              className="w-full px-2 py-1.5 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
            />
            <div className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
              Logs to console without pausing
            </div>
          </div>
        )}

        {/* Hit condition (for all types) */}
        <div>
          <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">
            Hit Count (optional)
          </label>
          <input
            type="text"
            value={hitCondition}
            onChange={e => setHitCondition(e.target.value)}
            placeholder="e.g., >= 10, == 5, % 2 == 0"
            className="w-full px-2 py-1.5 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" aria-label="Cancelar configuracao de breakpoint"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button type="button" aria-label={breakpoint?.id ? 'Atualizar breakpoint' : 'Adicionar breakpoint'}
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] rounded transition-colors hover:brightness-110"
          >
            {breakpoint?.id ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Breakpoints Panel
// ============================================================================

export function BreakpointsPanel({
  breakpoints,
  exceptionBreakpoints,
  onToggleBreakpoint,
  onRemoveBreakpoint,
  onEditBreakpoint,
  onToggleException,
  onNavigateToBreakpoint,
  onRemoveAll,
}: {
  breakpoints: Breakpoint[];
  exceptionBreakpoints?: ExceptionBreakpoint[];
  onToggleBreakpoint: (id: string) => void;
  onRemoveBreakpoint: (id: string) => void;
  onEditBreakpoint: (breakpoint: Breakpoint) => void;
  onToggleException?: (id: string) => void;
  onNavigateToBreakpoint: (breakpoint: Breakpoint) => void;
  onRemoveAll?: () => void;
}) {
  const [showExceptions, setShowExceptions] = useState(true);

  const getFileName = (path: string) => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  const getBreakpointIcon = (bp: Breakpoint) => {
    if (!bp.enabled) return CircleSlash;
    if (bp.type === 'logpoint') return MessageSquare;
    if (bp.type === 'conditional') return CircleDot;
    return Circle;
  };

  const getBreakpointColor = (bp: Breakpoint) => {
    if (!bp.enabled) return 'text-[var(--aethel-text-tertiary)]';
    if (!bp.verified) return 'text-[var(--aethel-text-tertiary)]';
    if (bp.type === 'logpoint') return 'text-[var(--aethel-warning-light)]';
    return 'text-[var(--aethel-error-light)]';
  };

  // Group breakpoints by file
  const groupedBreakpoints = useMemo(() => {
    const groups = new Map<string, Breakpoint[]>();
    breakpoints.forEach(bp => {
      const existing = groups.get(bp.filePath) || [];
      existing.push(bp);
      groups.set(bp.filePath, existing.sort((a, b) => a.line - b.line));
    });
    return groups;
  }, [breakpoints]);

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-[var(--aethel-error-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Breakpoints</span>
          <span className="text-xs text-[var(--aethel-text-tertiary)] bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 rounded">
            {breakpoints.length}
          </span>
        </div>
        {onRemoveAll && breakpoints.length > 0 && (
          <button type="button" aria-label="Remover todos os breakpoints"
            onClick={onRemoveAll}
            className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error)]"
            title="Remove all breakpoints"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Exception Breakpoints */}
        {exceptionBreakpoints && exceptionBreakpoints.length > 0 && (
          <div className="border-b border-[var(--aethel-border-primary)]">
            <button type="button" aria-label={showExceptions ? 'Recolher excecoes monitoradas' : 'Expandir excecoes monitoradas'}
              onClick={() => setShowExceptions(!showExceptions)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]"
            >
              {showExceptions ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <AlertTriangle className="w-4 h-4 text-[var(--aethel-warning-light)]" />
              <span>Exceptions</span>
            </button>

            {showExceptions && (
              <div className="pb-2">
                {exceptionBreakpoints.map(ex => (
                  <label
                    key={ex.id}
                    className="flex items-center gap-2 px-6 py-1 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={ex.enabled}
                      onChange={() => onToggleException?.(ex.id)}
                      className="rounded border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-info)] focus:ring-[var(--aethel-info)]"
                    />
                    <span className={ex.enabled ? 'text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)]'}>
                      {ex.label}
                    </span>
                    {ex.description && (
                      <span className="text-xs text-[var(--aethel-text-tertiary)]">
                        - {ex.description}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Breakpoints by file */}
        {Array.from(groupedBreakpoints.entries()).map(([filePath, bps]) => (
          <div key={filePath} className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_50%,transparent)]">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--aethel-text-tertiary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_30%,transparent)]">
              <FileCode className="w-3.5 h-3.5" />
              <span className="truncate">{getFileName(filePath)}</span>
            </div>

            {bps.map(bp => {
              const Icon = getBreakpointIcon(bp);
              const colorClass = getBreakpointColor(bp);

              return (
                <div
                  key={bp.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] group"
                >
                  {/* Toggle */}
                  <button type="button" aria-label={bp.enabled ? `Desativar breakpoint na linha ${bp.line}` : `Ativar breakpoint na linha ${bp.line}`}
                    onClick={() => onToggleBreakpoint(bp.id)}
                    className={`flex-shrink-0 ${colorClass}`}
                    title={bp.enabled ? 'Disable breakpoint' : 'Enable breakpoint'}
                  >
                    <Icon className="w-4 h-4" fill={bp.enabled && bp.verified ? 'currentColor' : 'none'} />
                  </button>

                  {/* Info */}
                  <button type="button" aria-label={`Navegar para breakpoint na linha ${bp.line}`}
                    onClick={() => onNavigateToBreakpoint(bp)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-sm text-[var(--aethel-text-secondary)]">
                      Line {bp.line}
                    </span>
                    {bp.condition && (
                      <span className="text-xs text-[var(--aethel-warning-light)] truncate">
                        {bp.condition}
                      </span>
                    )}
                    {bp.logMessage && (
                      <span className="text-xs text-[var(--aethel-warning-light)] truncate">
                        {`"${bp.logMessage}"`}
                      </span>
                    )}
                    {bp.hitCondition && (
                      <span className="text-xs text-[var(--aethel-text-tertiary)]">
                        (hit: {bp.hitCondition})
                      </span>
                    )}
                    {bp.hitCount !== undefined && bp.hitCount > 0 && (
                      <span className="text-xs text-[var(--aethel-info-light)]">
                        ×{bp.hitCount}
                      </span>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button type="button" aria-label={`Editar breakpoint na linha ${bp.line}`}
                      onClick={() => onEditBreakpoint(bp)}
                      className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
                      title="Edit breakpoint"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
                    </button>
                    <button type="button" aria-label={`Remover breakpoint na linha ${bp.line}`}
                      onClick={() => onRemoveBreakpoint(bp.id)}
                      className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
                      title="Remove breakpoint"
                    >
                      <X className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty state */}
        {breakpoints.length === 0 && (
          <div className="px-4 py-8 text-center text-[var(--aethel-text-tertiary)] text-sm">
            <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No breakpoints set</p>
            <p className="text-xs mt-1">
              Click the gutter or press F9 to add
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Watch Panel
// ============================================================================

export function WatchPanel({
  expressions,
  onAddExpression,
  onRemoveExpression,
  onEditExpression,
  onRefresh,
  onToggleExpand,
  disabled,
}: {
  expressions: WatchExpression[];
  onAddExpression: (expression: string) => void;
  onRemoveExpression: (id: string) => void;
  onEditExpression: (id: string, expression: string) => void;
  onRefresh?: () => void;
  onToggleExpand?: (id: string) => void;
  disabled?: boolean;
}) {
  const [newExpression, setNewExpression] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (newExpression.trim()) {
      onAddExpression(newExpression.trim());
      setNewExpression('');
    }
  };

  const handleEdit = (expr: WatchExpression) => {
    setEditingId(expr.id);
    setEditValue(expr.expression);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleSaveEdit = () => {
    if (editingId && editValue.trim()) {
      onEditExpression(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const renderExpression = (expr: WatchExpression, depth = 0): ReactNode => {
    const isEditing = editingId === expr.id;

    return (
      <div key={expr.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] group ${
 disabled ? 'opacity-50' : ''
 }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {/* Expand toggle */}
          {expr.expandable ? (
            <button type="button" aria-label={expr.expanded ? `Recolher expressao ${expr.expression}` : `Expandir expressao ${expr.expression}`}
              onClick={() => onToggleExpand?.(expr.id)}
              className="flex-shrink-0"
              disabled={disabled}
            >
              {expr.expanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
              )}
            </button>
          ) : (
            <span className="w-3.5" />
          )}

          {/* Expression */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditValue('');
                }
              }}
              className="flex-1 px-1 py-0.5 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
            />
          ) : (
            <>
              <span className="text-sm text-[var(--aethel-info-light)] font-mono">
                {expr.expression}
              </span>
              <span className="text-[var(--aethel-text-quaternary)]">:</span>
              {expr.error ? (
                <span className="text-sm text-[var(--aethel-error-light)] truncate">
                  {expr.error}
                </span>
              ) : (
                <>
                  <span className={`text-sm font-mono truncate ${
 expr.type === 'string' ? 'text-[var(--aethel-success-light)]' :
 expr.type === 'number' ? 'text-[var(--aethel-warning-light)]' :
 expr.type === 'boolean' ? 'text-[var(--aethel-info-light)]' :
 'text-[var(--aethel-text-secondary)]'
 }`}>
                    {expr.value ?? 'undefined'}
                  </span>
                  {expr.type && (
                    <span className="text-xs text-[var(--aethel-text-tertiary)] ml-1">
                      {expr.type}
                    </span>
                  )}
                </>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 ml-auto">
            <button type="button" aria-label={`Editar expressao ${expr.expression}`}
              onClick={() => handleEdit(expr)}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Edit"
            >
              <Edit2 className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
            </button>
            <button type="button" aria-label={`Copiar valor de ${expr.expression}`}
              onClick={() => navigator.clipboard.writeText(expr.value || '')}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Copy value"
            >
              <Copy className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
            </button>
            <button type="button" aria-label={`Remover expressao ${expr.expression}`}
              onClick={() => onRemoveExpression(expr.id)}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Remove"
            >
              <X className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Children */}
        {expr.expanded && expr.children?.map(child => renderExpression(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--aethel-info-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Watch</span>
        </div>
        {onRefresh && (
          <button type="button" aria-label="Atualizar expressoes observadas"
            onClick={onRefresh}
            className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
            title="Refresh all"
            disabled={disabled}
          >
            <RotateCcw className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          </button>
        )}
      </div>

      {/* Add expression */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <input
          type="text"
          value={newExpression}
          onChange={e => setNewExpression(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add expression..."
          className="flex-1 px-2 py-1 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
          disabled={disabled}
        />
        <button type="button" aria-label="Adicionar expressao observada"
          onClick={handleAdd}
          disabled={disabled || !newExpression.trim()}
          className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Expressions */}
      <div className="flex-1 overflow-y-auto">
        {expressions.length === 0 ? (
          <div className="px-4 py-8 text-center text-[var(--aethel-text-tertiary)] text-sm">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No watch expressions</p>
            <p className="text-xs mt-1">
              Add expressions to watch during debugging
            </p>
          </div>
        ) : (
          expressions.map(expr => renderExpression(expr))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Call Stack Panel
// ============================================================================

export function CallStackPanel({
  threads,
  frames,
  selectedFrameId,
  selectedThreadId,
  onSelectFrame,
  onSelectThread,
  onRestartFrame,
  disabled,
}: {
  threads?: Thread[];
  frames: StackFrame[];
  selectedFrameId?: number;
  selectedThreadId?: number;
  onSelectFrame: (frameId: number) => void;
  onSelectThread?: (threadId: number) => void;
  onRestartFrame?: (frameId: number) => void;
  disabled?: boolean;
}) {
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set([selectedThreadId || 1]));

  const toggleThread = (id: number) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getFrameHint = (frame: StackFrame) => {
    switch (frame.presentationHint) {
      case 'label':
        return 'text-[var(--aethel-warning-light)]';
      case 'subtle':
        return 'text-[var(--aethel-text-tertiary)] italic';
      default:
        return 'text-[var(--aethel-text-secondary)]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-secondary)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <Hash className="w-4 h-4 text-[var(--aethel-warning-light)]" />
        <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Call Stack</span>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${disabled ? 'opacity-50' : ''}`}>
        {threads && threads.length > 1 ? (
          // Multi-threaded view
          threads.map(thread => (
            <div key={thread.id} className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_50%,transparent)]">
              <button type="button" aria-label={expandedThreads.has(thread.id) ? `Recolher thread ${thread.name}` : `Expandir thread ${thread.name}`}
                onClick={() => {
                  toggleThread(thread.id);
                  onSelectThread?.(thread.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] ${
 selectedThreadId === thread.id ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]' : ''
 }`}
              >
                {expandedThreads.has(thread.id) ? (
                  <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                )}
                <span className={thread.stopped ? 'text-[var(--aethel-warning-light)]' : 'text-[var(--aethel-text-tertiary)]'}>
                  {thread.stopped ? '⏸' : '▶'}
                </span>
                <span className="text-[var(--aethel-text-primary)]">{thread.name}</span>
                {thread.stoppedReason && (
                  <span className="text-xs text-[var(--aethel-text-tertiary)]">
                    ({thread.stoppedReason})
                  </span>
                )}
              </button>

              {expandedThreads.has(thread.id) && selectedThreadId === thread.id && (
                <div className="pb-2">
                  {frames.map((frame, index) => (
                    <StackFrameItem
                      key={frame.id}
                      frame={frame}
                      index={index}
                      isSelected={frame.id === selectedFrameId}
                      onSelect={() => onSelectFrame(frame.id)}
                      onRestart={onRestartFrame ? () => onRestartFrame(frame.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          // Single thread view
          frames.map((frame, index) => (
            <StackFrameItem
              key={frame.id}
              frame={frame}
              index={index}
              isSelected={frame.id === selectedFrameId}
              onSelect={() => onSelectFrame(frame.id)}
              onRestart={onRestartFrame ? () => onRestartFrame(frame.id) : undefined}
            />
          ))
        )}

        {frames.length === 0 && (
          <div className="px-4 py-8 text-center text-[var(--aethel-text-tertiary)] text-sm">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No call stack</p>
            <p className="text-xs mt-1">
              Start debugging to see the call stack
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StackFrameItem({
  frame,
  index,
  isSelected,
  onSelect,
  onRestart,
}: {
  frame: StackFrame;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRestart?: () => void;
}) {
  const getFrameHint = () => {
    switch (frame.presentationHint) {
      case 'label':
        return 'text-[var(--aethel-warning-light)]';
      case 'subtle':
        return 'text-[var(--aethel-text-tertiary)] italic';
      default:
        return 'text-[var(--aethel-text-secondary)]';
    }
  };

  return (
    <button type="button" aria-label={`Selecionar frame ${frame.name}`}
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] group ${
 isSelected ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]' : ''
 }`}
    >
      {/* Frame number */}
      <span className="w-5 text-right text-xs text-[var(--aethel-text-quaternary)]">
        {index}
      </span>

      {/* Frame name */}
      <span className={`flex-1 truncate font-mono ${getFrameHint()}`}>
        {frame.name}
      </span>

      {/* Source info */}
      {frame.source && (
        <span className="text-xs text-[var(--aethel-text-tertiary)] truncate max-w-32">
          {frame.source.name}:{frame.line}
        </span>
      )}

      {/* Restart button */}
      {onRestart && (
        <button type="button" aria-label={`Reiniciar frame ${frame.name}`}
          onClick={e => {
            e.stopPropagation();
            onRestart();
          }}
          className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded opacity-0 group-hover:opacity-100"
          title="Restart frame"
        >
          <RotateCcw className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
        </button>
      )}
    </button>
  );
}

// ============================================================================
// Debug Toolbar
// ============================================================================

export function DebugToolbar({
  state,
  onContinue,
  onPause,
  onStepOver,
  onStepInto,
  onStepOut,
  onRestart,
  onStop,
}: {
  state: 'idle' | 'running' | 'paused' | 'initializing';
  onContinue: () => void;
  onPause: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onRestart: () => void;
  onStop: () => void;
}) {
  const isPaused = state === 'paused';
  const isRunning = state === 'running';
  const isActive = isPaused || isRunning;

  const buttons = [
    {
      icon: isPaused ? Play : Pause,
      label: isPaused ? 'Continue (F5)' : 'Pause (F6)',
      action: isPaused ? onContinue : onPause,
      disabled: !isActive,
      primary: isPaused,
    },
    {
      icon: FastForward,
      label: 'Step Over (F10)',
      action: onStepOver,
      disabled: !isPaused,
    },
    {
      icon: ArrowDown,
      label: 'Step Into (F11)',
      action: onStepInto,
      disabled: !isPaused,
    },
    {
      icon: ArrowUp,
      label: 'Step Out (Shift+F11)',
      action: onStepOut,
      disabled: !isPaused,
    },
    {
      icon: RotateCcw,
      label: 'Restart (Ctrl+Shift+F5)',
      action: onRestart,
      disabled: !isActive,
    },
    {
      icon: Square,
      label: 'Stop (Shift+F5)',
      action: onStop,
      disabled: !isActive,
      danger: true,
    },
  ];

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded-lg">
      {buttons.map(({ icon: Icon, label, action, disabled, primary, danger }, index) => (
        <button type="button" aria-label={label}
          key={label}
          onClick={action}
          disabled={disabled}
          title={label}
          className={`p-1.5 rounded transition-colors ${
 disabled
 ? 'text-[var(--aethel-text-quaternary)] cursor-not-allowed'
 : primary
 ? 'text-[var(--aethel-success-light)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
 : danger
 ? 'text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]'
 : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
 }`}
        >
          <Icon className="w-4 h-4" fill={primary && !disabled ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default BreakpointsPanel;

