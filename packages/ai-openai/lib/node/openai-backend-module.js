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
exports.OpenAiModelFactory = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const openai_language_models_manager_1 = require("../common/openai-language-models-manager");
const core_1 = require("@theia/core");
const openai_language_models_manager_impl_1 = require("./openai-language-models-manager-impl");
const connection_container_module_1 = require("@theia/core/lib/node/messaging/connection-container-module");
const openai_language_model_1 = require("./openai-language-model");
const openai_preferences_1 = require("../common/openai-preferences");
exports.OpenAiModelFactory = Symbol('OpenAiModelFactory');
// We use a connection module to handle AI services separately for each frontend.
const openAiConnectionModule = connection_container_module_1.ConnectionContainerModule.create(({ bind, bindBackendService, bindFrontendService }) => {
    bind(openai_language_models_manager_impl_1.OpenAiLanguageModelsManagerImpl).toSelf().inSingletonScope();
    bind(openai_language_models_manager_1.OpenAiLanguageModelsManager).toService(openai_language_models_manager_impl_1.OpenAiLanguageModelsManagerImpl);
    bind(core_1.ConnectionHandler).toDynamicValue(ctx => new core_1.RpcConnectionHandler(openai_language_models_manager_1.OPENAI_LANGUAGE_MODELS_MANAGER_PATH, () => ctx.container.get(openai_language_models_manager_1.OpenAiLanguageModelsManager))).inSingletonScope();
});
exports.default = new inversify_1.ContainerModule(bind => {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: openai_preferences_1.OpenAiPreferencesSchema });
    bind(openai_language_model_1.OpenAiModelUtils).toSelf().inSingletonScope();
    bind(connection_container_module_1.ConnectionContainerModule).toConstantValue(openAiConnectionModule);
});
//# sourceMappingURL=openai-backend-module.js.map