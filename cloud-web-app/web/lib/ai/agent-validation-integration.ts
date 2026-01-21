/**
 * Agent Code Validation Integration
 * 
 * Intercepta operações de escrita de arquivo do agent e valida o código automaticamente.
 * Se encontrar erros, cria um loop de correção até o código estar limpo.
 * 
 * CRÍTICO para evitar que a IA gere código com erros.
 */

import { CodeValidator, ValidationResult, formatErrorsForAI, generateFixInstructions } from './code-validator';
import { AutonomousAgent, AgentStep, ToolCall } from './agent-mode';
import { aiService } from '@/lib/ai-service';
import { EventEmitter } from 'events';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface ValidationConfig {
  enabled: boolean;
  maxFixAttempts: number;
  autoFix: boolean;
  strictMode: boolean;
  validateOn: ('write_file' | 'edit_file' | 'create_file')[];
  excludePatterns: string[];
  languages: string[];
}

const DEFAULT_CONFIG: ValidationConfig = {
  enabled: true,
  maxFixAttempts: 5,
  autoFix: true,
  strictMode: false,
  validateOn: ['write_file', 'edit_file', 'create_file'],
  excludePatterns: ['*.json', '*.md', '*.txt', '*.env*', '*.yml', '*.yaml', 'package-lock.json'],
  languages: ['typescript', 'javascript', 'tsx', 'jsx', 'ts', 'js'],
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

export class AgentCodeValidationMiddleware extends EventEmitter {
  private config: ValidationConfig;
  private validator: CodeValidator;
  private validationHistory: Map<string, ValidationResult[]> = new Map();

  constructor(config: Partial<ValidationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validator = new CodeValidator({
      workspacePath: process.cwd(),
      enableLint: true,
      enableTypeCheck: true,
      enableTests: false, // Tests on-demand only
      autoFix: this.config.autoFix,
    });
  }

  /**
   * Verifica se o arquivo deve ser validado
   */
  private shouldValidate(filePath: string): boolean {
    if (!this.config.enabled) return false;

    // Check exclusion patterns
    for (const pattern of this.config.excludePatterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(filePath)) {
        return false;
      }
    }

    // Check language
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return this.config.languages.includes(ext);
  }

  /**
   * Intercepta uma operação de escrita e valida
   */
  async interceptWrite(
    operation: 'write_file' | 'edit_file' | 'create_file',
    filePath: string,
    content: string,
    agent: AutonomousAgent
  ): Promise<{
    success: boolean;
    validation: ValidationResult | null;
    fixedContent?: string;
    attempts: number;
  }> {
    if (!this.config.validateOn.includes(operation)) {
      return { success: true, validation: null, attempts: 0 };
    }

    if (!this.shouldValidate(filePath)) {
      this.emit('validation:skipped', { filePath, reason: 'excluded' });
      return { success: true, validation: null, attempts: 0 };
    }

    console.log(`[CodeValidation] Validating ${filePath} after ${operation}...`);
    this.emit('validation:started', { filePath, operation });

    let currentContent = content;
    let attempts = 0;
    let lastValidation: ValidationResult | null = null;

    while (attempts < this.config.maxFixAttempts) {
      attempts++;

      // Validate
      lastValidation = await this.validator.validateFile(filePath);

      this.emit('validation:result', { 
        filePath, 
        attempt: attempts, 
        result: lastValidation 
      });

      // Store in history
      const history = this.validationHistory.get(filePath) || [];
      history.push(lastValidation);
      this.validationHistory.set(filePath, history.slice(-10));

      // Check if clean
      if (lastValidation.success) {
        console.log(`[CodeValidation] ✅ ${filePath} is clean after ${attempts} attempt(s)`);
        this.emit('validation:success', { filePath, attempts });
        return { 
          success: true, 
          validation: lastValidation, 
          fixedContent: currentContent,
          attempts 
        };
      }

      // Log errors
      const errorCount = lastValidation.errors.length;
      const warningCount = lastValidation.warnings.length;
      console.log(`[CodeValidation] ❌ ${filePath}: ${errorCount} errors, ${warningCount} warnings`);

      // Try to fix
      if (this.config.autoFix && attempts < this.config.maxFixAttempts) {
        console.log(`[CodeValidation] Attempting auto-fix (attempt ${attempts + 1}/${this.config.maxFixAttempts})...`);
        
        const fixedContent = await this.attemptFix(
          currentContent,
          filePath,
          lastValidation,
          agent
        );

        if (fixedContent && fixedContent !== currentContent) {
          currentContent = fixedContent;
          this.emit('validation:fixed', { filePath, attempt: attempts });
        } else {
          // No fix possible, break
          console.log(`[CodeValidation] No automatic fix available`);
          break;
        }
      } else {
        break;
      }
    }

    // Failed to fix
    console.log(`[CodeValidation] ❌ Failed to fix ${filePath} after ${attempts} attempts`);
    this.emit('validation:failed', { 
      filePath, 
      attempts, 
      errors: lastValidation?.errors || [] 
    });

    return {
      success: false,
      validation: lastValidation,
      fixedContent: currentContent,
      attempts,
    };
  }

  /**
   * Tenta corrigir o código usando IA
   */
  private async attemptFix(
    content: string,
    filePath: string,
    validation: ValidationResult,
    agent: AutonomousAgent
  ): Promise<string | null> {
    // First try ESLint auto-fix
    if (validation.autoFixable.length > 0) {
      const eslintFixed = await this.validator.runESLintAutoFix(content, filePath);
      if (eslintFixed !== content) {
        return eslintFixed;
      }
    }

    // Use AI to fix remaining issues
    const errorSummary = formatErrorsForAI(validation);
    const fixInstructions = generateFixInstructions(validation);

    const prompt = `Você é um assistente de correção de código. Corrija os erros no código abaixo.

ARQUIVO: ${filePath}

ERROS ENCONTRADOS:
${errorSummary}

INSTRUÇÕES DE CORREÇÃO:
${fixInstructions}

CÓDIGO ATUAL:
\`\`\`
${content}
\`\`\`

REGRAS:
1. Corrija APENAS os erros listados
2. Não mude a lógica ou estrutura do código
3. Mantenha o estilo consistente
4. Retorne APENAS o código corrigido, sem explicações
5. Não adicione marcadores de código (\`\`\`)

CÓDIGO CORRIGIDO:`;

    try {
      const response = await aiService.chat({
        messages: [
          { role: 'system', content: 'Você é um especialista em correção de código. Retorne apenas código corrigido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxTokens: 4000,
      });

      // Extract code from response
      let fixedCode = response.content;
      
      // Remove markdown code blocks if present
      const codeMatch = fixedCode.match(/```(?:typescript|javascript|tsx|jsx|ts|js)?\n?([\s\S]*?)```/);
      if (codeMatch) {
        fixedCode = codeMatch[1];
      }

      // Basic sanity check
      if (fixedCode.length > content.length * 0.5 && fixedCode.length < content.length * 2) {
        return fixedCode.trim();
      }

      return null;
    } catch (error) {
      console.error('[CodeValidation] AI fix failed:', error);
      return null;
    }
  }

  /**
   * Valida um arquivo existente
   */
  async validateExistingFile(filePath: string): Promise<ValidationResult> {
    return this.validator.validateFile(filePath);
  }

  /**
   * Valida todo o workspace
   */
  async validateWorkspace(paths?: string[]): Promise<ValidationResult> {
    if (paths && paths.length > 0) {
      return this.validator.validateFiles(paths);
    }
    return this.validator.validateWorkspace();
  }

  /**
   * Obtém histórico de validação de um arquivo
   */
  getValidationHistory(filePath: string): ValidationResult[] {
    return this.validationHistory.get(filePath) || [];
  }

  /**
   * Obtém estatísticas de validação
   */
  getStats(): {
    totalValidations: number;
    successRate: number;
    averageAttempts: number;
    commonErrors: Array<{ code: string; count: number }>;
  } {
    let totalValidations = 0;
    let successCount = 0;
    let totalAttempts = 0;
    const errorCounts = new Map<string, number>();

    this.validationHistory.forEach((results) => {
      results.forEach((result, index) => {
        totalValidations++;
        if (result.success) {
          successCount++;
        }
        if (index === results.length - 1 && result.success) {
          totalAttempts += results.length;
        }

        result.errors.forEach((error) => {
          const code = error.rule || 'unknown';
          errorCounts.set(code, (errorCounts.get(code) || 0) + 1);
        });
      });
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalValidations,
      successRate: totalValidations > 0 ? successCount / totalValidations : 0,
      averageAttempts: successCount > 0 ? totalAttempts / successCount : 0,
      commonErrors,
    };
  }
}

// ============================================================================
// AGENT WRAPPER
// ============================================================================

/**
 * Cria um wrapper que intercepta todas as operações de arquivo do agent
 */
export function createValidatedAgent(
  agent: AutonomousAgent,
  config?: Partial<ValidationConfig>
): AutonomousAgent & { validation: AgentCodeValidationMiddleware } {
  const middleware = new AgentCodeValidationMiddleware(config);

  // Intercept tool execution
  const originalExecuteTool = (agent as any).executeToolCall.bind(agent);

  (agent as any).executeToolCall = async function (taskId: string, action: any) {
    const result = await originalExecuteTool(taskId, action);

    // If it's a file write operation, validate
    if (
      ['write_file', 'edit_file', 'create_file'].includes(action.tool) &&
      action.input?.path &&
      action.input?.content
    ) {
      const validation = await middleware.interceptWrite(
        action.tool as any,
        action.input.path,
        action.input.content,
        agent
      );

      if (!validation.success && validation.validation) {
        // Add validation errors to result
        result.validationErrors = validation.validation.errors;
        result.validationWarnings = validation.validation.warnings;
        result.fixedContent = validation.fixedContent;
        result.fixAttempts = validation.attempts;
      }
    }

    return result;
  };

  // Forward validation events
  middleware.on('validation:success', (data) => {
    agent.emit('code:validated', data);
  });

  middleware.on('validation:failed', (data) => {
    agent.emit('code:validation_failed', data);
  });

  // Attach middleware to agent
  (agent as any).validation = middleware;

  return agent as AutonomousAgent & { validation: AgentCodeValidationMiddleware };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const codeValidationMiddleware = new AgentCodeValidationMiddleware();

export default AgentCodeValidationMiddleware;
