export type AethelMcpRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AethelMcpToolEvidence {
  ledgerId: string;
  sources: string[];
  screenshots?: string[];
  commands?: string[];
  costUSD?: number;
}

export interface AethelMcpToolDescriptor {
  name: string;
  description: string;
  riskLevel: AethelMcpRiskLevel;
  requiresApproval: boolean;
  timeoutMs: number;
  evidenceRequired: boolean;
}

export interface AethelMcpToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  evidence: AethelMcpToolEvidence;
}

export interface AethelMcpClient {
  listTools(): Promise<AethelMcpToolDescriptor[]>;
  callTool<TInput, TOutput>(
    name: string,
    input: TInput,
    options?: { missionId?: string; approvalToken?: string },
  ): Promise<AethelMcpToolResult<TOutput>>;
}
