/**
 * Tool definition
 */
export interface Tool {
    id: string;
    name: string;
    description: string;
    domain: 'code' | 'trading' | 'research' | 'creative' | 'shared';
    category: string;
    requiresApproval: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    costEstimate: number;
    parameters: ToolParameter[];
    guardrails: Guardrail[];
}
/**
 * Tool parameter
 */
export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    description: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        enum?: any[];
    };
}
/**
 * Guardrail definition
 */
export interface Guardrail {
    id: string;
    type: 'pre' | 'post';
    check: string;
    action: 'block' | 'warn' | 'require-approval';
    message: string;
}
/**
 * Toolchain definition
 */
export interface Toolchain {
    id: string;
    name: string;
    domain: 'code' | 'trading' | 'research' | 'creative';
    description: string;
    tools: string[];
    workflow: WorkflowStage[];
    policies: Policy[];
    slos: SLO[];
}
/**
 * Workflow stage
 */
export interface WorkflowStage {
    id: string;
    name: string;
    tools: string[];
    critics: string[];
    requiresApproval: boolean;
    canRollback: boolean;
}
/**
 * Policy definition
 */
export interface Policy {
    id: string;
    rule: string;
    enforcement: 'strict' | 'advisory';
    message: string;
}
/**
 * SLO definition
 */
export interface SLO {
    metric: string;
    target: number;
    unit: string;
    alertThreshold: number;
}
/**
 * Toolchain registry with domain-specific configurations
 */
export declare class ToolchainRegistry {
    private tools;
    private toolchains;
    constructor();
    /**
     * Get tool by ID
     */
    getTool(id: string): Tool | undefined;
    /**
     * Get toolchain by ID
     */
    getToolchain(id: string): Toolchain | undefined;
    /**
     * Get tools for domain
     */
    getToolsForDomain(domain: string): Tool[];
    /**
     * Validate tool execution
     */
    validateExecution(toolId: string, params: any): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    private registerTools;
    private registerToolchains;
}
