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
const common_1 = require("@theia/ai-core/lib/common");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const common_2 = require("../common");
const chat_agents_variable_contribution_1 = require("../common/chat-agents-variable-contribution");
const custom_chat_agent_1 = require("../common/custom-chat-agent");
const response_content_matcher_1 = require("../common/response-content-matcher");
const ai_chat_preferences_1 = require("../common/ai-chat-preferences");
const change_set_file_element_1 = require("./change-set-file-element");
const custom_agent_frontend_application_contribution_1 = require("./custom-agent-frontend-application-contribution");
const frontend_chat_service_1 = require("./frontend-chat-service");
const custom_agent_factory_1 = require("./custom-agent-factory");
const chat_tool_request_service_1 = require("../common/chat-tool-request-service");
const chat_tool_request_service_2 = require("./chat-tool-request-service");
const change_set_file_service_1 = require("./change-set-file-service");
const context_variable_label_provider_1 = require("./context-variable-label-provider");
const context_file_variable_label_provider_1 = require("./context-file-variable-label-provider");
const file_chat_variable_contribution_1 = require("./file-chat-variable-contribution");
const context_summary_variable_1 = require("../common/context-summary-variable");
const context_details_variable_1 = require("../common/context-details-variable");
const change_set_variable_1 = require("./change-set-variable");
const chat_session_naming_service_1 = require("../common/chat-session-naming-service");
const change_set_decorator_service_1 = require("./change-set-decorator-service");
const chat_session_summary_agent_1 = require("../common/chat-session-summary-agent");
const task_context_variable_contribution_1 = require("./task-context-variable-contribution");
const task_context_variable_label_provider_1 = require("./task-context-variable-label-provider");
const task_context_service_1 = require("./task-context-service");
const task_context_storage_service_1 = require("./task-context-storage-service");
const ai_chat_frontend_contribution_1 = require("./ai-chat-frontend-contribution");
const image_context_variable_contribution_1 = require("./image-context-variable-contribution");
const agent_delegation_tool_1 = require("./agent-delegation-tool");
const chat_tool_preference_bindings_1 = require("./chat-tool-preference-bindings");
const chat_tool_preferences_1 = require("../common/chat-tool-preferences");
exports.default = new inversify_1.ContainerModule(bind => {
    (0, core_1.bindContributionProvider)(bind, common_2.ChatAgent);
    bind(chat_tool_request_service_2.FrontendChatToolRequestService).toSelf().inSingletonScope();
    bind(chat_tool_request_service_1.ChatToolRequestService).toService(chat_tool_request_service_2.FrontendChatToolRequestService);
    bind(common_2.ChatAgentServiceImpl).toSelf().inSingletonScope();
    bind(common_2.ChatAgentService).toService(common_2.ChatAgentServiceImpl);
    bind(common_2.PinChatAgent).toConstantValue(true);
    bind(chat_session_naming_service_1.ChatSessionNamingService).toSelf().inSingletonScope();
    bind(chat_session_naming_service_1.ChatSessionNamingAgent).toSelf().inSingletonScope();
    bind(common_1.Agent).toService(chat_session_naming_service_1.ChatSessionNamingAgent);
    (0, core_1.bindContributionProvider)(bind, response_content_matcher_1.ResponseContentMatcherProvider);
    bind(response_content_matcher_1.DefaultResponseContentMatcherProvider).toSelf().inSingletonScope();
    bind(response_content_matcher_1.ResponseContentMatcherProvider).toService(response_content_matcher_1.DefaultResponseContentMatcherProvider);
    bind(response_content_matcher_1.DefaultResponseContentFactory).toSelf().inSingletonScope();
    bind(common_1.AIVariableContribution).to(chat_agents_variable_contribution_1.ChatAgentsVariableContribution).inSingletonScope();
    bind(common_2.ChatRequestParserImpl).toSelf().inSingletonScope();
    bind(common_2.ChatRequestParser).toService(common_2.ChatRequestParserImpl);
    bind(frontend_chat_service_1.FrontendChatServiceImpl).toSelf().inSingletonScope();
    bind(common_2.ChatService).toService(frontend_chat_service_1.FrontendChatServiceImpl);
    bind(common_2.ChatServiceFactory).toDynamicValue(ctx => () => ctx.container.get(common_2.ChatService));
    bind(common_2.ChatAgentServiceFactory).toDynamicValue(ctx => () => ctx.container.get(common_2.ChatAgentService));
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_chat_preferences_1.aiChatPreferences });
    // Tool confirmation preferences
    (0, chat_tool_preferences_1.bindChatToolPreferences)(bind);
    bind(chat_tool_preference_bindings_1.ToolConfirmationManager).toSelf().inSingletonScope();
    bind(custom_chat_agent_1.CustomChatAgent).toSelf();
    bind(custom_agent_factory_1.CustomAgentFactory).toFactory(ctx => (id, name, description, prompt, defaultLLM) => {
        const agent = ctx.container.get(custom_chat_agent_1.CustomChatAgent);
        agent.id = id;
        agent.name = name;
        agent.description = description;
        agent.prompt = prompt;
        agent.languageModelRequirements = [{
                purpose: 'chat',
                identifier: defaultLLM,
            }];
        ctx.container.get(common_2.ChatAgentService).registerChatAgent(agent);
        ctx.container.get(common_1.AgentService).registerAgent(agent);
        return agent;
    });
    bind(browser_1.FrontendApplicationContribution).to(custom_agent_frontend_application_contribution_1.AICustomAgentsFrontendApplicationContribution).inSingletonScope();
    bind(context_variable_label_provider_1.ContextVariableLabelProvider).toSelf().inSingletonScope();
    bind(browser_1.LabelProviderContribution).toService(context_variable_label_provider_1.ContextVariableLabelProvider);
    bind(context_file_variable_label_provider_1.ContextFileVariableLabelProvider).toSelf().inSingletonScope();
    bind(browser_1.LabelProviderContribution).toService(context_file_variable_label_provider_1.ContextFileVariableLabelProvider);
    bind(change_set_file_service_1.ChangeSetFileService).toSelf().inSingletonScope();
    bind(change_set_file_element_1.ChangeSetFileElementFactory).toFactory(ctx => (args) => {
        const container = ctx.container.createChild();
        container.bind(change_set_file_element_1.ChangeSetElementArgs).toConstantValue(args);
        container.bind(change_set_file_element_1.ChangeSetFileElement).toSelf().inSingletonScope();
        return container.get(change_set_file_element_1.ChangeSetFileElement);
    });
    bind(change_set_decorator_service_1.ChangeSetDecoratorService).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).toService(change_set_decorator_service_1.ChangeSetDecoratorService);
    (0, core_1.bindContributionProvider)(bind, change_set_decorator_service_1.ChangeSetDecorator);
    bind(common_2.ToolCallChatResponseContentFactory).toSelf().inSingletonScope();
    bind(common_1.AIVariableContribution).to(file_chat_variable_contribution_1.FileChatVariableContribution).inSingletonScope();
    bind(common_1.AIVariableContribution).to(context_summary_variable_1.ContextSummaryVariableContribution).inSingletonScope();
    bind(common_1.AIVariableContribution).to(context_details_variable_1.ContextDetailsVariableContribution).inSingletonScope();
    bind(common_1.AIVariableContribution).to(change_set_variable_1.ChangeSetVariableContribution).inSingletonScope();
    bind(chat_session_summary_agent_1.ChatSessionSummaryAgent).toSelf().inSingletonScope();
    bind(common_1.Agent).toService(chat_session_summary_agent_1.ChatSessionSummaryAgent);
    bind(task_context_variable_contribution_1.TaskContextVariableContribution).toSelf().inSingletonScope();
    bind(common_1.AIVariableContribution).toService(task_context_variable_contribution_1.TaskContextVariableContribution);
    bind(task_context_variable_label_provider_1.TaskContextVariableLabelProvider).toSelf().inSingletonScope();
    bind(browser_1.LabelProviderContribution).toService(task_context_variable_label_provider_1.TaskContextVariableLabelProvider);
    bind(image_context_variable_contribution_1.ImageContextVariableContribution).toSelf().inSingletonScope();
    bind(common_1.AIVariableContribution).toService(image_context_variable_contribution_1.ImageContextVariableContribution);
    bind(browser_1.LabelProviderContribution).toService(image_context_variable_contribution_1.ImageContextVariableContribution);
    bind(task_context_service_1.TaskContextService).toSelf().inSingletonScope();
    bind(task_context_storage_service_1.InMemoryTaskContextStorage).toSelf().inSingletonScope();
    bind(task_context_service_1.TaskContextStorageService).toService(task_context_storage_service_1.InMemoryTaskContextStorage);
    bind(ai_chat_frontend_contribution_1.AIChatFrontendContribution).toSelf().inSingletonScope();
    bind(core_1.CommandContribution).toService(ai_chat_frontend_contribution_1.AIChatFrontendContribution);
    (0, common_1.bindToolProvider)(agent_delegation_tool_1.AgentDelegationTool, bind);
});
//# sourceMappingURL=ai-chat-frontend-module.js.map