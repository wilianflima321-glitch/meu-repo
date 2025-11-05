import { ElementHandle } from '@playwright/test';
import { TheiaStatusIndicator } from './theia-status-indicator';
export declare class TheiaProblemIndicator extends TheiaStatusIndicator {
    id: string;
    numberOfProblems(): Promise<number>;
    numberOfWarnings(): Promise<number>;
    protected getSpans(): Promise<ElementHandle[] | undefined>;
}
//# sourceMappingURL=theia-problem-indicator.d.ts.map