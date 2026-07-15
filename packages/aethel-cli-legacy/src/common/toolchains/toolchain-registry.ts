import { injectable } from 'inversify';

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
@injectable()
export class ToolchainRegistry {
  private tools: Map<string, Tool> = new Map();
  private toolchains: Map<string, Toolchain> = new Map();

  constructor() {
    this.registerTools();
    this.registerToolchains();
  }

  /**
   * Get tool by ID
   */
  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get toolchain by ID
   */
  getToolchain(id: string): Toolchain | undefined {
    return this.toolchains.get(id);
  }

  /**
   * Get tools for domain
   */
  getToolsForDomain(domain: string): Tool[] {
    return Array.from(this.tools.values()).filter(
      t => t.domain === domain || t.domain === 'shared'
    );
  }

  /**
   * Validate tool execution
   */
  async validateExecution(toolId: string, params: any): Promise<{ valid: boolean; errors: string[] }> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { valid: false, errors: ['Tool not found'] };
    }

    const errors: string[] = [];

    // Validate parameters
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

      if (param.name in params) {
        const value = params[param.name];
        
        // Type check
        if (typeof value !== param.type && param.type !== 'object' && param.type !== 'array') {
          errors.push(`Parameter ${param.name} must be of type ${param.type}`);
        }

        // Validation rules
        if (param.validation) {
          if (param.validation.min !== undefined && value < param.validation.min) {
            errors.push(`Parameter ${param.name} must be >= ${param.validation.min}`);
          }
          if (param.validation.max !== undefined && value > param.validation.max) {
            errors.push(`Parameter ${param.name} must be <= ${param.validation.max}`);
          }
          if (param.validation.pattern && !new RegExp(param.validation.pattern).test(value)) {
            errors.push(`Parameter ${param.name} does not match pattern ${param.validation.pattern}`);
          }
          if (param.validation.enum && !param.validation.enum.includes(value)) {
            errors.push(`Parameter ${param.name} must be one of: ${param.validation.enum.join(', ')}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Private: Register all tools

  private registerTools(): void {
    // ===== CODE DOMAIN =====
    
    this.tools.set('code.read', {
      id: 'code.read',
      name: 'Read File',
      description: 'Read file contents',
      domain: 'code',
      category: 'filesystem',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.001,
      parameters: [
        { name: 'path', type: 'string', required: true, description: 'File path' },
      ],
      guardrails: [],
    });

    this.tools.set('code.write', {
      id: 'code.write',
      name: 'Write File',
      description: 'Write or modify file',
      domain: 'code',
      category: 'filesystem',
      requiresApproval: false,
      riskLevel: 'medium',
      costEstimate: 0.002,
      parameters: [
        { name: 'path', type: 'string', required: true, description: 'File path' },
        { name: 'content', type: 'string', required: true, description: 'File content' },
      ],
      guardrails: [
        {
          id: 'no-secrets',
          type: 'pre',
          check: 'content does not contain API keys or secrets',
          action: 'block',
          message: 'Cannot write files containing secrets',
        },
      ],
    });

    this.tools.set('code.execute', {
      id: 'code.execute',
      name: 'Execute Command',
      description: 'Run shell command',
      domain: 'code',
      category: 'execution',
      requiresApproval: false,
      riskLevel: 'high',
      costEstimate: 0.005,
      parameters: [
        { name: 'command', type: 'string', required: true, description: 'Shell command' },
        { name: 'timeout', type: 'number', required: false, description: 'Timeout in seconds' },
      ],
      guardrails: [
        {
          id: 'no-destructive',
          type: 'pre',
          check: 'command does not contain rm -rf, dd, mkfs',
          action: 'block',
          message: 'Destructive commands are blocked',
        },
      ],
    });

    this.tools.set('code.test', {
      id: 'code.test',
      name: 'Run Tests',
      description: 'Execute test suite',
      domain: 'code',
      category: 'testing',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.01,
      parameters: [
        { name: 'pattern', type: 'string', required: false, description: 'Test pattern' },
      ],
      guardrails: [],
    });

    this.tools.set('code.deploy', {
      id: 'code.deploy',
      name: 'Deploy to Production',
      description: 'Deploy code to production',
      domain: 'code',
      category: 'deployment',
      requiresApproval: true,
      riskLevel: 'high',
      costEstimate: 0.1,
      parameters: [
        { name: 'environment', type: 'string', required: true, description: 'Target environment' },
        { name: 'version', type: 'string', required: true, description: 'Version to deploy' },
      ],
      guardrails: [
        {
          id: 'tests-required',
          type: 'pre',
          check: 'all tests must pass',
          action: 'block',
          message: 'Cannot deploy without passing tests',
        },
        {
          id: 'security-scan',
          type: 'pre',
          check: 'security scan must pass',
          action: 'block',
          message: 'Cannot deploy with security vulnerabilities',
        },
        {
          id: 'smoke-test',
          type: 'post',
          check: 'smoke tests must pass',
          action: 'require-approval',
          message: 'Smoke tests failed, manual approval required',
        },
      ],
    });

    // ===== TRADING DOMAIN =====

    this.tools.set('trading.backtest', {
      id: 'trading.backtest',
      name: 'Run Backtest',
      description: 'Backtest trading strategy',
      domain: 'trading',
      category: 'analysis',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.05,
      parameters: [
        { name: 'strategy', type: 'string', required: true, description: 'Strategy code' },
        { name: 'startDate', type: 'string', required: true, description: 'Start date' },
        { name: 'endDate', type: 'string', required: true, description: 'End date' },
        { name: 'capital', type: 'number', required: true, description: 'Initial capital' },
      ],
      guardrails: [],
    });

    this.tools.set('trading.walkforward', {
      id: 'trading.walkforward',
      name: 'Walk-Forward Analysis',
      description: 'Run walk-forward validation',
      domain: 'trading',
      category: 'analysis',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.1,
      parameters: [
        { name: 'strategy', type: 'string', required: true, description: 'Strategy code' },
        { name: 'windows', type: 'number', required: true, description: 'Number of windows' },
      ],
      guardrails: [],
    });

    this.tools.set('trading.paper', {
      id: 'trading.paper',
      name: 'Paper Trading',
      description: 'Execute in paper trading mode',
      domain: 'trading',
      category: 'execution',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.01,
      parameters: [
        { name: 'strategy', type: 'string', required: true, description: 'Strategy code' },
        { name: 'duration', type: 'number', required: true, description: 'Duration in days' },
      ],
      guardrails: [
        {
          id: 'stop-loss-required',
          type: 'pre',
          check: 'strategy must include stop-loss',
          action: 'block',
          message: 'Stop-loss is mandatory for all strategies',
        },
      ],
    });

    this.tools.set('trading.live', {
      id: 'trading.live',
      name: 'Live Trading',
      description: 'Execute real trades',
      domain: 'trading',
      category: 'execution',
      requiresApproval: true,
      riskLevel: 'high',
      costEstimate: 0.5,
      parameters: [
        { name: 'strategy', type: 'string', required: true, description: 'Strategy code' },
        { name: 'maxPositionSize', type: 'number', required: true, description: 'Max position size' },
        { name: 'dailyLimit', type: 'number', required: true, description: 'Daily loss limit' },
      ],
      guardrails: [
        {
          id: 'backtest-required',
          type: 'pre',
          check: 'strategy must have positive backtest results',
          action: 'block',
          message: 'Strategy must pass backtest before live trading',
        },
        {
          id: 'paper-required',
          type: 'pre',
          check: 'strategy must have successful paper trading period',
          action: 'block',
          message: 'Strategy must complete paper trading before live',
        },
        {
          id: 'position-limits',
          type: 'pre',
          check: 'position size within plan limits',
          action: 'block',
          message: 'Position size exceeds plan limits',
        },
      ],
    });

    // ===== RESEARCH DOMAIN =====

    this.tools.set('research.fetch', {
      id: 'research.fetch',
      name: 'Fetch Web Content',
      description: 'Fetch content from URL',
      domain: 'research',
      category: 'data',
      requiresApproval: false,
      riskLevel: 'medium',
      costEstimate: 0.01,
      parameters: [
        { name: 'url', type: 'string', required: true, description: 'URL to fetch' },
      ],
      guardrails: [
        {
          id: 'robots-txt',
          type: 'pre',
          check: 'URL allowed by robots.txt',
          action: 'block',
          message: 'URL disallowed by robots.txt',
        },
        {
          id: 'rate-limit',
          type: 'pre',
          check: 'domain rate limit not exceeded',
          action: 'block',
          message: 'Rate limit exceeded for domain',
        },
        {
          id: 'pii-mask',
          type: 'post',
          check: 'PII must be masked',
          action: 'block',
          message: 'Content contains unmasked PII',
        },
      ],
    });

    this.tools.set('research.search', {
      id: 'research.search',
      name: 'Search Web',
      description: 'Search for information',
      domain: 'research',
      category: 'data',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.02,
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query' },
        { name: 'limit', type: 'number', required: false, description: 'Max results' },
      ],
      guardrails: [],
    });

    this.tools.set('research.analyze', {
      id: 'research.analyze',
      name: 'Analyze Sources',
      description: 'Analyze source credibility',
      domain: 'research',
      category: 'analysis',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.05,
      parameters: [
        { name: 'sources', type: 'array', required: true, description: 'List of sources' },
      ],
      guardrails: [
        {
          id: 'citation-required',
          type: 'post',
          check: 'all claims must have citations',
          action: 'warn',
          message: 'Some claims lack citations',
        },
      ],
    });

    // ===== CREATIVE DOMAIN =====

    this.tools.set('creative.storyboard', {
      id: 'creative.storyboard',
      name: 'Generate Storyboard',
      description: 'Create visual storyboard',
      domain: 'creative',
      category: 'preproduction',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.1,
      parameters: [
        { name: 'script', type: 'string', required: true, description: 'Script or story' },
        { name: 'style', type: 'string', required: true, description: 'Visual style' },
      ],
      guardrails: [],
    });

    this.tools.set('creative.layout', {
      id: 'creative.layout',
      name: 'Create Layout',
      description: 'Design scene layout',
      domain: 'creative',
      category: 'production',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.2,
      parameters: [
        { name: 'storyboard', type: 'object', required: true, description: 'Storyboard data' },
      ],
      guardrails: [
        {
          id: 'style-consistency',
          type: 'post',
          check: 'layout matches storyboard style',
          action: 'warn',
          message: 'Layout style inconsistent with storyboard',
        },
      ],
    });

    this.tools.set('creative.render', {
      id: 'creative.render',
      name: 'Render Scene',
      description: 'Render final scene',
      domain: 'creative',
      category: 'production',
      requiresApproval: false,
      riskLevel: 'medium',
      costEstimate: 1.0,
      parameters: [
        { name: 'scene', type: 'object', required: true, description: 'Scene data' },
        { name: 'quality', type: 'string', required: true, description: 'Render quality' },
      ],
      guardrails: [],
    });

    this.tools.set('creative.publish', {
      id: 'creative.publish',
      name: 'Publish Asset',
      description: 'Publish to marketplace',
      domain: 'creative',
      category: 'distribution',
      requiresApproval: true,
      riskLevel: 'high',
      costEstimate: 0.05,
      parameters: [
        { name: 'asset', type: 'object', required: true, description: 'Asset to publish' },
        { name: 'metadata', type: 'object', required: true, description: 'Asset metadata' },
      ],
      guardrails: [
        {
          id: 'pii-check',
          type: 'pre',
          check: 'asset contains no PII',
          action: 'block',
          message: 'Asset contains PII and cannot be published',
        },
        {
          id: 'quality-check',
          type: 'pre',
          check: 'asset meets quality standards',
          action: 'require-approval',
          message: 'Asset quality below standards, manual review required',
        },
      ],
    });

    // ===== SHARED TOOLS =====

    this.tools.set('shared.llm', {
      id: 'shared.llm',
      name: 'LLM Query',
      description: 'Query language model',
      domain: 'shared',
      category: 'ai',
      requiresApproval: false,
      riskLevel: 'low',
      costEstimate: 0.01,
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Prompt text' },
        { name: 'model', type: 'string', required: false, description: 'Model ID' },
      ],
      guardrails: [],
    });
  }

  // Private: Register all toolchains

  private registerToolchains(): void {
    // ===== CODE TOOLCHAIN =====
    
    this.toolchains.set('code', {
      id: 'code',
      name: 'Code Development',
      domain: 'code',
      description: 'Full-stack development with testing and deployment',
      tools: ['code.read', 'code.write', 'code.execute', 'code.test', 'code.deploy', 'shared.llm'],
      workflow: [
        {
          id: 'plan',
          name: 'Planning',
          tools: ['code.read', 'shared.llm'],
          critics: ['code-quality'],
          requiresApproval: false,
          canRollback: true,
        },
        {
          id: 'implement',
          name: 'Implementation',
          tools: ['code.write', 'code.execute'],
          critics: ['code-quality'],
          requiresApproval: false,
          canRollback: true,
        },
        {
          id: 'test',
          name: 'Testing',
          tools: ['code.test'],
          critics: ['code-quality'],
          requiresApproval: false,
          canRollback: true,
        },
        {
          id: 'deploy',
          name: 'Deployment',
          tools: ['code.deploy'],
          critics: ['code-quality'],
          requiresApproval: true,
          canRollback: true,
        },
      ],
      policies: [
        {
          id: 'tests-required',
          rule: 'All code changes must include tests',
          enforcement: 'strict',
          message: 'Tests are required for all code changes',
        },
        {
          id: 'security-scan',
          rule: 'Security scan must pass before deployment',
          enforcement: 'strict',
          message: 'Security vulnerabilities must be fixed',
        },
      ],
      slos: [
        { metric: 'pass@k', target: 0.8, unit: 'ratio', alertThreshold: 0.6 },
        { metric: 'build_time', target: 300, unit: 'seconds', alertThreshold: 600 },
        { metric: 'test_coverage', target: 0.8, unit: 'ratio', alertThreshold: 0.6 },
      ],
    });

    // ===== TRADING TOOLCHAIN =====

    this.toolchains.set('trading', {
      id: 'trading',
      name: 'Algorithmic Trading',
      domain: 'trading',
      description: 'Strategy development and execution pipeline',
      tools: ['trading.backtest', 'trading.walkforward', 'trading.paper', 'trading.live', 'shared.llm'],
      workflow: [
        {
          id: 'backtest',
          name: 'Backtesting',
          tools: ['trading.backtest'],
          critics: ['trading-sanity'],
          requiresApproval: false,
          canRollback: false,
        },
        {
          id: 'walkforward',
          name: 'Walk-Forward',
          tools: ['trading.walkforward'],
          critics: ['trading-sanity'],
          requiresApproval: false,
          canRollback: false,
        },
        {
          id: 'paper',
          name: 'Paper Trading',
          tools: ['trading.paper'],
          critics: ['trading-sanity'],
          requiresApproval: false,
          canRollback: false,
        },
        {
          id: 'live',
          name: 'Live Trading',
          tools: ['trading.live'],
          critics: ['trading-sanity'],
          requiresApproval: true,
          canRollback: true,
        },
      ],
      policies: [
        {
          id: 'paper-first',
          rule: 'All strategies must complete paper trading before live',
          enforcement: 'strict',
          message: 'Paper trading is mandatory',
        },
        {
          id: 'stop-loss',
          rule: 'All strategies must include stop-loss',
          enforcement: 'strict',
          message: 'Stop-loss is mandatory',
        },
        {
          id: 'position-limits',
          rule: 'Position size must respect plan limits',
          enforcement: 'strict',
          message: 'Position limits enforced by plan',
        },
      ],
      slos: [
        { metric: 'decision_latency', target: 100, unit: 'ms', alertThreshold: 500 },
        { metric: 'slippage', target: 0.001, unit: 'ratio', alertThreshold: 0.005 },
        { metric: 'win_rate', target: 0.55, unit: 'ratio', alertThreshold: 0.45 },
      ],
    });

    // ===== RESEARCH TOOLCHAIN =====

    this.toolchains.set('research', {
      id: 'research',
      name: 'Research & Analysis',
      domain: 'research',
      description: 'Data gathering and analysis with source verification',
      tools: ['research.fetch', 'research.search', 'research.analyze', 'shared.llm'],
      workflow: [
        {
          id: 'gather',
          name: 'Data Gathering',
          tools: ['research.search', 'research.fetch'],
          critics: ['research-factuality'],
          requiresApproval: false,
          canRollback: false,
        },
        {
          id: 'analyze',
          name: 'Analysis',
          tools: ['research.analyze', 'shared.llm'],
          critics: ['research-factuality'],
          requiresApproval: false,
          canRollback: false,
        },
      ],
      policies: [
        {
          id: 'tos-compliance',
          rule: 'All fetches must respect ToS and robots.txt',
          enforcement: 'strict',
          message: 'ToS compliance is mandatory',
        },
        {
          id: 'pii-masking',
          rule: 'All PII must be masked',
          enforcement: 'strict',
          message: 'PII masking is mandatory',
        },
        {
          id: 'citation-required',
          rule: 'All claims must have citations',
          enforcement: 'advisory',
          message: 'Citations improve credibility',
        },
      ],
      slos: [
        { metric: 'factuality', target: 0.9, unit: 'ratio', alertThreshold: 0.7 },
        { metric: 'source_coverage', target: 5, unit: 'count', alertThreshold: 2 },
        { metric: 'fetch_success', target: 0.95, unit: 'ratio', alertThreshold: 0.8 },
      ],
    });

    // ===== CREATIVE TOOLCHAIN =====

    this.toolchains.set('creative', {
      id: 'creative',
      name: 'Creative Production',
      domain: 'creative',
      description: 'End-to-end creative pipeline from story to render',
      tools: ['creative.storyboard', 'creative.layout', 'creative.render', 'creative.publish', 'shared.llm'],
      workflow: [
        {
          id: 'storyboard',
          name: 'Storyboarding',
          tools: ['creative.storyboard', 'shared.llm'],
          critics: ['creative-continuity'],
          requiresApproval: false,
          canRollback: true,
        },
        {
          id: 'layout',
          name: 'Layout Design',
          tools: ['creative.layout'],
          critics: ['creative-continuity'],
          requiresApproval: false,
          canRollback: true,
        },
        {
          id: 'render',
          name: 'Rendering',
          tools: ['creative.render'],
          critics: ['creative-continuity'],
          requiresApproval: false,
          canRollback: true,
        },
        {
          id: 'publish',
          name: 'Publishing',
          tools: ['creative.publish'],
          critics: ['creative-continuity'],
          requiresApproval: true,
          canRollback: false,
        },
      ],
      policies: [
        {
          id: 'style-consistency',
          rule: 'All assets must maintain style consistency',
          enforcement: 'advisory',
          message: 'Style consistency improves quality',
        },
        {
          id: 'pii-check',
          rule: 'Published assets must not contain PII',
          enforcement: 'strict',
          message: 'PII in published assets is prohibited',
        },
      ],
      slos: [
        { metric: 'shot_to_preview', target: 300, unit: 'seconds', alertThreshold: 600 },
        { metric: 'style_consistency', target: 0.9, unit: 'ratio', alertThreshold: 0.7 },
        { metric: 'asset_rejection', target: 0.1, unit: 'ratio', alertThreshold: 0.3 },
      ],
    });
  }
}
