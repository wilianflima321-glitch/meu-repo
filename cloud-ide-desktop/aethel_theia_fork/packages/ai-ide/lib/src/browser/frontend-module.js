"use strict";
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
require("@fontsource/inter/400.css");
require("@fontsource/inter/500.css");
require("@fontsource/inter/600.css");
require("@fontsource/inter/700.css");
require("@fontsource/jetbrains-mono/400.css");
require("@fontsource/jetbrains-mono/600.css");
require("../../src/browser/style/index.css");
// Inject codicons CSS from CDN at runtime to provide icons without installing
// the package locally (avoids native build/toolchain issues while iterating).
if (typeof document !== 'undefined' && document && document.head) {
    try {
        const _codiconHref = 'https://unpkg.com/@vscode/codicons@latest/dist/codicon.css';
        if (!document.querySelector(`link[href="${_codiconHref}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = _codiconHref;
            document.head.appendChild(link);
        }
    }
    catch (e) {
        // benign if DOM not available at module evaluation time
    }
}
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/ai-chat/lib/common");
const common_2 = require("@theia/ai-core/lib/common");
const architect_agent_1 = require("./architect-agent");
const coder_agent_1 = require("./coder-agent");
const summarize_session_command_contribution_1 = require("./summarize-session-command-contribution");
const workspace_functions_1 = require("./workspace-functions");
const workspace_search_provider_1 = require("./workspace-search-provider");
const browser_1 = require("@theia/core/lib/browser");
const workspace_task_provider_1 = require("./workspace-task-provider");
const workspace_launch_provider_1 = require("./workspace-launch-provider");
const workspace_preferences_1 = require("../common/workspace-preferences");
const file_changeset_functions_1 = require("./file-changeset-functions");
const orchestrator_chat_agent_1 = require("../common/orchestrator-chat-agent");
const universal_chat_agent_1 = require("../common/universal-chat-agent");
const app_tester_chat_agent_1 = require("./app-tester-chat-agent");
const command_chat_agents_1 = require("../common/command-chat-agents");
const context_functions_1 = require("./context-functions");
const agent_configuration_widget_1 = require("./ai-configuration/agent-configuration-widget");
const ai_configuration_service_1 = require("./ai-configuration/ai-configuration-service");
const ai_configuration_view_contribution_1 = require("./ai-configuration/ai-configuration-view-contribution");
const ai_configuration_widget_1 = require("./ai-configuration/ai-configuration-widget");
const variable_configuration_widget_1 = require("./ai-configuration/variable-configuration-widget");
const context_files_variable_1 = require("../common/context-files-variable");
const tools_configuration_widget_1 = require("./ai-configuration/tools-configuration-widget");
const tab_bar_toolbar_1 = require("@theia/core/lib/browser/shell/tab-bar-toolbar");
const template_preference_contribution_1 = require("./template-preference-contribution");
const mcp_configuration_widget_1 = require("./ai-configuration/mcp-configuration-widget");
const chat_tree_view_1 = require("@theia/ai-chat-ui/lib/browser/chat-tree-view");
const ide_chat_welcome_message_provider_1 = require("./ide-chat-welcome-message-provider");
const token_usage_configuration_widget_1 = require("./ai-configuration/token-usage-configuration-widget");
const provider_configuration_widget_1 = require("./ai-configuration/provider-configuration-widget");
const task_background_summary_variable_1 = require("./task-background-summary-variable");
const task_context_file_storage_service_1 = require("./task-context-file-storage-service");
const task_context_service_1 = require("@theia/ai-chat/lib/browser/task-context-service");
const core_1 = require("@theia/core");
const prompt_fragments_configuration_widget_1 = require("./ai-configuration/prompt-fragments-configuration-widget");
const browser_automation_protocol_1 = require("../common/browser-automation-protocol");
const app_tester_chat_functions_1 = require("./app-tester-chat-functions");
const model_aliases_configuration_widget_1 = require("./ai-configuration/model-aliases-configuration-widget");
const ai_ide_preferences_1 = require("../common/ai-ide-preferences");
const browser_2 = require("@theia/ai-core/lib/browser");
const ai_ide_activation_service_1 = require("./ai-ide-activation-service");
const ai_configuration_preferences_1 = require("../common/ai-configuration-preferences");
const llm_provider_registry_1 = require("./llm-provider-registry");
const ai_llm_preferences_1 = require("../common/ai-llm-preferences");
const llm_provider_service_1 = require("./llm-provider-service");
const llm_provider_service_2 = require("../common/llm-provider-service");
const llm_provider_command_contribution_1 = require("./llm-provider-command-contribution");
const billing_admin_widget_1 = require("./admin/billing-admin-widget");
const billing_admin_contribution_1 = require("./admin/billing-admin-contribution");
const billing_admin_command_contribution_1 = require("./admin/billing-admin-command-contribution");
const ai_ide_layout_contribution_1 = require("./layout/ai-ide-layout-contribution");
const ai_ide_branding_widget_1 = require("./branding/ai-ide-branding-widget");
const ai_ide_branding_contribution_1 = require("./branding/ai-ide-branding-contribution");
const ai_ide_status_bar_contribution_1 = require("./status/ai-ide-status-bar-contribution");
exports.default = new inversify_1.ContainerModule((bind, _unbind, _isBound, rebind) => {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_ide_preferences_1.aiIdePreferenceSchema });
    bind(core_1.PreferenceContribution).toConstantValue({ schema: workspace_preferences_1.WorkspacePreferencesSchema });
    bind(ai_ide_activation_service_1.AIIdeActivationServiceImpl).toSelf().inSingletonScope();
    // rebinds the default implementation of '@theia/ai-core'
    rebind(browser_2.AIActivationService).toService(ai_ide_activation_service_1.AIIdeActivationServiceImpl);
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_llm_preferences_1.aiLlmPreferenceSchema });
    bind(llm_provider_registry_1.LlmProviderRegistry).toSelf().inSingletonScope();
    // Bind the browser implementation to the common abstract token so common code can inject the service
    bind(llm_provider_service_2.LlmProviderService).to(llm_provider_service_1.LlmProviderService).inSingletonScope();
    bind(llm_provider_service_1.LlmProviderService).toSelf().inSingletonScope();
    bind(llm_provider_command_contribution_1.LlmProviderCommandContribution).toSelf().inSingletonScope();
    bind(core_1.CommandContribution).toService(llm_provider_command_contribution_1.LlmProviderCommandContribution);
    bind(provider_configuration_widget_1.ProviderConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({ id: provider_configuration_widget_1.ProviderConfigurationWidget.ID, createWidget: () => ctx.container.get(provider_configuration_widget_1.ProviderConfigurationWidget) }))
        .inSingletonScope();
    // Billing admin widget
    bind(billing_admin_widget_1.BillingAdminWidget).toSelf();
    bind(billing_admin_contribution_1.BillingAdminContribution).toSelf().inSingletonScope();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({ id: billing_admin_widget_1.BillingAdminWidget.ID, createWidget: () => ctx.container.get(billing_admin_widget_1.BillingAdminWidget) }))
        .inSingletonScope();
    bind(billing_admin_command_contribution_1.BillingAdminCommandContribution).toSelf().inSingletonScope();
    bind(core_1.CommandContribution).toService(billing_admin_command_contribution_1.BillingAdminCommandContribution);
    bind(browser_1.FrontendApplicationContribution).toService(billing_admin_contribution_1.BillingAdminContribution);
    bind(ai_ide_branding_widget_1.AiIdeBrandingWidget).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).to(ai_ide_branding_contribution_1.AiIdeBrandingContribution).inSingletonScope();
    bind(ai_ide_layout_contribution_1.AiIdeLayoutContribution).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).toService(ai_ide_layout_contribution_1.AiIdeLayoutContribution);
    bind(ai_ide_status_bar_contribution_1.AiIdeStatusBarContribution).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).toService(ai_ide_status_bar_contribution_1.AiIdeStatusBarContribution);
    // ensure preference key symbol is referenced so TS doesn't report it as unused in incremental builds
    const _aiLlmPref = ai_llm_preferences_1.AI_LLM_PROVIDERS_PREF;
    // reference the pref token to avoid unused-variable warnings in incremental builds
    void _aiLlmPref;
    bind(architect_agent_1.ArchitectAgent).toSelf().inSingletonScope();
    bind(common_2.Agent).toService(architect_agent_1.ArchitectAgent);
    bind(common_1.ChatAgent).toService(architect_agent_1.ArchitectAgent);
    bind(coder_agent_1.CoderAgent).toSelf().inSingletonScope();
    bind(common_2.Agent).toService(coder_agent_1.CoderAgent);
    bind(common_1.ChatAgent).toService(coder_agent_1.CoderAgent);
    bind(orchestrator_chat_agent_1.OrchestratorChatAgent).toSelf().inSingletonScope();
    bind(common_2.Agent).toService(orchestrator_chat_agent_1.OrchestratorChatAgent);
    bind(common_1.ChatAgent).toService(orchestrator_chat_agent_1.OrchestratorChatAgent);
    bind(universal_chat_agent_1.UniversalChatAgent).toSelf().inSingletonScope();
    bind(common_2.Agent).toService(universal_chat_agent_1.UniversalChatAgent);
    bind(common_1.ChatAgent).toService(universal_chat_agent_1.UniversalChatAgent);
    bind(app_tester_chat_agent_1.AppTesterChatAgent).toSelf().inSingletonScope();
    bind(common_2.Agent).toService(app_tester_chat_agent_1.AppTesterChatAgent);
    bind(common_1.ChatAgent).toService(app_tester_chat_agent_1.AppTesterChatAgent);
    bind(browser_automation_protocol_1.BrowserAutomation).toDynamicValue((ctx) => {
        const provider = ctx.container.get(browser_1.RemoteConnectionProvider);
        // `createProxy` may be untyped in some versions; avoid using a type-argument and cast instead
        return provider.createProxy(browser_automation_protocol_1.browserAutomationPath);
    }).inSingletonScope();
    bind(command_chat_agents_1.CommandChatAgent).toSelf().inSingletonScope();
    bind(common_2.Agent).toService(command_chat_agents_1.CommandChatAgent);
    bind(common_1.ChatAgent).toService(command_chat_agents_1.CommandChatAgent);
    bind(common_1.DefaultChatAgentId).toConstantValue({ id: orchestrator_chat_agent_1.OrchestratorChatAgentId });
    bind(common_1.FallbackChatAgentId).toConstantValue({ id: universal_chat_agent_1.UniversalChatAgentId });
    bind(chat_tree_view_1.ChatWelcomeMessageProvider).to(ide_chat_welcome_message_provider_1.IdeChatWelcomeMessageProvider);
    (0, common_2.bindToolProvider)(workspace_functions_1.GetWorkspaceFileList, bind);
    (0, common_2.bindToolProvider)(workspace_functions_1.FileContentFunction, bind);
    (0, common_2.bindToolProvider)(workspace_functions_1.GetWorkspaceDirectoryStructure, bind);
    (0, common_2.bindToolProvider)(workspace_functions_1.FileDiagnosticProvider, bind);
    (0, common_2.bindToolProvider)(workspace_functions_1.FindFilesByPattern, bind);
    bind(workspace_functions_1.WorkspaceFunctionScope).toSelf().inSingletonScope();
    (0, common_2.bindToolProvider)(workspace_search_provider_1.WorkspaceSearchProvider, bind);
    (0, common_2.bindToolProvider)(file_changeset_functions_1.SuggestFileContent, bind);
    (0, common_2.bindToolProvider)(file_changeset_functions_1.WriteFileContent, bind);
    (0, common_2.bindToolProvider)(workspace_task_provider_1.TaskListProvider, bind);
    (0, common_2.bindToolProvider)(workspace_task_provider_1.TaskRunnerProvider, bind);
    (0, common_2.bindToolProvider)(workspace_launch_provider_1.LaunchListProvider, bind);
    (0, common_2.bindToolProvider)(workspace_launch_provider_1.LaunchRunnerProvider, bind);
    (0, common_2.bindToolProvider)(workspace_launch_provider_1.LaunchStopProvider, bind);
    bind(file_changeset_functions_1.ReplaceContentInFileFunctionHelper).toSelf().inSingletonScope();
    bind(file_changeset_functions_1.FileChangeSetTitleProvider).to(file_changeset_functions_1.DefaultFileChangeSetTitleProvider).inSingletonScope();
    (0, common_2.bindToolProvider)(file_changeset_functions_1.SuggestFileReplacements, bind);
    (0, common_2.bindToolProvider)(file_changeset_functions_1.WriteFileReplacements, bind);
    (0, common_2.bindToolProvider)(context_functions_1.ListChatContext, bind);
    (0, common_2.bindToolProvider)(context_functions_1.ResolveChatContext, bind);
    bind(ai_configuration_service_1.AIConfigurationSelectionService).toSelf().inSingletonScope();
    bind(ai_configuration_widget_1.AIConfigurationContainerWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: ai_configuration_widget_1.AIConfigurationContainerWidget.ID,
        createWidget: () => ctx.container.get(ai_configuration_widget_1.AIConfigurationContainerWidget)
    }))
        .inSingletonScope();
    (0, common_2.bindToolProvider)(app_tester_chat_functions_1.LaunchBrowserProvider, bind);
    (0, common_2.bindToolProvider)(app_tester_chat_functions_1.CloseBrowserProvider, bind);
    (0, common_2.bindToolProvider)(app_tester_chat_functions_1.IsBrowserRunningProvider, bind);
    (0, common_2.bindToolProvider)(app_tester_chat_functions_1.QueryDomProvider, bind);
    (0, browser_1.bindViewContribution)(bind, ai_configuration_view_contribution_1.AIAgentConfigurationViewContribution);
    bind(tab_bar_toolbar_1.TabBarToolbarContribution).toService(ai_configuration_view_contribution_1.AIAgentConfigurationViewContribution);
    bind(variable_configuration_widget_1.AIVariableConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: variable_configuration_widget_1.AIVariableConfigurationWidget.ID,
        createWidget: () => ctx.container.get(variable_configuration_widget_1.AIVariableConfigurationWidget)
    }))
        .inSingletonScope();
    bind(agent_configuration_widget_1.AIAgentConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: agent_configuration_widget_1.AIAgentConfigurationWidget.ID,
        createWidget: () => ctx.container.get(agent_configuration_widget_1.AIAgentConfigurationWidget)
    }))
        .inSingletonScope();
    bind(model_aliases_configuration_widget_1.ModelAliasesConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: model_aliases_configuration_widget_1.ModelAliasesConfigurationWidget.ID,
        createWidget: () => ctx.container.get(model_aliases_configuration_widget_1.ModelAliasesConfigurationWidget)
    }))
        .inSingletonScope();
    (0, common_2.bindToolProvider)(file_changeset_functions_1.SimpleSuggestFileReplacements, bind);
    (0, common_2.bindToolProvider)(file_changeset_functions_1.SimpleWriteFileReplacements, bind);
    (0, common_2.bindToolProvider)(file_changeset_functions_1.ClearFileChanges, bind);
    (0, common_2.bindToolProvider)(file_changeset_functions_1.GetProposedFileState, bind);
    (0, common_2.bindToolProvider)(context_functions_1.AddFileToChatContext, bind);
    bind(tools_configuration_widget_1.AIToolsConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: tools_configuration_widget_1.AIToolsConfigurationWidget.ID,
        createWidget: () => ctx.container.get(tools_configuration_widget_1.AIToolsConfigurationWidget)
    }))
        .inSingletonScope();
    bind(common_2.AIVariableContribution).to(context_files_variable_1.ContextFilesVariableContribution).inSingletonScope();
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_configuration_preferences_1.AiConfigurationPreferences });
    bind(browser_1.FrontendApplicationContribution).to(template_preference_contribution_1.TemplatePreferenceContribution);
    bind(mcp_configuration_widget_1.AIMCPConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: mcp_configuration_widget_1.AIMCPConfigurationWidget.ID,
        createWidget: () => ctx.container.get(mcp_configuration_widget_1.AIMCPConfigurationWidget)
    }))
        .inSingletonScope();
    // Register the token usage configuration widget
    bind(token_usage_configuration_widget_1.AITokenUsageConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: token_usage_configuration_widget_1.AITokenUsageConfigurationWidget.ID,
        createWidget: () => ctx.container.get(token_usage_configuration_widget_1.AITokenUsageConfigurationWidget)
    }))
        .inSingletonScope();
    bind(task_background_summary_variable_1.TaskContextSummaryVariableContribution).toSelf().inSingletonScope();
    bind(common_2.AIVariableContribution).toService(task_background_summary_variable_1.TaskContextSummaryVariableContribution);
    bind(task_context_file_storage_service_1.TaskContextFileStorageService).toSelf().inSingletonScope();
    rebind(task_context_service_1.TaskContextStorageService).toService(task_context_file_storage_service_1.TaskContextFileStorageService);
    bind(core_1.CommandContribution).to(summarize_session_command_contribution_1.SummarizeSessionCommandContribution);
    bind(prompt_fragments_configuration_widget_1.AIPromptFragmentsConfigurationWidget).toSelf();
    bind(browser_1.WidgetFactory)
        .toDynamicValue((ctx) => ({
        id: prompt_fragments_configuration_widget_1.AIPromptFragmentsConfigurationWidget.ID,
        createWidget: () => ctx.container.get(prompt_fragments_configuration_widget_1.AIPromptFragmentsConfigurationWidget)
    }))
        .inSingletonScope();
});
