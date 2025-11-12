"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox GmbH.
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
exports.OllamaModelFactory = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const ollama_language_models_manager_1 = require("../common/ollama-language-models-manager");
const core_1 = require("@theia/core");
const ollama_language_models_manager_impl_1 = require("./ollama-language-models-manager-impl");
const connection_container_module_1 = require("@theia/core/lib/node/messaging/connection-container-module");
const ollama_preferences_1 = require("../common/ollama-preferences");
exports.OllamaModelFactory = Symbol('OllamaModelFactory');
// We use a connection module to handle AI services separately for each frontend.
const ollamaConnectionModule = connection_container_module_1.ConnectionContainerModule.create(({ bind, bindBackendService, bindFrontendService }) => {
    bind(ollama_language_models_manager_impl_1.OllamaLanguageModelsManagerImpl).toSelf().inSingletonScope();
    bind(ollama_language_models_manager_1.OllamaLanguageModelsManager).toService(ollama_language_models_manager_impl_1.OllamaLanguageModelsManagerImpl);
    bind(core_1.ConnectionHandler).toDynamicValue(ctx => new core_1.RpcConnectionHandler(ollama_language_models_manager_1.OLLAMA_LANGUAGE_MODELS_MANAGER_PATH, () => ctx.container.get(ollama_language_models_manager_1.OllamaLanguageModelsManager))).inSingletonScope();
});
exports.default = new inversify_1.ContainerModule(bind => {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ollama_preferences_1.OllamaPreferencesSchema });
    bind(connection_container_module_1.ConnectionContainerModule).toConstantValue(ollamaConnectionModule);
});
//# sourceMappingURL=ollama-backend-module.js.map