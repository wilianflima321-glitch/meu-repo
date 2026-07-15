"use client";

import { Suspense } from "react";

import { FullscreenIDEWorkspace } from './fullscreen/FullscreenIDEWorkspace';
import { useFullscreenIDEOrchestrator } from './fullscreen/useFullscreenIDEOrchestrator';
import { useFullscreenIDEWorkspaceProps } from './fullscreen/useFullscreenIDEWorkspaceProps';

function IDEContent() {
  const bridgeProps = useFullscreenIDEOrchestrator();
  const workspaceProps = useFullscreenIDEWorkspaceProps(bridgeProps);
  return <FullscreenIDEWorkspace {...workspaceProps} />;
}

export default function FullscreenIDE() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center px-6 text-sm text-[var(--aethel-text-tertiary)]">
          Loading workspace context...
        </div>
      }
    >
      <IDEContent />
    </Suspense>
  );
}
