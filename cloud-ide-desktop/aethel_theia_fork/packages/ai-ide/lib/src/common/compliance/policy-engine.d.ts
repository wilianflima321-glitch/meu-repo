import { Event } from '@theia/core';
/**
 * Policy rule
 */
export interface PolicyRule {
    id: string;
    name: string;
    domain: 'code' | 'trading' | 'research' | 'creative' | 'all';
    type: 'guardrail' | 'compliance' | 'cost' | 'security';
    condition: string;
    action: 'block' | 'warn' | 'require-approval' | 'log';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
}
/**
 * Policy evaluation context
 */
export interface PolicyContext {
    domain: 'code' | 'trading' | 'research' | 'creative';
    action: string;
    tool: string;
    parameters: any;
    user: {
        id: string;
        plan: 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
        permissions: string[];
    };
    workspace: {
        id: string;
        budget: {
            total: number;
            spent: number;
            remaining: number;
        };
    };
    history?: any[];
}
/**
 * Policy evaluation result
 */
export interface PolicyEvaluation {
    allowed: boolean;
    requiresApproval: boolean;
    violations: PolicyViolation[];
    warnings: string[];
    estimatedCost?: number;
    estimatedRisk?: 'low' | 'medium' | 'high';
}
/**
 * Policy violation
 */
export interface PolicyViolation {
    ruleId: string;
    ruleName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    action: 'block' | 'warn' | 'require-approval' | 'log';
}
/**
 * Approval request
 */
export interface ApprovalRequest {
    id: string;
    context: PolicyContext;
    violations: PolicyViolation[];
    estimatedCost: number;
    estimatedRisk: 'low' | 'medium' | 'high';
    requestedBy: string;
    requestedAt: number;
    expiresAt: number;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    approvedBy?: string;
    approvedAt?: number;
    rejectionReason?: string;
}
/**
 * Policy engine with domain-specific guardrails
 */
export declare class PolicyEngine {
    private rules;
    private planLimits;
    private approvalRequests;
    private readonly onPolicyViolationEmitter;
    readonly onPolicyViolation: Event<PolicyViolation>;
    private readonly onApprovalRequiredEmitter;
    readonly onApprovalRequired: Event<ApprovalRequest>;
    private readonly configService;
    constructor();
    /**
     * Initialize policy engine (call after ConfigService is loaded)
     */
    initialize(): Promise<void>;
    /**
     * Evaluate policy for action
     */
    evaluate(context: PolicyContext): Promise<PolicyEvaluation>;
    /**
     * Request approval
     */
    requestApproval(context: PolicyContext, violations: PolicyViolation[]): Promise<ApprovalRequest>;
    /**
     * Approve request
     */
    approve(requestId: string, approverId: string): Promise<void>;
    /**
     * Reject request
     */
    reject(requestId: string, approverId: string, reason: string): Promise<void>;
    /**
     * Get approval request
     */
    getApprovalRequest(requestId: string): ApprovalRequest | undefined;
    /**
     * Get pending approvals for user
     */
    getPendingApprovals(userId: string): ApprovalRequest[];
    /**
     * Add custom rule
     */
    addRule(rule: PolicyRule): void;
    /**
     * Remove rule
     */
    removeRule(ruleId: string): void;
    /**
     * Enable/disable rule
     */
    setRuleEnabled(ruleId: string, enabled: boolean): void;
    /**
     * Load rules from ConfigService
     */
    private loadRulesFromConfig;
    private initializePlanLimits;
    private getApplicableRules;
    private evaluateRule;
    private checkPlanLimits;
    private estimateCost;
    private estimateRisk;
    private createApprovalRequest;
    private containsSecrets;
    private containsPII;
    /**
     * Load plan limits from ConfigService
     */
    private loadPlanLimitsFromConfig;
    /**
     * Check policy for action
     */
    checkPolicy(action: string, context: any): Promise<PolicyEvaluation>;
}
