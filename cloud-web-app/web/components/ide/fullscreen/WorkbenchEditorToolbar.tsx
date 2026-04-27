'use client';

import type { Dispatch, SetStateAction } from 'react';

import CollaboratorsBar from '@/components/collaboration/CollaboratorsBar';
import type {
  EditorPane,
  WorkbenchCollaborationStatus,
} from '@/components/ide/fullscreen/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';
import type { SplitDirection } from '@/components/editor/SplitEditor';

type WorkbenchEditorToolbarProps = {
  isCompactViewport: boolean;
  collaborationConnected: boolean;
  collaborationStatus: WorkbenchCollaborationStatus;
  collaborationPeers: RemotePeer[];
  splitEditorOpen: boolean;
  nextOpenTarget: EditorPane;
  splitDirection: SplitDirection;
  showIntelliSense: boolean;
  showOutline: boolean;
  showDiagnostics: boolean;
  setNextOpenTarget: Dispatch<SetStateAction<EditorPane>>;
  setSplitDirection: Dispatch<SetStateAction<SplitDirection>>;
  setShowIntelliSense: Dispatch<SetStateAction<boolean>>;
  setShowOutline: Dispatch<SetStateAction<boolean>>;
  setShowDiagnostics: Dispatch<SetStateAction<boolean>>;
  onFind: () => void;
  onReplace: () => void;
  onToggleSplitEditor: () => void;
};

const actionButtonClass =
  'rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium transition-colors';
const inactiveActionClass =
  'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]';

function PresenceChip({
  collaborationConnected,
  collaborationStatus,
}: {
  collaborationConnected: boolean;
  collaborationStatus: WorkbenchCollaborationStatus;
}) {
  const toneClasses =
    collaborationStatus.tone === 'success'
      ? {
          border: 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)]',
          background:
            'bg-[color-mix(in_srgb,var(--aethel-success)_12%,var(--aethel-surface-secondary)_88%)]',
          text: 'text-[var(--aethel-success-light)]',
          dot: 'bg-[var(--aethel-success)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--aethel-success)_16%,transparent)]',
        }
      : collaborationStatus.tone === 'danger'
        ? {
            border: 'border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)]',
            background:
              'bg-[color-mix(in_srgb,var(--aethel-error)_12%,var(--aethel-surface-secondary)_88%)]',
            text: 'text-[var(--aethel-error-light)]',
            dot: 'bg-[var(--aethel-error)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--aethel-error)_14%,transparent)]',
          }
        : collaborationStatus.tone === 'warning'
          ? {
              border: 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]',
              background:
                'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,var(--aethel-surface-secondary)_88%)]',
              text: 'text-[var(--aethel-warning-light)]',
              dot: 'bg-[var(--aethel-warning)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--aethel-warning)_16%,transparent)]',
            }
          : {
              border: 'border-[var(--aethel-border-secondary)]',
              background: 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)]',
              text: 'text-[var(--aethel-text-tertiary)]',
              dot: collaborationConnected
                ? 'bg-[var(--aethel-success)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--aethel-success)_16%,transparent)]'
                : 'bg-[var(--aethel-text-quaternary)]',
            };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${toneClasses.border} ${toneClasses.background} ${toneClasses.text}`}
      title={collaborationStatus.errorMessage ?? collaborationStatus.detail}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-full ${toneClasses.dot}`}
      />
      {collaborationStatus.label}
    </div>
  );
}

export default function WorkbenchEditorToolbar({
  isCompactViewport,
  collaborationConnected,
  collaborationStatus,
  collaborationPeers,
  splitEditorOpen,
  nextOpenTarget,
  splitDirection,
  showIntelliSense,
  showOutline,
  showDiagnostics,
  setNextOpenTarget,
  setSplitDirection,
  setShowIntelliSense,
  setShowOutline,
  setShowDiagnostics,
  onFind,
  onReplace,
  onToggleSplitEditor,
}: WorkbenchEditorToolbarProps) {
  const showCollaborators =
    collaborationStatus.state === 'live' && collaborationPeers.length > 0;
  const helperDetail = collaborationStatus.detail;

  return (
    <>
      {isCompactViewport && (
        <div className="border-b border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-4 py-3.5 text-xs leading-6 text-[color-mix(in_srgb,var(--aethel-warning-light)_70%,transparent)]">
          Viewport compacto detectado. Para melhor experiencia use desktop com {'>='} 1024px.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-2.5 text-[11px]">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-col text-[var(--aethel-text-tertiary)]">
            <span className="font-medium uppercase tracking-[0.12em]">Ferramentas do editor</span>
            <span
              className="truncate pt-1 text-[11px] text-[var(--aethel-text-secondary)]"
              title={collaborationStatus.errorMessage ?? helperDetail}
            >
              {helperDetail}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="hidden h-7 w-px bg-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] sm:block"
          />
          {showCollaborators ? (
            <CollaboratorsBar
              peers={collaborationPeers}
              maxVisible={4}
              showStatusDot
              className="max-w-full"
            />
          ) : (
            <PresenceChip
              collaborationConnected={collaborationConnected}
              collaborationStatus={collaborationStatus}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onFind}
            className={`${actionButtonClass} ${inactiveActionClass}`}
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={onReplace}
            className={`${actionButtonClass} ${inactiveActionClass}`}
          >
            Substituir
          </button>
          <button
            type="button"
            onClick={onToggleSplitEditor}
            className={`${actionButtonClass} ${
              splitEditorOpen
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                : inactiveActionClass
            }`}
          >
            {splitEditorOpen ? 'Fechar split' : 'Dividir editor'}
          </button>
          {splitEditorOpen && (
            <>
              <button
                type="button"
                onClick={() => setNextOpenTarget((prev) => (prev === 'secondary' ? 'primary' : 'secondary'))}
                className={`${actionButtonClass} ${
                  nextOpenTarget === 'secondary'
                    ? 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success-light)]'
                    : inactiveActionClass
                }`}
              >
                {nextOpenTarget === 'secondary' ? 'Proximo arquivo: lateral' : 'Proximo arquivo: principal'}
              </button>
              <button
                type="button"
                onClick={() => setSplitDirection((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))}
                className={`${actionButtonClass} ${inactiveActionClass}`}
              >
                {splitDirection === 'horizontal' ? 'Empilhar verticalmente' : 'Dividir lado a lado'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowIntelliSense((prev) => !prev)}
            className={`${actionButtonClass} ${
              showIntelliSense
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
                : inactiveActionClass
            }`}
          >
            IntelliSense
          </button>
          <button
            type="button"
            onClick={() => setShowOutline((prev) => !prev)}
            className={`${actionButtonClass} ${
              showOutline
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                : inactiveActionClass
            }`}
          >
            Outline
          </button>
          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className={`${actionButtonClass} ${
              showDiagnostics
                ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[var(--aethel-warning-light)]'
                : inactiveActionClass
            }`}
          >
            Diagnosticos
          </button>
        </div>
      </div>
    </>
  );
}
