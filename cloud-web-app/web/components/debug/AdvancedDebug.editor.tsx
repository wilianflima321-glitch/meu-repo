"use client";

import React, { useEffect, useRef, useState } from "react";
import { Circle, CircleDot, MessageSquare } from "lucide-react";
import type { Breakpoint, BreakpointType } from "./AdvancedDebug.types";

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
  const [type, setType] = useState<BreakpointType>(
    breakpoint?.type || "breakpoint",
  );
  const [condition, setCondition] = useState(breakpoint?.condition || "");
  const [hitCondition, setHitCondition] = useState(
    breakpoint?.hitCondition || "",
  );
  const [logMessage, setLogMessage] = useState(breakpoint?.logMessage || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const handleSave = () => {
    onSave({
      ...breakpoint,
      type,
      condition: type === "conditional" ? condition : undefined,
      hitCondition: hitCondition || undefined,
      logMessage: type === "logpoint" ? logMessage : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
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
          { value: "breakpoint", label: "Breakpoint", icon: Circle },
          { value: "conditional", label: "Conditional", icon: CircleDot },
          { value: "logpoint", label: "Logpoint", icon: MessageSquare },
        ].map(({ value, label, icon: Icon }) => (
          <button
            type="button"
            aria-label={`Select type ${label} para breakpoint`}
            key={value}
            onClick={() => setType(value as BreakpointType)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
              type === value
                ? "bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)] border-b-2 border-[var(--aethel-info)]"
                : "text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3" onKeyDown={handleKeyDown}>
        {/* Conditional expression */}
        {type === "conditional" && (
          <div>
            <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">
              Expression (break when true)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g., i > 10 && user.name === 'test'"
              className="w-full px-2 py-1.5 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
            />
          </div>
        )}

        {/* Log message */}
        {type === "logpoint" && (
          <div>
            <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">
              Log message (use {"{expression}"} for values)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={logMessage}
              onChange={(e) => setLogMessage(e.target.value)}
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
            onChange={(e) => setHitCondition(e.target.value)}
            placeholder="e.g., >= 10, == 5, % 2 == 0"
            className="w-full px-2 py-1.5 text-sm bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)] font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            aria-label="Cancel breakpoint configuration"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label={
              breakpoint?.id ? "Refresh breakpoint" : "Add breakpoint"
            }
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] rounded transition-colors hover:brightness-110"
          >
            {breakpoint?.id ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
