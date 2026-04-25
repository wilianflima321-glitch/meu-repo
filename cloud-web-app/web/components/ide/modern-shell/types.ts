export interface PanelState {
  sidebar: { open: boolean; size: number };
  editor: { open: boolean; size: number };
  preview: { open: boolean; size: number };
  chat: { open: boolean; size: number };
}

export type SidebarTab = 'explorer' | 'git';

export type BottomPanelMode = 'chat' | 'terminal';

export type PreviewMode = 'runtime' | 'device' | 'console' | 'viewport3d' | 'canvas';
