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
      className="absolute z-50 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {/* Type selector */}
      <div className="flex border-b border-slate-700">
        {[
          { value: 'breakpoint', label: 'Breakpoint', icon: Circle },
          { value: 'conditional', label: 'Conditional', icon: CircleDot },
          { value: 'logpoint', label: 'Logpoint', icon: MessageSquare },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setType(value as BreakpointType)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
              type === value
                ? 'bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
            <label className="block text-xs text-slate-400 mb-1">
              Expression (break when true)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={condition}
              onChange={e => setCondition(e.target.value)}
              placeholder="e.g., i > 10 && user.name === 'test'"
              className="w-full px-2 py-1.5 text-sm bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
        )}

        {/* Log message */}
        {type === 'logpoint' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Log message (use {'{expression}'} for values)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={logMessage}
              onChange={e => setLogMessage(e.target.value)}
              placeholder="e.g., Value: {myVar}, Count: {count}"
              className="w-full px-2 py-1.5 text-sm bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <div className="mt-1 text-xs text-slate-500">
              Logs to console without pausing
            </div>
          </div>
        )}

        {/* Hit condition (for all types) */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Hit Count (optional)
          </label>
          <input
            type="text"
            value={hitCondition}
            onChange={e => setHitCondition(e.target.value)}
            placeholder="e.g., >= 10, == 5, % 2 == 0"
            className="w-full px-2 py-1.5 text-sm bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
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
    if (!bp.enabled) return 'text-slate-500';
    if (!bp.verified) return 'text-slate-400';
    if (bp.type === 'logpoint') return 'text-amber-400';
    return 'text-red-500';
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
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-white">Breakpoints</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {breakpoints.length}
          </span>
        </div>
        {onRemoveAll && breakpoints.length > 0 && (
          <button
            onClick={onRemoveAll}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"
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
          <div className="border-b border-slate-800">
            <button
              onClick={() => setShowExceptions(!showExceptions)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50"
            >
              {showExceptions ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Exceptions</span>
            </button>

            {showExceptions && (
              <div className="pb-2">
                {exceptionBreakpoints.map(ex => (
                  <label
                    key={ex.id}
                    className="flex items-center gap-2 px-6 py-1 text-sm hover:bg-slate-800/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={ex.enabled}
                      onChange={() => onToggleException?.(ex.id)}
                      className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className={ex.enabled ? 'text-white' : 'text-slate-500'}>
                      {ex.label}
                    </span>
                    {ex.description && (
                      <span className="text-xs text-slate-500">
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
          <div key={filePath} className="border-b border-slate-800/50">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-800/30">
              <FileCode className="w-3.5 h-3.5" />
              <span className="truncate">{getFileName(filePath)}</span>
            </div>

            {bps.map(bp => {
              const Icon = getBreakpointIcon(bp);
              const colorClass = getBreakpointColor(bp);

              return (
                <div
                  key={bp.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 group"
                >
                  {/* Toggle */}
                  <button
                    onClick={() => onToggleBreakpoint(bp.id)}
                    className={`flex-shrink-0 ${colorClass}`}
                    title={bp.enabled ? 'Disable breakpoint' : 'Enable breakpoint'}
                  >
                    <Icon className="w-4 h-4" fill={bp.enabled && bp.verified ? 'currentColor' : 'none'} />
                  </button>

                  {/* Info */}
                  <button
                    onClick={() => onNavigateToBreakpoint(bp)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-sm text-slate-300">
                      Line {bp.line}
                    </span>
                    {bp.condition && (
                      <span className="text-xs text-amber-400 truncate">
                        {bp.condition}
                      </span>
                    )}
                    {bp.logMessage && (
                      <span className="text-xs text-amber-400 truncate">
                        {`"${bp.logMessage}"`}
                      </span>
                    )}
                    {bp.hitCondition && (
                      <span className="text-xs text-slate-500">
                        (hit: {bp.hitCondition})
                      </span>
                    )}
                    {bp.hitCount !== undefined && bp.hitCount > 0 && (
                      <span className="text-xs text-indigo-400">
                        ×{bp.hitCount}
                      </span>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => onEditBreakpoint(bp)}
                      className="p-1 hover:bg-slate-700 rounded"
                      title="Edit breakpoint"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => onRemoveBreakpoint(bp.id)}
                      className="p-1 hover:bg-slate-700 rounded"
                      title="Remove breakpoint"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty state */}
        {breakpoints.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
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
          className={`flex items-center gap-2 px-2 py-1 hover:bg-slate-800/50 group ${
            disabled ? 'opacity-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {/* Expand toggle */}
          {expr.expandable ? (
            <button
              onClick={() => onToggleExpand?.(expr.id)}
              className="flex-shrink-0"
              disabled={disabled}
            >
              {expr.expanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
              className="flex-1 px-1 py-0.5 text-sm bg-slate-800 text-white rounded outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          ) : (
            <>
              <span className="text-sm text-indigo-400 font-mono">
                {expr.expression}
              </span>
              <span className="text-slate-600">:</span>
              {expr.error ? (
                <span className="text-sm text-red-400 truncate">
                  {expr.error}
                </span>
              ) : (
                <>
                  <span className={`text-sm font-mono truncate ${
                    expr.type === 'string' ? 'text-emerald-400' :
                    expr.type === 'number' ? 'text-amber-400' :
                    expr.type === 'boolean' ? 'text-blue-400' :
                    'text-slate-300'
                  }`}>
                    {expr.value ?? 'undefined'}
                  </span>
                  {expr.type && (
                    <span className="text-xs text-slate-500 ml-1">
                      {expr.type}
                    </span>
                  )}
                </>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 ml-auto">
            <button
              onClick={() => handleEdit(expr)}
              className="p-1 hover:bg-slate-700 rounded"
              title="Edit"
            >
              <Edit2 className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(expr.value || '')}
              className="p-1 hover:bg-slate-700 rounded"
              title="Copy value"
            >
              <Copy className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => onRemoveExpression(expr.id)}
              className="p-1 hover:bg-slate-700 rounded"
              title="Remove"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Children */}
        {expr.expanded && expr.children?.map(child => renderExpression(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">Watch</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-slate-800 rounded"
            title="Refresh all"
            disabled={disabled}
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Add expression */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <input
          type="text"
          value={newExpression}
          onChange={e => setNewExpression(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add expression..."
          className="flex-1 px-2 py-1 text-sm bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          disabled={disabled}
        />
        <button
          onClick={handleAdd}
          disabled={disabled || !newExpression.trim()}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Expressions */}
      <div className="flex-1 overflow-y-auto">
        {expressions.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
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
        return 'text-amber-400';
      case 'subtle':
        return 'text-slate-500 italic';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <Hash className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-white">Call Stack</span>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${disabled ? 'opacity-50' : ''}`}>
        {threads && threads.length > 1 ? (
          // Multi-threaded view
          threads.map(thread => (
            <div key={thread.id} className="border-b border-slate-800/50">
              <button
                onClick={() => {
                  toggleThread(thread.id);
                  onSelectThread?.(thread.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-800/50 ${
                  selectedThreadId === thread.id ? 'bg-indigo-600/10' : ''
                }`}
              >
                {expandedThreads.has(thread.id) ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <span className={thread.stopped ? 'text-amber-400' : 'text-slate-400'}>
                  {thread.stopped ? '⏸' : '▶'}
                </span>
                <span className="text-white">{thread.name}</span>
                {thread.stoppedReason && (
                  <span className="text-xs text-slate-500">
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
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
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
        return 'text-amber-400';
      case 'subtle':
        return 'text-slate-500 italic';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left hover:bg-slate-800/50 group ${
        isSelected ? 'bg-indigo-600/20' : ''
      }`}
    >
      {/* Frame number */}
      <span className="w-5 text-right text-xs text-slate-600">
        {index}
      </span>

      {/* Frame name */}
      <span className={`flex-1 truncate font-mono ${getFrameHint()}`}>
        {frame.name}
      </span>

      {/* Source info */}
      {frame.source && (
        <span className="text-xs text-slate-500 truncate max-w-32">
          {frame.source.name}:{frame.line}
        </span>
      )}

      {/* Restart button */}
      {onRestart && (
        <button
          onClick={e => {
            e.stopPropagation();
            onRestart();
          }}
          className="p-1 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100"
          title="Restart frame"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
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
    <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg">
      {buttons.map(({ icon: Icon, label, action, disabled, primary, danger }, index) => (
        <button
          key={label}
          onClick={action}
          disabled={disabled}
          title={label}
          className={`p-1.5 rounded transition-colors ${
            disabled
              ? 'text-slate-600 cursor-not-allowed'
              : primary
                ? 'text-emerald-400 hover:bg-emerald-600/20'
                : danger
                  ? 'text-red-400 hover:bg-red-600/20'
                  : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Icon className="w-4 h-4" fill={primary && !disabled ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default BreakpointsPanel;
