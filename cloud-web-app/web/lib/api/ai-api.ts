/**
 * AI API Client
 * Handles communication with backend AI services
 */

export interface AICompletionRequest {
  language: string;
  code: string;
  position: { line: number; character: number };
  context?: string;
}

export interface AICompletionResponse {
  completions: Array<{
    text: string;
    confidence: number;
    documentation?: string;
  }>;
}

export interface AIHoverRequest {
  language: string;
  code: string;
  position: { line: number; character: number };
  symbol: string;
}

export interface AIHoverResponse {
  content: string;
  examples?: string[];
  relatedSymbols?: string[];
}

export interface AICodeActionRequest {
  language: string;
  code: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  diagnostics?: any[];
}

export interface AICodeActionResponse {
  actions: Array<{
    title: string;
    kind: string;
    edit?: any;
    command?: any;
  }>;
}

export interface AIDebugAnalysisRequest {
  language: string;
  stackTrace: string;
  variables: Record<string, any>;
  code?: string;
}

export interface AIDebugAnalysisResponse {
  analysis: string;
  possibleCauses: string[];
  suggestions: string[];
  relatedIssues?: Array<{
    title: string;
    url: string;
  }>;
}

export interface AITestGenerationRequest {
  language: string;
  code: string;
  functionName?: string;
  testFramework?: string;
}

export interface AITestGenerationResponse {
  tests: string;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
  };
  suggestions?: string[];
}

export interface AICommitMessageRequest {
  diff: string;
  context?: string;
}

export interface AICommitMessageResponse {
  message: string;
  alternatives?: string[];
}

export interface AICodeReviewRequest {
  diff: string;
  language: string;
  context?: string;
}

export interface AICodeReviewResponse {
  comments: Array<{
    line: number;
    severity: 'info' | 'warning' | 'error';
    message: string;
    suggestion?: string;
  }>;
  summary: string;
  score: number;
}

export interface AIConflictResolutionRequest {
  baseContent: string;
  currentContent: string;
  incomingContent: string;
  filePath: string;
}

export interface AIConflictResolutionResponse {
  resolution: string;
  explanation: string;
  confidence: number;
}

export class AIApiClient {
  private baseUrl: string;
  private consentGiven: boolean = false;

  constructor(baseUrl: string = '/api/ai') {
    this.baseUrl = baseUrl;
    this.loadConsent();
  }

  /**
   * Set AI consent
   */
  setConsent(consent: boolean): void {
    this.consentGiven = consent;
    localStorage.setItem('ai-consent', consent.toString());
    console.log(`[AI API] Consent ${consent ? 'granted' : 'revoked'}`);
  }

  /**
   * Get AI consent status
   */
  getConsent(): boolean {
    return this.consentGiven;
  }

  /**
   * Load consent from storage
   */
  private loadConsent(): void {
    const stored = localStorage.getItem('ai-consent');
    this.consentGiven = stored === 'true';
  }

  /**
   * Check consent before API call
   */
  private checkConsent(): void {
    if (!this.consentGiven) {
      throw new Error('AI features require user consent. Please enable AI in settings.');
    }
  }

  /**
   * Get AI-enhanced completions
   */
  async getCompletions(request: AICompletionRequest): Promise<AICompletionResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI completion failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get AI-enhanced hover information
   */
  async getHover(request: AIHoverRequest): Promise<AIHoverResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/hover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI hover failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get AI-suggested code actions
   */
  async getCodeActions(request: AICodeActionRequest): Promise<AICodeActionResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/code-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI code actions failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Analyze debug state with AI
   */
  async analyzeDebugState(request: AIDebugAnalysisRequest): Promise<AIDebugAnalysisResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/debug/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI debug analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate tests with AI
   */
  async generateTests(request: AITestGenerationRequest): Promise<AITestGenerationResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/tests/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI test generation failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate commit message with AI
   */
  async generateCommitMessage(request: AICommitMessageRequest): Promise<AICommitMessageResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/git/commit-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI commit message generation failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Review code with AI
   */
  async reviewCode(request: AICodeReviewRequest): Promise<AICodeReviewResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/git/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI code review failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Resolve merge conflict with AI
   */
  async resolveConflict(request: AIConflictResolutionRequest): Promise<AIConflictResolutionResponse> {
    this.checkConsent();

    const response = await fetch(`${this.baseUrl}/git/resolve-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI conflict resolution failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get AI model info
   */
  async getModelInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/model/info`);

    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get AI usage statistics
   */
  async getUsageStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/usage/stats`);

    if (!response.ok) {
      throw new Error(`Failed to get usage stats: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
let aiApiClientInstance: AIApiClient | null = null;

export function getAIApiClient(): AIApiClient {
  if (!aiApiClientInstance) {
    aiApiClientInstance = new AIApiClient();
  }
  return aiApiClientInstance;
}
