import { AIActivationService } from '@theia/ai-core/lib/browser';
import { Disposable, PreferenceService } from '@theia/core';
import { FrontendApplicationContribution, KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser';
export declare class AIFrontendApplicationContribution implements FrontendApplicationContribution, KeybindingContribution {
    private inlineCodeCompletionProvider;
    protected readonly preferenceService: PreferenceService;
    protected readonly activationService: AIActivationService;
    private completionCache;
    private debouncer;
    private debounceDelay;
    private toDispose;
    onDidInitializeLayout(): void;
    protected handlePreferences(): void;
    registerKeybindings(keybindings: KeybindingRegistry): void;
    protected handleInlineCompletions(): Disposable;
}
//# sourceMappingURL=ai-code-frontend-application-contribution.d.ts.map