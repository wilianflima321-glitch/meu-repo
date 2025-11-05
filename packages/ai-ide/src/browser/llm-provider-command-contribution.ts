import { injectable, inject } from '@theia/core/shared/inversify';
import { CommandContribution, CommandRegistry } from '@theia/core';
import { LlmProviderService } from './llm-provider-service';
import { WidgetManager } from '@theia/core/lib/browser';
import { ProviderConfigurationWidgetID } from './ai-configuration/provider-configuration-widget';

const AddLlmProviderCommand = { id: 'ai.addProvider', label: 'AI: Add LLM Provider' };

@injectable()
export class LlmProviderCommandContribution implements CommandContribution {
    @inject(LlmProviderService)
    private _llmService?: LlmProviderService;
    @inject(LlmProviderService)
    protected set llmService(v: LlmProviderService) { this._llmService = v; }
    protected get llmService(): LlmProviderService { if (!this._llmService) { throw new Error('LlmProviderCommandContribution: llmService not injected'); } return this._llmService; }
    private _widgetManager?: WidgetManager;
    @inject(WidgetManager)
    protected set widgetManager(v: WidgetManager) { this._widgetManager = v; }
    protected get widgetManager(): WidgetManager { if (!this._widgetManager) { throw new Error('LlmProviderCommandContribution: widgetManager not injected'); } return this._widgetManager; }

    registerCommands(reg: CommandRegistry): void {
        reg.registerCommand(AddLlmProviderCommand, {
            execute: async () => {
                try {
                    const widget = await this.widgetManager.getOrCreateWidget(ProviderConfigurationWidgetID);
                    const w = widget as unknown as { activate?: () => void } | undefined;
                    if (w && typeof w.activate === 'function') {
                        w.activate();
                    }
                } catch (e) {
                    console.error('Failed to open provider configuration widget', e);
                }
            }
        });
    }
}
