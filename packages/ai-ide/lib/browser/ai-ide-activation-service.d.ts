import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { Emitter, MaybePromise, Event, PreferenceService } from '@theia/core';
import { ContextKeyService, ContextKey } from '@theia/core/lib/browser/context-key-service';
import { AIActivationService } from '@theia/ai-core/lib/browser/ai-activation-service';
/**
 * Implements AI Activation Service based on preferences.
 */
export declare class AIIdeActivationServiceImpl implements AIActivationService, FrontendApplicationContribution {
    protected readonly contextKeyService: ContextKeyService;
    protected preferenceService: PreferenceService;
    protected isAiEnabledKey: ContextKey<boolean>;
    protected onDidChangeAIEnabled: Emitter<boolean>;
    get onDidChangeActiveStatus(): Event<boolean>;
    get isActive(): boolean;
    protected updateEnableValue(value: boolean): void;
    initialize(): MaybePromise<void>;
}
//# sourceMappingURL=ai-ide-activation-service.d.ts.map