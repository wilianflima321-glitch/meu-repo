'use client'

import React from 'react'
import { Check, FileText, Sparkles } from 'lucide-react'

import { buildContextSummary, getInlineAIFileName, type InlineAIChatProps } from './InlineAIChat.helpers'
import { ContextBadge } from './InlineAIChatPrimitives'

type InlineAIContextPanelProps = {
  activeFile?: InlineAIChatProps['activeFile']
  id: string
  projectContext?: InlineAIChatProps['projectContext']
}

type InlineAIStatusCardProps = {
  activeFile?: InlineAIChatProps['activeFile']
  projectContext?: InlineAIChatProps['projectContext']
  summary: ReturnType<typeof buildContextSummary>
}

function buildContextDetailItems(
  activeFile?: InlineAIChatProps['activeFile'],
  projectContext?: InlineAIChatProps['projectContext'],
) {
  return [
    {
      label: 'File',
      value: activeFile?.path ?? 'No file open',
    },
    {
      label: 'Language',
      value: activeFile?.language ?? 'No active language',
    },
    {
      label: 'Size',
      value: activeFile ? `${activeFile.content.length} characters` : 'No buffer attached',
    },
    {
      label: 'Project',
      value: projectContext
        ? `${projectContext.name} - ${projectContext.files.length} files`
        : 'No project attached',
    },
    {
      label: 'Operator output',
      value: 'Explanation, review, and applicable code blocks',
    },
    {
      label: 'Application',
      value: 'Always manual and explicit through the Apply button',
    },
  ]
}

export function InlineAIContextPanel({
  activeFile,
  id,
  projectContext,
}: InlineAIContextPanelProps) {
  const detailItems = buildContextDetailItems(activeFile, projectContext)

  return (
    <div
      id={id}
      className="p-3 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)]"
    >
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--aethel-info)]">
        Active context
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        {detailItems.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)] p-3"
          >
            <div className="mb-1 text-xs text-[var(--aethel-text-tertiary)]">
              {item.label}
            </div>
            <div className="break-words text-sm leading-relaxed text-[var(--aethel-text-secondary)]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InlineAIStatusCard({
  activeFile,
  projectContext,
  summary,
}: InlineAIStatusCardProps) {
  return (
    <div className="px-4 pt-3">
      <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              {summary.scopeLabel}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-[var(--aethel-text-secondary)]">
              {summary.operatorLabel}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeFile && <ContextBadge label={getInlineAIFileName(activeFile.path)} icon={<FileText size={12} />} />}
            {projectContext && <ContextBadge label={`${projectContext.files.length} files`} icon={<Sparkles size={12} />} />}
            <ContextBadge
              label={summary.canApplyDirectly ? 'Manual application ready' : 'Query mode'}
              icon={<Check size={12} />}
              accentClass={summary.canApplyDirectly ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-text-secondary)]'}
            />
          </div>
        </div>

        <div
          className="mt-3 text-xs text-[var(--aethel-text-tertiary)]"
        >
          {summary.detailLabel}
        </div>
      </div>
    </div>
  )
}
