export type AethelPluginRisk = 'read-only' | 'project-write' | 'external-network' | 'high-risk-action';

export interface AethelCommandContribution {
  id: string;
  title: string;
  risk: AethelPluginRisk;
  requiresEvidence: boolean;
}

export interface AethelPanelContribution {
  id: string;
  title: string;
  location: 'sidebar' | 'bottom-panel' | 'studio-panel';
}

export interface AethelAgentContribution {
  role: string;
  description: string;
  allowedTools: string[];
}

export interface AethelPluginContext {
  pluginId: string;
  emitEvidence(event: { title: string; body: string; risk: AethelPluginRisk }): Promise<void>;
  requestApproval(action: { title: string; body: string; risk: AethelPluginRisk }): Promise<boolean>;
}

export interface AethelPlugin {
  id: string;
  name: string;
  version: string;
  contributes: {
    commands?: AethelCommandContribution[];
    panels?: AethelPanelContribution[];
    agents?: AethelAgentContribution[];
  };
  activate(context: AethelPluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
