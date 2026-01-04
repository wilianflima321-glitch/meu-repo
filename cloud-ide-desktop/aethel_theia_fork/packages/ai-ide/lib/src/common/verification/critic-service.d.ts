/**
 * Critic/Verifier Service
 * Automatic verification before execution
 */
export interface VerificationResult {
    passed: boolean;
    score: number;
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
export declare class CodeQualityCritic {
    verify(code: string, language: string): Promise<VerificationResult>;
    private generateRecommendations;
}
/**
 * Trading Sanity Critic
 */
export declare class TradingSanityCritic {
    verify(strategy: any): Promise<VerificationResult>;
}
/**
 * Research Factuality Critic
 */
export declare class ResearchFactualityCritic {
    verify(research: any): Promise<VerificationResult>;
}
/**
 * Creative Continuity Critic
 */
export declare class CreativeContinuityCritic {
    verify(scene: any, context: any): Promise<VerificationResult>;
}
/**
 * Unified Critic Service
 */
export declare class CriticService {
    private codeQuality;
    private tradingSanity;
    private researchFactuality;
    private creativeContinuity;
    verifyCo(type: 'code' | 'trading' | 'research' | 'creative', payload: any, context?: any): Promise<VerificationResult>;
}
