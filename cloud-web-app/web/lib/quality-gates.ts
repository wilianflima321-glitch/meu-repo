/**
 * ============================================
 * AETHEL QUALITY GATES: Verificação de Padrões AAA
 * ============================================
 * 
 * Sistema automático que valida código, assets e
 * interfaces contra os padrões de qualidade do
 * AETHEL_DESIGN_MANIFESTO.
 * 
 * Garante que tudo gerado pela IA está em conformidade
 * com os padrões de excelência AAA.
 */

export interface QualityCheckResult {
  name: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestions?: string[];
}

export interface QualityReport {
  timestamp: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  results: QualityCheckResult[];
  score: number; // 0-100
}

/**
 * QualityGates: Verificador de qualidade
 */
export class QualityGates {
  /**
   * Verificar qualidade de código TypeScript
   */
  static checkTypeScriptCode(code: string): QualityCheckResult[] {
    const results: QualityCheckResult[] = [];

    // Check 1: Tipagem completa
    const hasAnyType = code.includes(': any');
    results.push({
      name: 'No Implicit Any Types',
      passed: !hasAnyType,
      severity: hasAnyType ? 'error' : 'info',
      message: hasAnyType ? 'Found implicit "any" types' : 'All types are properly defined',
      suggestions: hasAnyType ? ['Replace "any" with specific types'] : undefined,
    });

    // Check 2: Funções documentadas
    const functionCount = (code.match(/function|const.*=.*\(/g) || []).length;
    const docCount = (code.match(/\/\*\*|\/\//g) || []).length;
    const hasDocumentation = docCount > functionCount * 0.5;

    results.push({
      name: 'Function Documentation',
      passed: hasDocumentation,
      severity: hasDocumentation ? 'info' : 'warning',
      message: hasDocumentation ? 'Functions are properly documented' : 'Some functions lack documentation',
      suggestions: !hasDocumentation ? ['Add JSDoc comments to all functions'] : undefined,
    });

    // Check 3: Performance (não usar loops aninhados excessivos)
    const nestedLoops = (code.match(/for.*for|while.*while/g) || []).length;
    const hasPerformanceIssues = nestedLoops > 2;

    results.push({
      name: 'Performance Optimization',
      passed: !hasPerformanceIssues,
      severity: hasPerformanceIssues ? 'warning' : 'info',
      message: hasPerformanceIssues ? 'Detected potentially slow nested loops' : 'Code is optimized for performance',
      suggestions: hasPerformanceIssues ? ['Refactor nested loops to use maps/sets instead'] : undefined,
    });

    // Check 4: Segurança (não usar eval, innerHTML, etc)
    const unsafePatterns = ['eval(', 'innerHTML', 'dangerouslySetInnerHTML'];
    const hasUnsafeCode = unsafePatterns.some((pattern) => code.includes(pattern));

    results.push({
      name: 'Security Best Practices',
      passed: !hasUnsafeCode,
      severity: hasUnsafeCode ? 'error' : 'info',
      message: hasUnsafeCode ? 'Found potentially unsafe code patterns' : 'Code follows security best practices',
      suggestions: hasUnsafeCode ? ['Avoid eval, innerHTML, and dangerouslySetInnerHTML'] : undefined,
    });

    return results;
  }

  /**
   * Verificar qualidade de componentes React
   */
  static checkReactComponent(code: string): QualityCheckResult[] {
    const results: QualityCheckResult[] = [];

    // Check 1: Props tipadas
    const hasPropsInterface = code.includes('interface') && code.includes('Props');
    results.push({
      name: 'Props Type Definition',
      passed: hasPropsInterface,
      severity: hasPropsInterface ? 'info' : 'error',
      message: hasPropsInterface ? 'Props are properly typed' : 'Props should be defined in an interface',
    });

    // Check 2: Hooks usage
    const usesHooks = code.includes('useState') || code.includes('useEffect') || code.includes('useCallback');
    const hasProperCleanup = !code.includes('useEffect') || code.includes('return () =>');

    results.push({
      name: 'Hook Cleanup',
      passed: hasProperCleanup,
      severity: hasProperCleanup ? 'info' : 'warning',
      message: hasProperCleanup ? 'Hooks are properly cleaned up' : 'useEffect should have cleanup functions',
    });

    // Check 3: Memoization
    const hasMemoization = code.includes('React.memo') || code.includes('useMemo') || code.includes('useCallback');
    results.push({
      name: 'Performance Memoization',
      passed: hasMemoization,
      severity: hasMemoization ? 'info' : 'warning',
      message: hasMemoization ? 'Component uses memoization' : 'Consider using React.memo or useMemo for optimization',
    });

    return results;
  }

  /**
   * Verificar qualidade de assets (imagens, modelos 3D)
   */
  static checkAssetQuality(assetType: string, metadata: Record<string, unknown>): QualityCheckResult[] {
    const results: QualityCheckResult[] = [];

    if (assetType === 'image') {
      // Check resolução
      const width = (metadata.width as number) || 0;
      const height = (metadata.height as number) || 0;
      const isHighRes = width >= 1024 && height >= 1024;

      results.push({
        name: 'Image Resolution',
        passed: isHighRes,
        severity: isHighRes ? 'info' : 'warning',
        message: isHighRes ? `Image is high resolution (${width}x${height})` : `Image resolution is low (${width}x${height})`,
        suggestions: !isHighRes ? ['Use at least 1024x1024 resolution for AAA quality'] : undefined,
      });

      // Check formato
      const format = metadata.format as string;
      const isOptimalFormat = ['webp', 'avif'].includes(format);

      results.push({
        name: 'Asset Format Optimization',
        passed: isOptimalFormat,
        severity: isOptimalFormat ? 'info' : 'warning',
        message: isOptimalFormat ? `Using optimized format: ${format}` : `Format ${format} is not optimized`,
        suggestions: !isOptimalFormat ? ['Convert to WebP or AVIF for better compression'] : undefined,
      });
    }

    if (assetType === 'model3d') {
      // Check polycount
      const polycount = (metadata.polycount as number) || 0;
      const isOptimal = polycount < 100000; // 100k polys max para web

      results.push({
        name: '3D Model Optimization',
        passed: isOptimal,
        severity: isOptimal ? 'info' : 'warning',
        message: isOptimal ? `Model is optimized (${polycount} polys)` : `Model has too many polygons (${polycount})`,
        suggestions: !isOptimal ? ['Reduce polygon count to <100k for web performance'] : undefined,
      });
    }

    return results;
  }

  /**
   * Verificar conformidade com Design System
   */
  static checkDesignSystemCompliance(componentCode: string): QualityCheckResult[] {
    const results: QualityCheckResult[] = [];

    // Check 1: Usar classes do design system
    const usesDesignSystem = componentCode.includes('className') && (
      componentCode.includes('deep-space') ||
      componentCode.includes('aethel-') ||
      componentCode.includes('globals.css')
    );

    results.push({
      name: 'Design System Usage',
      passed: usesDesignSystem,
      severity: usesDesignSystem ? 'info' : 'warning',
      message: usesDesignSystem ? 'Component uses Aethel Design System' : 'Component should use Aethel Design System classes',
      suggestions: !usesDesignSystem ? ['Import styles from globals.css and use aethel-* classes'] : undefined,
    });

    // Check 2: Cores do manifesto
    const usesManifestoColors = !componentCode.includes('color:') || (
      componentCode.includes('#0a0e27') || // Deep Space Dark
      componentCode.includes('#00ff88') || // Neon Green
      componentCode.includes('#1a1f3a')    // Dark Blue
    );

    results.push({
      name: 'Color Palette Compliance',
      passed: usesManifestoColors,
      severity: usesManifestoColors ? 'info' : 'warning',
      message: usesManifestoColors ? 'Uses approved color palette' : 'Uses unapproved colors',
    });

    return results;
  }

  /**
   * Executar todos os checks e gerar relatório
   */
  static generateFullReport(
    code: string,
    componentType: 'typescript' | 'react' | 'asset' = 'typescript'
  ): QualityReport {
    let results: QualityCheckResult[] = [];

    if (componentType === 'typescript') {
      results = this.checkTypeScriptCode(code);
    } else if (componentType === 'react') {
      results = [
        ...this.checkTypeScriptCode(code),
        ...this.checkReactComponent(code),
        ...this.checkDesignSystemCompliance(code),
      ];
    }

    const passedChecks = results.filter((r) => r.passed).length;
    const failedChecks = results.filter((r) => !r.passed).length;
    const score = Math.round((passedChecks / results.length) * 100);

    return {
      timestamp: Date.now(),
      totalChecks: results.length,
      passedChecks,
      failedChecks,
      results,
      score,
    };
  }
}

export default QualityGates;
