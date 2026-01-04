"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const inversify_1 = require("inversify");
const core_1 = require("@theia/core");
const config_service_1 = require("../config/config-service");
/**
 * Policy engine with domain-specific guardrails
 */
let PolicyEngine = class PolicyEngine {
    constructor() {
        this.rules = new Map();
        this.planLimits = new Map();
        this.approvalRequests = new Map();
        this.onPolicyViolationEmitter = new core_1.Emitter();
        this.onPolicyViolation = this.onPolicyViolationEmitter.event;
        this.onApprovalRequiredEmitter = new core_1.Emitter();
        this.onApprovalRequired = this.onApprovalRequiredEmitter.event;
        // Rules will be loaded from ConfigService after initialization
    }
    /**
     * Initialize policy engine (call after ConfigService is loaded)
     */
    async initialize() {
        await this.configService.waitForReady();
        await this.loadRulesFromConfig();
        await this.loadPlanLimitsFromConfig();
    }
    /**
     * Evaluate policy for action
     */
    async evaluate(context) {
        const violations = [];
        const warnings = [];
        let requiresApproval = false;
        // Get applicable rules
        const applicableRules = this.getApplicableRules(context);
        // Evaluate each rule
        for (const rule of applicableRules) {
            const result = await this.evaluateRule(rule, context);
            if (!result.passed) {
                const violation = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    message: rule.message,
                    action: rule.action,
                };
                if (rule.action === 'block') {
                    violations.push(violation);
                    this.onPolicyViolationEmitter.fire(violation);
                }
                else if (rule.action === 'warn') {
                    warnings.push(rule.message);
                }
                else if (rule.action === 'require-approval') {
                    requiresApproval = true;
                    violations.push(violation);
                }
            }
        }
        // Check plan limits
        const planCheck = this.checkPlanLimits(context);
        if (!planCheck.allowed) {
            violations.push(...planCheck.violations);
        }
        if (planCheck.requiresApproval) {
            requiresApproval = true;
        }
        // Estimate cost and risk
        const estimatedCost = this.estimateCost(context);
        const estimatedRisk = this.estimateRisk(context, violations);
        // Create approval request if needed
        if (requiresApproval && violations.length > 0) {
            const approvalRequest = this.createApprovalRequest(context, violations, estimatedCost, estimatedRisk);
            this.approvalRequests.set(approvalRequest.id, approvalRequest);
            this.onApprovalRequiredEmitter.fire(approvalRequest);
        }
        return {
            allowed: violations.filter(v => v.action === 'block').length === 0,
            requiresApproval,
            violations,
            warnings,
            estimatedCost,
            estimatedRisk,
        };
    }
    /**
     * Request approval
     */
    async requestApproval(context, violations) {
        const estimatedCost = this.estimateCost(context);
        const estimatedRisk = this.estimateRisk(context, violations);
        const request = this.createApprovalRequest(context, violations, estimatedCost, estimatedRisk);
        this.approvalRequests.set(request.id, request);
        this.onApprovalRequiredEmitter.fire(request);
        return request;
    }
    /**
     * Approve request
     */
    async approve(requestId, approverId) {
        const request = this.approvalRequests.get(requestId);
        if (!request) {
            throw new Error('Approval request not found');
        }
        if (request.status !== 'pending') {
            throw new Error(`Request already ${request.status}`);
        }
        if (Date.now() > request.expiresAt) {
            request.status = 'expired';
            throw new Error('Approval request expired');
        }
        request.status = 'approved';
        request.approvedBy = approverId;
        request.approvedAt = Date.now();
    }
    /**
     * Reject request
     */
    async reject(requestId, approverId, reason) {
        const request = this.approvalRequests.get(requestId);
        if (!request) {
            throw new Error('Approval request not found');
        }
        if (request.status !== 'pending') {
            throw new Error(`Request already ${request.status}`);
        }
        request.status = 'rejected';
        request.approvedBy = approverId;
        request.approvedAt = Date.now();
        request.rejectionReason = reason;
    }
    /**
     * Get approval request
     */
    getApprovalRequest(requestId) {
        return this.approvalRequests.get(requestId);
    }
    /**
     * Get pending approvals for user
     */
    getPendingApprovals(userId) {
        return Array.from(this.approvalRequests.values()).filter(r => r.requestedBy === userId && r.status === 'pending');
    }
    /**
     * Add custom rule
     */
    addRule(rule) {
        this.rules.set(rule.id, rule);
    }
    /**
     * Remove rule
     */
    removeRule(ruleId) {
        this.rules.delete(ruleId);
    }
    /**
     * Enable/disable rule
     */
    setRuleEnabled(ruleId, enabled) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
        }
    }
    // Private methods
    /**
     * Load rules from ConfigService
     */
    async loadRulesFromConfig() {
        const strictMode = this.configService.get('policy.strictMode', true);
        // Load code domain rules
        const codeRules = this.configService.get('policy.rules.code', [
            {
                id: 'code.tests-required',
                name: 'Tests Required',
                domain: 'code',
                type: 'guardrail',
                condition: 'code changes must include tests',
                action: 'block',
                message: 'All code changes must include tests',
                severity: 'high',
                enabled: true,
            }
        ]);
        this.rules.set('code.security-scan', {
            id: 'code.security-scan',
            name: 'Security Scan',
            domain: 'code',
            type: 'security',
            condition: 'security scan must pass',
            action: 'block',
            message: 'Security vulnerabilities detected',
            severity: 'critical',
            enabled: true,
        });
        this.rules.set('code.no-secrets', {
            id: 'code.no-secrets',
            name: 'No Secrets',
            domain: 'code',
            type: 'security',
            condition: 'code must not contain secrets',
            action: 'block',
            message: 'Code contains API keys or secrets',
            severity: 'critical',
            enabled: true,
        });
        this.rules.set('code.deploy-approval', {
            id: 'code.deploy-approval',
            name: 'Deploy Approval',
            domain: 'code',
            type: 'compliance',
            condition: 'production deploys require approval',
            action: 'require-approval',
            message: 'Production deployment requires approval',
            severity: 'high',
            enabled: true,
        });
        // ===== TRADING DOMAIN =====
        this.rules.set('trading.paper-first', {
            id: 'trading.paper-first',
            name: 'Paper Trading First',
            domain: 'trading',
            type: 'guardrail',
            condition: 'strategies must complete paper trading',
            action: 'block',
            message: 'Strategy must complete paper trading before live execution',
            severity: 'critical',
            enabled: true,
        });
        this.rules.set('trading.stop-loss', {
            id: 'trading.stop-loss',
            name: 'Stop Loss Required',
            domain: 'trading',
            type: 'guardrail',
            condition: 'all strategies must have stop-loss',
            action: 'block',
            message: 'Stop-loss is mandatory for all trading strategies',
            severity: 'critical',
            enabled: true,
        });
        this.rules.set('trading.position-limits', {
            id: 'trading.position-limits',
            name: 'Position Limits',
            domain: 'trading',
            type: 'compliance',
            condition: 'position size within plan limits',
            action: 'block',
            message: 'Position size exceeds plan limits',
            severity: 'high',
            enabled: true,
        });
        this.rules.set('trading.backtest-required', {
            id: 'trading.backtest-required',
            name: 'Backtest Required',
            domain: 'trading',
            type: 'guardrail',
            condition: 'positive backtest results required',
            action: 'block',
            message: 'Strategy must have positive backtest results',
            severity: 'high',
            enabled: true,
        });
        this.rules.set('trading.live-approval', {
            id: 'trading.live-approval',
            name: 'Live Trading Approval',
            domain: 'trading',
            type: 'compliance',
            condition: 'live trading requires approval',
            action: 'require-approval',
            message: 'Live trading execution requires approval',
            severity: 'critical',
            enabled: true,
        });
        // ===== RESEARCH DOMAIN =====
        this.rules.set('research.tos-compliance', {
            id: 'research.tos-compliance',
            name: 'ToS Compliance',
            domain: 'research',
            type: 'compliance',
            condition: 'fetches must respect ToS',
            action: 'block',
            message: 'URL fetch violates Terms of Service',
            severity: 'high',
            enabled: true,
        });
        this.rules.set('research.robots-txt', {
            id: 'research.robots-txt',
            name: 'Robots.txt Compliance',
            domain: 'research',
            type: 'compliance',
            condition: 'fetches must respect robots.txt',
            action: 'block',
            message: 'URL disallowed by robots.txt',
            severity: 'high',
            enabled: true,
        });
        this.rules.set('research.pii-masking', {
            id: 'research.pii-masking',
            name: 'PII Masking',
            domain: 'research',
            type: 'security',
            condition: 'all PII must be masked',
            action: 'block',
            message: 'Content contains unmasked PII',
            severity: 'critical',
            enabled: true,
        });
        this.rules.set('research.rate-limits', {
            id: 'research.rate-limits',
            name: 'Rate Limits',
            domain: 'research',
            type: 'compliance',
            condition: 'domain rate limits must be respected',
            action: 'block',
            message: 'Rate limit exceeded for domain',
            severity: 'medium',
            enabled: true,
        });
        // ===== CREATIVE DOMAIN =====
        this.rules.set('creative.pii-check', {
            id: 'creative.pii-check',
            name: 'PII Check',
            domain: 'creative',
            type: 'security',
            condition: 'published assets must not contain PII',
            action: 'block',
            message: 'Asset contains PII and cannot be published',
            severity: 'critical',
            enabled: true,
        });
        this.rules.set('creative.style-consistency', {
            id: 'creative.style-consistency',
            name: 'Style Consistency',
            domain: 'creative',
            type: 'guardrail',
            condition: 'assets must maintain style consistency',
            action: 'warn',
            message: 'Asset style inconsistent with project',
            severity: 'low',
            enabled: true,
        });
        this.rules.set('creative.publish-approval', {
            id: 'creative.publish-approval',
            name: 'Publish Approval',
            domain: 'creative',
            type: 'compliance',
            condition: 'asset publishing requires approval',
            action: 'require-approval',
            message: 'Asset publishing requires approval',
            severity: 'medium',
            enabled: true,
        });
        // ===== COST CONTROLS =====
        this.rules.set('cost.daily-limit', {
            id: 'cost.daily-limit',
            name: 'Daily Cost Limit',
            domain: 'all',
            type: 'cost',
            condition: 'daily cost within limit',
            action: 'block',
            message: 'Daily cost limit exceeded',
            severity: 'high',
            enabled: true,
        });
        this.rules.set('cost.high-cost-approval', {
            id: 'cost.high-cost-approval',
            name: 'High Cost Approval',
            domain: 'all',
            type: 'cost',
            condition: 'high cost operations require approval',
            action: 'require-approval',
            message: 'Operation cost exceeds approval threshold',
            severity: 'medium',
            enabled: true,
        });
    }
    initializePlanLimits() {
        // ═══════════════════════════════════════════════════════════════
        //     PLANOS AETHEL ENGINE - ALINHADOS COM ESTRATÉGIA 2025
        //     ZERO PREJUÍZO - Margem mínima 89% em todos os planos
        // ═══════════════════════════════════════════════════════════════
        // STARTER - $3/mês (R$15) - Margem 96.7%
        this.planLimits.set('starter', {
            plan: 'starter',
            limits: {
                maxCostPerDay: 0.10,
                maxCostPerMonth: 3.0,
                allowedDomains: ['code'],
                allowedTools: ['code.read', 'code.write', 'code.execute', 'code.test', 'shared.llm'],
                allowedModels: ['gemini-1.5-flash', 'deepseek-v3'],
                maxConcurrentTasks: 1,
                requiresApprovalAbove: 0.5,
                tokensPerMonth: 500_000,
                contextWindow: 8000,
            },
        });
        // BASIC - $9/mês (R$45) - Margem 93.9%
        this.planLimits.set('basic', {
            plan: 'basic',
            limits: {
                maxCostPerDay: 0.50,
                maxCostPerMonth: 9.0,
                allowedDomains: ['code', 'research'],
                allowedTools: ['code.*', 'research.*', 'shared.*'],
                allowedModels: ['gemini-1.5-flash', 'deepseek-v3', 'gpt-4o-mini', 'claude-3-haiku'],
                maxConcurrentTasks: 2,
                requiresApprovalAbove: 2.0,
                tokensPerMonth: 2_000_000,
                contextWindow: 16000,
            },
        });
        // PRO - $29/mês (R$149) - Margem 89.2%
        this.planLimits.set('pro', {
            plan: 'pro',
            limits: {
                maxCostPerDay: 5.0,
                maxCostPerMonth: 29.0,
                allowedDomains: ['code', 'trading', 'research', 'creative'],
                allowedTools: ['*'],
                allowedModels: ['gemini-1.5-flash', 'deepseek-v3', 'gpt-4o-mini', 'claude-3-haiku', 'gemini-1.5-pro', 'gpt-4o', 'claude-3.5-sonnet'],
                maxConcurrentTasks: 5,
                requiresApprovalAbove: 10.0,
                tokensPerMonth: 8_000_000,
                contextWindow: 32000,
            },
        });
        // STUDIO - $79/mês (R$399) - Margem 89.6%
        this.planLimits.set('studio', {
            plan: 'studio',
            limits: {
                maxCostPerDay: 15.0,
                maxCostPerMonth: 79.0,
                allowedDomains: ['code', 'trading', 'research', 'creative'],
                allowedTools: ['*'],
                allowedModels: ['*'],
                maxConcurrentTasks: 10,
                requiresApprovalAbove: 25.0,
                tokensPerMonth: 25_000_000,
                contextWindow: 64000,
            },
        });
        // ENTERPRISE - $199/mês (R$999) - Margem 92.0%
        this.planLimits.set('enterprise', {
            plan: 'enterprise',
            limits: {
                maxCostPerDay: 100.0,
                maxCostPerMonth: 199.0,
                allowedDomains: ['code', 'trading', 'research', 'creative', 'custom'],
                allowedTools: ['*'],
                allowedModels: ['*', 'custom-fine-tuned'],
                maxConcurrentTasks: 100,
                requiresApprovalAbove: 50.0,
                tokensPerMonth: 100_000_000,
                contextWindow: 128000,
            },
        });
    }
    getApplicableRules(context) {
        return Array.from(this.rules.values()).filter(rule => rule.enabled &&
            (rule.domain === context.domain || rule.domain === 'all'));
    }
    async evaluateRule(rule, context) {
        // Simple rule evaluation - in production, use a proper rule engine
        switch (rule.id) {
            case 'code.tests-required':
                return { passed: context.parameters.includesTests === true };
            case 'code.security-scan':
                return { passed: context.parameters.securityScanPassed === true };
            case 'code.no-secrets':
                return { passed: !this.containsSecrets(context.parameters.content) };
            case 'trading.paper-first':
                return { passed: context.history?.some(h => h.type === 'paper-trading') === true };
            case 'trading.stop-loss':
                return { passed: context.parameters.strategy?.includes('stop_loss') === true };
            case 'research.robots-txt':
                return { passed: context.parameters.robotsTxtAllowed === true };
            case 'research.pii-masking':
                return { passed: context.parameters.piiMasked === true };
            case 'creative.pii-check':
                return { passed: !this.containsPII(context.parameters.content) };
            default:
                return { passed: true };
        }
    }
    checkPlanLimits(context) {
        const limits = this.planLimits.get(context.user.plan);
        if (!limits) {
            return { allowed: true, requiresApproval: false, violations: [] };
        }
        const violations = [];
        let requiresApproval = false;
        // Check domain allowed
        if (!limits.limits.allowedDomains.includes(context.domain)) {
            violations.push({
                ruleId: 'plan.domain',
                ruleName: 'Domain Not Allowed',
                severity: 'high',
                message: `Domain ${context.domain} not allowed in ${context.user.plan} plan`,
                action: 'block',
            });
        }
        // Check tool allowed
        if (limits.limits.allowedTools[0] !== '*' && !limits.limits.allowedTools.includes(context.tool)) {
            violations.push({
                ruleId: 'plan.tool',
                ruleName: 'Tool Not Allowed',
                severity: 'high',
                message: `Tool ${context.tool} not allowed in ${context.user.plan} plan`,
                action: 'block',
            });
        }
        // Check cost limits
        const estimatedCost = this.estimateCost(context);
        if (estimatedCost > limits.limits.requiresApprovalAbove) {
            requiresApproval = true;
        }
        return {
            allowed: violations.length === 0,
            requiresApproval,
            violations,
        };
    }
    estimateCost(context) {
        // Simple cost estimation - in production, use actual pricing
        const baseCosts = {
            'code.read': 0.001,
            'code.write': 0.002,
            'code.execute': 0.005,
            'code.test': 0.01,
            'code.deploy': 0.1,
            'trading.backtest': 0.05,
            'trading.walkforward': 0.1,
            'trading.paper': 0.01,
            'trading.live': 0.5,
            'research.fetch': 0.01,
            'research.search': 0.02,
            'research.analyze': 0.05,
            'creative.storyboard': 0.1,
            'creative.layout': 0.2,
            'creative.render': 1.0,
            'creative.publish': 0.05,
            'shared.llm': 0.01,
        };
        return baseCosts[context.tool] || 0.01;
    }
    estimateRisk(context, violations) {
        const criticalViolations = violations.filter(v => v.severity === 'critical').length;
        const highViolations = violations.filter(v => v.severity === 'high').length;
        if (criticalViolations > 0)
            return 'high';
        if (highViolations > 0)
            return 'medium';
        return 'low';
    }
    createApprovalRequest(context, violations, estimatedCost, estimatedRisk) {
        return {
            id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            context,
            violations,
            estimatedCost,
            estimatedRisk,
            requestedBy: context.user.id,
            requestedAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            status: 'pending',
        };
    }
    containsSecrets(content) {
        if (!content)
            return false;
        const secretPatterns = [
            /api[_-]?key[_-]?=\s*['"][a-zA-Z0-9]{20,}['"]/i,
            /password[_-]?=\s*['"][^'"]+['"]/i,
            /secret[_-]?=\s*['"][^'"]+['"]/i,
            /token[_-]?=\s*['"][a-zA-Z0-9]{20,}['"]/i,
            /AKIA[0-9A-Z]{16}/, // AWS Access Key
            /ghp_[a-zA-Z0-9]{36}/, // GitHub Token
        ];
        return secretPatterns.some(pattern => pattern.test(content));
    }
    containsPII(content) {
        if (!content)
            return false;
        const piiPatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b\d{16}\b/, // Credit Card
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
        ];
        return piiPatterns.some(pattern => pattern.test(content));
    }
    /**
     * Load plan limits from ConfigService
     */
    async loadPlanLimitsFromConfig() {
        const freeLimits = this.configService.get('policy.plans.free', {
            maxCostPerDay: 1.0,
            maxCostPerMonth: 10.0,
            allowedDomains: ['code'],
            allowedTools: ['code.read', 'code.write', 'code.execute', 'code.test', 'shared.llm'],
            maxConcurrentTasks: 1,
            requiresApprovalAbove: 0.5,
        });
        // STARTER - $3/mês (entrada, sem free tier)
        this.planLimits.set('starter', {
            plan: 'starter',
            limits: {
                maxCostPerDay: 0.10,
                maxCostPerMonth: 3.0,
                allowedDomains: ['code'],
                allowedTools: ['code.read', 'code.write', 'shared.llm'],
                maxConcurrentTasks: 1,
                requiresApprovalAbove: 0.05,
                tokensPerMonth: 500_000,
                contextWindow: 8000,
                allowedModels: ['gemini-1.5-flash', 'deepseek-v3'],
            },
        });
        // BASIC - $9/mês
        this.planLimits.set('basic', {
            plan: 'basic',
            limits: {
                maxCostPerDay: 0.30,
                maxCostPerMonth: 9.0,
                allowedDomains: ['code'],
                allowedTools: ['code.read', 'code.write', 'code.execute', 'shared.llm'],
                maxConcurrentTasks: 2,
                requiresApprovalAbove: 0.15,
                tokensPerMonth: 2_000_000,
                contextWindow: 16000,
                allowedModels: ['gemini-1.5-flash', 'deepseek-v3', 'claude-3-haiku'],
            },
        });
        // PRO - $29/mês
        this.planLimits.set('pro', {
            plan: 'pro',
            limits: {
                maxCostPerDay: 1.0,
                maxCostPerMonth: 29.0,
                allowedDomains: ['code', 'research'],
                allowedTools: ['code.read', 'code.write', 'code.execute', 'code.test', 'shared.llm'],
                maxConcurrentTasks: 3,
                requiresApprovalAbove: 0.50,
                tokensPerMonth: 10_000_000,
                contextWindow: 32000,
                allowedModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'deepseek-v3', 'claude-3-haiku', 'claude-3.5-sonnet'],
            },
        });
        // STUDIO - $79/mês
        this.planLimits.set('studio', {
            plan: 'studio',
            limits: {
                maxCostPerDay: 3.0,
                maxCostPerMonth: 79.0,
                allowedDomains: ['code', 'trading', 'research', 'creative'],
                allowedTools: ['*'],
                maxConcurrentTasks: 5,
                requiresApprovalAbove: 2.0,
                tokensPerMonth: 50_000_000,
                contextWindow: 128000,
                allowedModels: ['*'],
            },
        });
        // ENTERPRISE - $199/mês
        this.planLimits.set('enterprise', {
            plan: 'enterprise',
            limits: {
                maxCostPerDay: 10.0,
                maxCostPerMonth: 199.0,
                allowedDomains: ['code', 'trading', 'research', 'creative'],
                allowedTools: ['*'],
                maxConcurrentTasks: 10,
                requiresApprovalAbove: 5.0,
                tokensPerMonth: -1, // ilimitado
                contextWindow: 200000,
                allowedModels: ['*'],
                prioritySupport: true,
                dedicatedInfra: true,
            },
        });
    }
    /**
     * Check policy for action
     */
    async checkPolicy(action, context) {
        const policyContext = {
            domain: context.domain || 'code',
            action,
            tool: context.tool || action,
            parameters: context,
            user: context.user || {
                id: 'default-user',
                plan: 'starter',
                permissions: [],
            },
            workspace: context.workspace || {
                id: 'default-workspace',
                budget: {
                    total: 100,
                    spent: 0,
                    remaining: 100,
                },
            },
            history: context.history,
        };
        return this.evaluate(policyContext);
    }
};
exports.PolicyEngine = PolicyEngine;
__decorate([
    (0, inversify_1.inject)(config_service_1.ConfigService),
    __metadata("design:type", config_service_1.ConfigService)
], PolicyEngine.prototype, "configService", void 0);
exports.PolicyEngine = PolicyEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], PolicyEngine);
