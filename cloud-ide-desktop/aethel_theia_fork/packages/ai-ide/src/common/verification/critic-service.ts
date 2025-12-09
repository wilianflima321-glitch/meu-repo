/**
 * Critic/Verifier Service
 * Automatic verification before execution
 */

export interface VerificationResult {
    passed: boolean;
    score: number; // 0-1
    issues: VerificationIssue[];
    recommendations: string[];
}

export interface VerificationIssue {
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    location?: string;
}

/**
 * Code Quality Critic
 */
export class CodeQualityCritic {
    async verify(code: string, language: string): Promise<VerificationResult> {
        const issues: VerificationIssue[] = [];
        
        // Security checks
        if (code.includes('eval(') || code.includes('exec(')) {
            issues.push({
                severity: 'critical',
                category: 'security',
                message: 'Dangerous eval/exec usage detected'
            });
        }

        // Hardcoded secrets
        if (/api[_-]?key|password|secret/i.test(code) && /['"][a-zA-Z0-9]{20,}['"]/.test(code)) {
            issues.push({
                severity: 'critical',
                category: 'security',
                message: 'Potential hardcoded secret detected'
            });
        }

        // Code complexity (simplified)
        const lines = code.split('\n').length;
        if (lines > 500) {
            issues.push({
                severity: 'warning',
                category: 'complexity',
                message: `File too large (${lines} lines). Consider splitting.`
            });
        }

        // Test coverage hint
        if (!code.includes('test') && !code.includes('spec')) {
            issues.push({
                severity: 'info',
                category: 'testing',
                message: 'No tests detected. Consider adding tests.'
            });
        }

        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const passed = criticalCount === 0;
        const score = Math.max(0, 1 - (criticalCount * 0.5) - (issues.length * 0.1));

        return {
            passed,
            score,
            issues,
            recommendations: this.generateRecommendations(issues)
        };
    }

    private generateRecommendations(issues: VerificationIssue[]): string[] {
        const recommendations: string[] = [];
        
        if (issues.some(i => i.category === 'security')) {
            recommendations.push('Review security issues before deployment');
        }
        
        if (issues.some(i => i.category === 'complexity')) {
            recommendations.push('Refactor complex code for maintainability');
        }
        
        if (issues.some(i => i.category === 'testing')) {
            recommendations.push('Add unit tests to improve coverage');
        }

        return recommendations;
    }
}

/**
 * Trading Sanity Critic
 */
export class TradingSanityCritic {
    async verify(strategy: any): Promise<VerificationResult> {
        const issues: VerificationIssue[] = [];

        // Check for stop-loss
        if (!strategy.stopLoss) {
            issues.push({
                severity: 'critical',
                category: 'risk',
                message: 'Stop-loss is mandatory'
            });
        }

        // Check for position sizing
        if (!strategy.positionSize || strategy.positionSize > 0.1) {
            issues.push({
                severity: 'critical',
                category: 'risk',
                message: 'Position size must be ≤ 10% of portfolio'
            });
        }

        // Check for backtesting
        if (!strategy.backtestResults) {
            issues.push({
                severity: 'critical',
                category: 'validation',
                message: 'Backtest required before execution'
            });
        } else {
            // Validate backtest results
            if (strategy.backtestResults.sharpeRatio < 1.0) {
                issues.push({
                    severity: 'warning',
                    category: 'performance',
                    message: `Low Sharpe ratio: ${strategy.backtestResults.sharpeRatio}`
                });
            }

            if (strategy.backtestResults.maxDrawdown > 0.2) {
                issues.push({
                    severity: 'warning',
                    category: 'risk',
                    message: `High max drawdown: ${strategy.backtestResults.maxDrawdown * 100}%`
                });
            }
        }

        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const passed = criticalCount === 0;
        const score = Math.max(0, 1 - (criticalCount * 0.5) - (issues.length * 0.1));

        return {
            passed,
            score,
            issues,
            recommendations: [
                'Review risk parameters',
                'Validate backtest on multiple timeframes',
                'Start with paper trading'
            ]
        };
    }
}

/**
 * Research Factuality Critic
 */
export class ResearchFactualityCritic {
    async verify(research: any): Promise<VerificationResult> {
        const issues: VerificationIssue[] = [];

        // Check for sources
        if (!research.sources || research.sources.length === 0) {
            issues.push({
                severity: 'critical',
                category: 'sourcing',
                message: 'No sources provided'
            });
        }

        // Check source diversity
        if (research.sources && research.sources.length < 3) {
            issues.push({
                severity: 'warning',
                category: 'sourcing',
                message: 'Limited source diversity (< 3 sources)'
            });
        }

        // Check for citations
        const citationCount = (research.content.match(/\[\d+\]/g) || []).length;
        if (citationCount === 0) {
            issues.push({
                severity: 'warning',
                category: 'attribution',
                message: 'No citations found in content'
            });
        }

        // Check for bias indicators
        const biasWords = ['always', 'never', 'obviously', 'clearly', 'everyone knows'];
        const hasBias = biasWords.some(word => research.content.toLowerCase().includes(word));
        if (hasBias) {
            issues.push({
                severity: 'info',
                category: 'bias',
                message: 'Potential bias indicators detected'
            });
        }

        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const passed = criticalCount === 0;
        const score = Math.max(0, 1 - (criticalCount * 0.5) - (issues.length * 0.1));

        return {
            passed,
            score,
            issues,
            recommendations: [
                'Add more diverse sources',
                'Include proper citations',
                'Review for potential bias'
            ]
        };
    }
}

/**
 * Creative Continuity Critic
 */
export class CreativeContinuityCritic {
    async verify(scene: any, context: any): Promise<VerificationResult> {
        const issues: VerificationIssue[] = [];

        // Check character consistency
        if (scene.characters) {
            for (const character of scene.characters) {
                const previousAppearances = context.characters?.[character.id];
                if (previousAppearances) {
                    // Check for visual consistency
                    if (character.appearance !== previousAppearances.appearance) {
                        issues.push({
                            severity: 'warning',
                            category: 'continuity',
                            message: `Character ${character.name} appearance changed`,
                            location: scene.id
                        });
                    }
                }
            }
        }

        // Check timeline consistency
        if (scene.timestamp && context.timeline) {
            const previousScenes = context.timeline.filter((s: any) => s.timestamp > scene.timestamp);
            if (previousScenes.length > 0) {
                issues.push({
                    severity: 'critical',
                    category: 'timeline',
                    message: 'Scene timestamp conflicts with existing timeline'
                });
            }
        }

        // Check style consistency
        if (scene.style && context.style && scene.style !== context.style) {
            issues.push({
                severity: 'warning',
                category: 'style',
                message: 'Style differs from established aesthetic'
            });
        }

        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const passed = criticalCount === 0;
        const score = Math.max(0, 1 - (criticalCount * 0.5) - (issues.length * 0.1));

        return {
            passed,
            score,
            issues,
            recommendations: [
                'Review character consistency',
                'Validate timeline order',
                'Ensure style coherence'
            ]
        };
    }
}

/**
 * Unified Critic Service
 */
export class CriticService {
    private codeQuality = new CodeQualityCritic();
    private tradingSanity = new TradingSanityCritic();
    private researchFactuality = new ResearchFactualityCritic();
    private creativeContinuity = new CreativeContinuityCritic();

    async verifyCo(type: 'code' | 'trading' | 'research' | 'creative', payload: any, context?: any): Promise<VerificationResult> {
        switch (type) {
            case 'code':
                return this.codeQuality.verify(payload.code, payload.language);
            case 'trading':
                return this.tradingSanity.verify(payload);
            case 'research':
                return this.researchFactuality.verify(payload);
            case 'creative':
                return this.creativeContinuity.verify(payload, context);
            default:
                throw new Error(`Unknown verification type: ${type}`);
        }
    }
}
