"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FastForward,
  Hash,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";

import type { StackFrame, Thread } from "./AdvancedDebug.types";

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
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(
    new Set([selectedThreadId || 1]),
  );

  const toggleThread = (id: number) => {
    setExpandedThreads((prev) => {
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
      case "label":
        return "text-[var(--aethel-warning-light)]";
      case "subtle":
        return "text-[var(--aethel-text-tertiary)] italic";
      default:
        return "text-[var(--aethel-text-secondary)]";
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-secondary)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <Hash className="w-4 h-4 text-[var(--aethel-warning-light)]" />
        <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
          Call Stack
        </span>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${disabled ? "opacity-50" : ""}`}>
        {threads && threads.length > 1
          ? // Multi-threaded view
            threads.map((thread) => (
              <div
                key={thread.id}
                className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_50%,transparent)]"
              >
                <button
                  type="button"
                  aria-label={
                    expandedThreads.has(thread.id)
                      ? `Collapse thread ${thread.name}`
                      : `Expand thread ${thread.name}`
                  }
                  onClick={() => {
                    toggleThread(thread.id);
                    onSelectThread?.(thread.id);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] ${
                    selectedThreadId === thread.id
                      ? "bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]"
                      : ""
                  }`}
                >
                  {expandedThreads.has(thread.id) ? (
                    <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                  )}
                  <span
                    className={
                      thread.stopped
                        ? "text-[var(--aethel-warning-light)]"
                        : "text-[var(--aethel-text-tertiary)]"
                    }
                  >
                    {thread.stopped ? "⏸" : "▶"}
                  </span>
                  <span className="text-[var(--aethel-text-primary)]">
                    {thread.name}
                  </span>
                  {thread.stoppedReason && (
                    <span className="text-xs text-[var(--aethel-text-tertiary)]">
                      ({thread.stoppedReason})
                    </span>
                  )}
                </button>

                {expandedThreads.has(thread.id) &&
                  selectedThreadId === thread.id && (
                    <div className="pb-2">
                      {frames.map((frame, index) => (
                        <StackFrameItem
                          key={frame.id}
                          frame={frame}
                          index={index}
                          isSelected={frame.id === selectedFrameId}
                          onSelect={() => onSelectFrame(frame.id)}
                          onRestart={
                            onRestartFrame
                              ? () => onRestartFrame(frame.id)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
              </div>
            ))
          : // Single thread view
            frames.map((frame, index) => (
              <StackFrameItem
                key={frame.id}
                frame={frame}
                index={index}
                isSelected={frame.id === selectedFrameId}
                onSelect={() => onSelectFrame(frame.id)}
                onRestart={
                  onRestartFrame ? () => onRestartFrame(frame.id) : undefined
                }
              />
            ))}

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
      case "label":
        return "text-[var(--aethel-warning-light)]";
      case "subtle":
        return "text-[var(--aethel-text-tertiary)] italic";
      default:
        return "text-[var(--aethel-text-secondary)]";
    }
  };

  return (
    <button
      type="button"
      aria-label={`Select frame ${frame.name}`}
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] group ${
        isSelected
          ? "bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
          : ""
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
        <button
          type="button"
          aria-label={`Restart frame ${frame.name}`}
          onClick={(e) => {
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
  state: "idle" | "running" | "paused" | "initializing";
  onContinue: () => void;
  onPause: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onRestart: () => void;
  onStop: () => void;
}) {
  const isPaused = state === "paused";
  const isRunning = state === "running";
  const isActive = isPaused || isRunning;

  const buttons = [
    {
      icon: isPaused ? Play : Pause,
      label: isPaused ? "Continue (F5)" : "Pause (F6)",
      action: isPaused ? onContinue : onPause,
      disabled: !isActive,
      primary: isPaused,
    },
    {
      icon: FastForward,
      label: "Step Over (F10)",
      action: onStepOver,
      disabled: !isPaused,
    },
    {
      icon: ArrowDown,
      label: "Step Into (F11)",
      action: onStepInto,
      disabled: !isPaused,
    },
    {
      icon: ArrowUp,
      label: "Step Out (Shift+F11)",
      action: onStepOut,
      disabled: !isPaused,
    },
    {
      icon: RotateCcw,
      label: "Restart (Ctrl+Shift+F5)",
      action: onRestart,
      disabled: !isActive,
    },
    {
      icon: Square,
      label: "Stop (Shift+F5)",
      action: onStop,
      disabled: !isActive,
      danger: true,
    },
  ];

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded-lg">
      {buttons.map(
        ({ icon: Icon, label, action, disabled, primary, danger }, index) => (
          <button
            type="button"
            aria-label={label}
            key={label}
            onClick={action}
            disabled={disabled}
            title={label}
            className={`p-1.5 rounded transition-colors ${
              disabled
                ? "text-[var(--aethel-text-quaternary)] cursor-not-allowed"
                : primary
                  ? "text-[var(--aethel-success-light)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]"
                  : danger
                    ? "text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
                    : "text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]"
            }`}
          >
            <Icon
              className="w-4 h-4"
              fill={primary && !disabled ? "currentColor" : "none"}
            />
          </button>
        ),
      )}
    </div>
  );
}
