'use client';

import type { FullscreenIDEWorkspaceBridgeProps } from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types';
import {
  buildFullscreenIDEBridgeChromeProps,
  buildFullscreenIDEBridgeEditorProps,
  buildFullscreenIDEBridgeFileProps,
  buildFullscreenIDEBridgePreviewProps,
} from '@/components/ide/fullscreen/useFullscreenIDEBridgeSections';
import type { UseFullscreenIDEBridgePropsArgs } from '@/components/ide/fullscreen/useFullscreenIDEBridgeProps.types';

export function useFullscreenIDEBridgeProps(args: UseFullscreenIDEBridgePropsArgs): FullscreenIDEWorkspaceBridgeProps {
  return {
    chrome: buildFullscreenIDEBridgeChromeProps(args),
    files: buildFullscreenIDEBridgeFileProps(args),
    editor: buildFullscreenIDEBridgeEditorProps(args),
    preview: buildFullscreenIDEBridgePreviewProps(args),
  };
}
