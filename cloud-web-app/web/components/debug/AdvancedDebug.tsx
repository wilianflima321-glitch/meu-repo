"use client";

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
} from "react";
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
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

import { BreakpointEditor } from "./AdvancedDebug.editor";
import type {
  Breakpoint,
  BreakpointType,
  ExceptionBreakpoint,
  StackFrame,
  Thread,
  WatchExpression,
} from "./AdvancedDebug.types";
export { BreakpointEditor } from "./AdvancedDebug.editor";
export type {
  Breakpoint,
  BreakpointType,
  ExceptionBreakpoint,
  StackFrame,
  Thread,
  WatchExpression,
} from "./AdvancedDebug.types";

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
    if (bp.type === "logpoint") return MessageSquare;
    if (bp.type === "conditional") return CircleDot;
    return Circle;
  };

  const getBreakpointColor = (bp: Breakpoint) => {
    if (!bp.enabled) return "text-[var(--aethel-text-tertiary)]";
    if (!bp.verified) return "text-[var(--aethel-text-tertiary)]";
    if (bp.type === "logpoint") return "text-[var(--aethel-warning-light)]";
    return "text-[var(--aethel-error-light)]";
  };

  // Group breakpoints by file
  const groupedBreakpoints = useMemo(() => {
    const groups = new Map<string, Breakpoint[]>();
    breakpoints.forEach((bp) => {
      const existing = groups.get(bp.filePath) || [];
      existing.push(bp);
      groups.set(
        bp.filePath,
        existing.sort((a, b) => a.line - b.line),
      );
    });
    return groups;
  }, [breakpoints]);

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-[var(--aethel-error-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
            Breakpoints
          </span>
          <span className="text-xs text-[var(--aethel-text-tertiary)] bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 rounded">
            {breakpoints.length}
          </span>
        </div>
        {onRemoveAll && breakpoints.length > 0 && (
          <button
            type="button"
            aria-label="Remove all breakpoints"
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
            <button
              type="button"
              aria-label={
                showExceptions
                  ? "Collapse exception breakpoints"
                  : "Expand exception breakpoints"
              }
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
                {exceptionBreakpoints.map((ex) => (
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
                    <span
                      className={
                        ex.enabled
                          ? "text-[var(--aethel-text-primary)]"
                          : "text-[var(--aethel-text-tertiary)]"
                      }
                    >
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
          <div
            key={filePath}
            className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_50%,transparent)]"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--aethel-text-tertiary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_30%,transparent)]">
              <FileCode className="w-3.5 h-3.5" />
              <span className="truncate">{getFileName(filePath)}</span>
            </div>

            {bps.map((bp) => {
              const Icon = getBreakpointIcon(bp);
              const colorClass = getBreakpointColor(bp);

              return (
                <div
                  key={bp.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] group"
                >
                  {/* Toggle */}
                  <button
                    type="button"
                    aria-label={
                      bp.enabled
                        ? `Disable breakpoint on line ${bp.line}`
                        : `Enable breakpoint on line ${bp.line}`
                    }
                    onClick={() => onToggleBreakpoint(bp.id)}
                    className={`flex-shrink-0 ${colorClass}`}
                    title={
                      bp.enabled ? "Disable breakpoint" : "Enable breakpoint"
                    }
                  >
                    <Icon
                      className="w-4 h-4"
                      fill={bp.enabled && bp.verified ? "currentColor" : "none"}
                    />
                  </button>

                  {/* Info */}
                  <button
                    type="button"
                    aria-label={`Go to breakpoint on line ${bp.line}`}
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
                        x{bp.hitCount}
                      </span>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`Edit breakpoint on line ${bp.line}`}
                      onClick={() => onEditBreakpoint(bp)}
                      className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
                      title="Edit breakpoint"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove breakpoint on line ${bp.line}`}
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
            <p className="text-xs mt-1">Click the gutter or press F9 to add</p>
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
  const [newExpression, setNewExpression] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (newExpression.trim()) {
      onAddExpression(newExpression.trim());
      setNewExpression("");
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
    setEditValue("");
  };

  const renderExpression = (expr: WatchExpression, depth = 0): ReactNode => {
    const isEditing = editingId === expr.id;

    return (
      <div key={expr.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] group ${
            disabled ? "opacity-50" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {/* Expand toggle */}
          {expr.expandable ? (
            <button
              type="button"
              aria-label={
                expr.expanded
                  ? `Collapse expression ${expr.expression}`
                  : `Expand expression ${expr.expression}`
              }
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
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditValue("");
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
                  <span
                    className={`text-sm font-mono truncate ${
                      expr.type === "string"
                        ? "text-[var(--aethel-success-light)]"
                        : expr.type === "number"
                          ? "text-[var(--aethel-warning-light)]"
                          : expr.type === "boolean"
                            ? "text-[var(--aethel-info-light)]"
                            : "text-[var(--aethel-text-secondary)]"
                    }`}
                  >
                    {expr.value ?? "undefined"}
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
            <button
              type="button"
              aria-label={`Edit expression ${expr.expression}`}
              onClick={() => handleEdit(expr)}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Edit"
            >
              <Edit2 className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
            </button>
            <button
              type="button"
              aria-label={`Copiar valor de ${expr.expression}`}
              onClick={() => navigator.clipboard.writeText(expr.value || "")}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Copy value"
            >
              <Copy className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
            </button>
            <button
              type="button"
              aria-label={`Remove expression ${expr.expression}`}
              onClick={() => onRemoveExpression(expr.id)}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Remove"
            >
              <X className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Children */}
        {expr.expanded &&
          expr.children?.map((child) => renderExpression(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--aethel-info-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
            Watch
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            aria-label="Refresh expressoes observadas"
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
          onChange={(e) => setNewExpression(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add expression..."
          className="flex-1 px-2 py-1 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
          disabled={disabled}
        />
        <button
          type="button"
          aria-label="Add watch expression"
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
          expressions.map((expr) => renderExpression(expr))
        )}
      </div>
    </div>
  );
}

export { CallStackPanel, DebugToolbar } from "./AdvancedDebug.stack";

export default BreakpointsPanel;
