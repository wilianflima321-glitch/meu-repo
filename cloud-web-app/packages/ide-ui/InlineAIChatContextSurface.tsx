'use client'

import React from 'react'
import { tokens } from '../../web/lib/design-tokens'
import { Check, FileText, Sparkles } from 'lucide-react'

import { buildContextSummary, getInlineAIFileName, type InlineAIChatProps } from './InlineAIChat.helpers'
import {
  ACCENT_CYAN,
  ACCENT_SUCCESS,
  BORDER_PRIMARY,
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  mixColor,
} from './InlineAIChat.styles'
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
      style={{
        padding: tokens.spacing['3'],
        background: mixColor(ACCENT_CYAN, 8),
        borderBottom: `1px solid ${BORDER_SECONDARY}`,
      }}
    >
      <div
        style={{
          marginBottom: tokens.spacing['2'],
          color: ACCENT_CYAN,
          fontWeight: tokens.typography.fontWeight.medium,
          fontSize: tokens.typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Active context
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: tokens.spacing['2'],
        }}
      >
        {detailItems.map((item) => (
          <div
            key={item.label}
            style={{
              padding: tokens.spacing['3'],
              borderRadius: tokens.radius.lg,
              border: `1px solid ${mixColor(BORDER_PRIMARY, 70)}`,
              background: mixColor(SURFACE_PRIMARY, 76),
            }}
          >
            <div
              style={{
                marginBottom: tokens.spacing['1'],
                fontSize: tokens.typography.fontSize.xs,
                color: TEXT_TERTIARY,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm,
                color: TEXT_SECONDARY,
                lineHeight: tokens.typography.lineHeight.relaxed,
                wordBreak: 'break-word',
              }}
            >
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
    <div
      style={{
        padding: `${tokens.spacing['3']} ${tokens.spacing['4']} 0`,
      }}
    >
      <div
        style={{
          padding: tokens.spacing['3'],
          borderRadius: tokens.radius.xl,
          border: `1px solid ${BORDER_SECONDARY}`,
          background: mixColor(SURFACE_PRIMARY, 74),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.spacing['3'],
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.semibold,
              }}
            >
              {summary.scopeLabel}
            </div>
            <div
              style={{
                marginTop: tokens.spacing['1'],
                fontSize: tokens.typography.fontSize.xs,
                color: TEXT_SECONDARY,
                lineHeight: tokens.typography.lineHeight.relaxed,
              }}
            >
              {summary.operatorLabel}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['2'],
              flexWrap: 'wrap',
            }}
          >
            {activeFile && <ContextBadge label={getInlineAIFileName(activeFile.path)} icon={<FileText size={12} />} />}
            {projectContext && <ContextBadge label={`${projectContext.files.length} files`} icon={<Sparkles size={12} />} />}
            <ContextBadge
              label={summary.canApplyDirectly ? 'Manual application ready' : 'Modo consulta'}
              icon={<Check size={12} />}
              accent={summary.canApplyDirectly ? ACCENT_SUCCESS : TEXT_SECONDARY}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: tokens.spacing['3'],
            fontSize: tokens.typography.fontSize.xs,
            color: TEXT_TERTIARY,
          }}
        >
          {summary.detailLabel}
        </div>
      </div>
    </div>
  )
}
