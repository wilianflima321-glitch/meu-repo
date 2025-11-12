"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmProviderCommandContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const llm_provider_service_1 = require("./llm-provider-service");
const browser_1 = require("@theia/core/lib/browser");
const provider_configuration_widget_1 = require("./ai-configuration/provider-configuration-widget");
const AddLlmProviderCommand = { id: 'ai.addProvider', label: 'AI: Add LLM Provider' };
let LlmProviderCommandContribution = class LlmProviderCommandContribution {
    llmService;
    widgetManager;
    registerCommands(reg) {
        reg.registerCommand(AddLlmProviderCommand, {
            execute: async () => {
                try {
                    const widget = await this.widgetManager.getOrCreateWidget(provider_configuration_widget_1.ProviderConfigurationWidgetID);
                    if (widget && typeof widget.activate === 'function') {
                        widget.activate();
                    }
                }
                catch (e) {
                    console.error('Failed to open provider configuration widget', e);
                }
            }
        });
    }
};
exports.LlmProviderCommandContribution = LlmProviderCommandContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    tslib_1.__metadata("design:type", llm_provider_service_1.LlmProviderService)
], LlmProviderCommandContribution.prototype, "llmService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    tslib_1.__metadata("design:type", browser_1.WidgetManager)
], LlmProviderCommandContribution.prototype, "widgetManager", void 0);
exports.LlmProviderCommandContribution = LlmProviderCommandContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], LlmProviderCommandContribution);
//# sourceMappingURL=llm-provider-command-contribution.js.map