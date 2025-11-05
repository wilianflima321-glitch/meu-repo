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
const ai_core_1 = require("@theia/ai-core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_code_completion_preference_1 = require("../common/ai-code-completion-preference");
const ai_code_frontend_application_contribution_1 = require("./ai-code-frontend-application-contribution");
const ai_code_inline_completion_provider_1 = require("./ai-code-inline-completion-provider");
const code_completion_agent_1 = require("./code-completion-agent");
const code_completion_postprocessor_1 = require("./code-completion-postprocessor");
const code_completion_variable_contribution_1 = require("./code-completion-variable-contribution");
const core_1 = require("@theia/core");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(code_completion_agent_1.CodeCompletionAgentImpl).toSelf().inSingletonScope();
    bind(code_completion_agent_1.CodeCompletionAgent).toService(code_completion_agent_1.CodeCompletionAgentImpl);
    bind(ai_core_1.Agent).toService(code_completion_agent_1.CodeCompletionAgentImpl);
    bind(ai_code_inline_completion_provider_1.AICodeInlineCompletionsProvider).toSelf().inSingletonScope();
    bind(ai_code_frontend_application_contribution_1.AIFrontendApplicationContribution).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).to(ai_code_frontend_application_contribution_1.AIFrontendApplicationContribution);
    bind(browser_1.KeybindingContribution).toService(ai_code_frontend_application_contribution_1.AIFrontendApplicationContribution);
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_code_completion_preference_1.AICodeCompletionPreferencesSchema });
    bind(code_completion_postprocessor_1.CodeCompletionPostProcessor).to(code_completion_postprocessor_1.DefaultCodeCompletionPostProcessor).inSingletonScope();
    bind(ai_core_1.AIVariableContribution).to(code_completion_variable_contribution_1.CodeCompletionVariableContribution).inSingletonScope();
});
//# sourceMappingURL=ai-code-completion-frontend-module.js.map