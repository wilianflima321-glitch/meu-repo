"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Box,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Layers,
  Sparkles,
  Eye,
  Target,
  Settings,
  Bomb,
  RotateCcw,
} from "lucide-react";
import type { DestructionToolType, FracturePattern } from "./DestructionEditor.model";

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  icon,
}: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
          {icon}
          {label}
        </label>
        <span className="text-xs text-[var(--aethel-text-secondary)] font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-[var(--aethel-surface-quaternary)] rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-[var(--aethel-error)]
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-1.5 text-sm text-[var(--aethel-text-primary)]
                   hover:text-[var(--aethel-text-primary)] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {icon}
        {title}
      </button>
      {isOpen && <div className="pl-6 pt-2">{children}</div>}
    </div>
  );
}

// ============================================================================
// PATTERN SELECTOR
// ============================================================================

interface PatternSelectorProps {
  value: FracturePattern;
  onChange: (pattern: FracturePattern) => void;
}

export function PatternSelector({ value, onChange }: PatternSelectorProps) {
  const patterns: {
    id: FracturePattern;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      id: "voronoi",
      label: "Voronoi",
      icon: <Box className="w-4 h-4" />,
      description: "Following impact direction",
    },
    {
      id: "radial",
      label: "Radial",
      icon: <CircleDot className="w-4 h-4" />,
      description: "Fragments from the center outward",
    },
    {
      id: "directional",
      label: "Directional",
      icon: <ArrowRight className="w-4 h-4" />,
      description: "Following impact direction",
    },
    {
      id: "slice",
      label: "Slice",
      icon: <Layers className="w-4 h-4" />,
      description: "Parallel cuts",
    },
    {
      id: "shatter",
      label: "Shatter",
      icon: <Sparkles className="w-4 h-4" />,
      description: "Many small fragments",
    },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[var(--aethel-text-secondary)] block mb-2">
        Fracture Pattern
      </label>
      {patterns.map((pattern) => (
        <button
          type="button"
          key={pattern.id}
          onClick={() => onChange(pattern.id)}
          className={`w-full p-2 rounded flex items-center gap-2 transition-colors ${
            value === pattern.id
              ? "bg-[var(--aethel-error-dark)]/30 border border-[color-mix(in_srgb,var(--aethel-error)_60%,transparent)] text-[var(--aethel-text-primary)]"
              : "bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]"
          }`}
        >
          {pattern.icon}
          <div className="text-left">
            <div className="text-xs font-medium">{pattern.label}</div>
            <div className="text-[10px] opacity-70">{pattern.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// DESTRUCTION LEVELS
// ============================================================================

interface DestructionLevelsProps {
  levels: number;
  currentLevel: number;
  health: number;
  maxHealth: number;
}

export function DestructionLevels({
  levels,
  currentLevel,
  health,
  maxHealth,
}: DestructionLevelsProps) {
  const healthPerLevel = maxHealth / levels;

  return (
    <div className="space-y-1.5">
      {Array.from({ length: levels }).map((_, i) => {
        const levelHealth = Math.max(
          0,
          Math.min(healthPerLevel, health - i * healthPerLevel),
        );
        const percent = levelHealth / healthPerLevel;
        const isActive = i === currentLevel;

        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                isActive
                  ? "bg-[var(--aethel-error-dark)] text-[var(--aethel-text-primary)]"
                  : "bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]"
              }`}
            >
              {levels - i}
            </div>
            <div className="flex-1 h-2 bg-[var(--aethel-surface-quaternary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--aethel-error)] to-[var(--aethel-warning-dark)] transition-all"
                style={{ width: `${percent * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--aethel-text-tertiary)] w-8">
              {(percent * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TOOLBAR
// ============================================================================

interface ToolbarProps {
  selectedTool: DestructionToolType;
  onToolChange: (tool: DestructionToolType) => void;
  onPreviewDestruction: () => void;
  onReset: () => void;
}

export function Toolbar({
  selectedTool,
  onToolChange,
  onPreviewDestruction,
  onReset,
}: ToolbarProps) {
  const tools: {
    id: DestructionToolType;
    icon: React.ReactNode;
    label: string;
  }[] = [
    { id: "view", icon: <Eye className="w-4 h-4" />, label: "View" },
    {
      id: "impact",
      icon: <Target className="w-4 h-4" />,
      label: "Set Impact Point",
    },
    {
      id: "configure",
      icon: <Settings className="w-4 h-4" />,
      label: "Configure",
    },
  ];

  return (
    <div className="flex flex-col gap-1 p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_90%,transparent)] rounded-lg">
      {/* Action buttons */}
      <button
        type="button"
        onClick={onPreviewDestruction}
        className="p-2 rounded bg-[var(--aethel-error-dark)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-error)] transition-colors"
        title="Test Destruction"
      >
        <Bomb className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onReset}
        className="p-2 rounded bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] transition-colors"
        title="Reset"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="h-px bg-[var(--aethel-surface-quaternary)] my-2" />

      {/* Tools */}
      {tools.map((tool) => (
        <button
          type="button"
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`p-2 rounded transition-colors ${
            selectedTool === tool.id
              ? "bg-[var(--aethel-error-dark)] text-[var(--aethel-text-primary)]"
              : "bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]"
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}
