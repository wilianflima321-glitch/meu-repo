'use client';

import type { FullscreenIDEWorkspaceBridgeProps } from './FullscreenIDEWorkspaceBridge.types';
import {
  buildFullscreenIDEBridgeChromeProps,
  buildFullscreenIDEBridgeEditorProps,
  buildFullscreenIDEBridgeFileProps,
  buildFullscreenIDEBridgePreviewProps,
} from './useFullscreenIDEBridgeSections';
import type { UseFullscreenIDEBridgePropsArgs } from './useFullscreenIDEBridgeProps.types';

export function useFullscreenIDEBridgeProps(args: UseFullscreenIDEBridgePropsArgs): FullscreenIDEWorkspaceBridgeProps {
  return {
    chrome: buildFullscreenIDEBridgeChromeProps(args),
    files: buildFullscreenIDEBridgeFileProps(args),
    editor: buildFullscreenIDEBridgeEditorProps(args),
    preview: buildFullscreenIDEBridgePreviewProps(args),
  };
}
