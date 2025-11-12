"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
const inversify_1 = require("@theia/core/shared/inversify");
const google_language_models_manager_1 = require("../common/google-language-models-manager");
const core_1 = require("@theia/core");
const google_language_models_manager_impl_1 = require("./google-language-models-manager-impl");
const connection_container_module_1 = require("@theia/core/lib/node/messaging/connection-container-module");
const google_preferences_1 = require("../common/google-preferences");
// We use a connection module to handle AI services separately for each frontend.
const geminiConnectionModule = connection_container_module_1.ConnectionContainerModule.create(({ bind, bindBackendService, bindFrontendService }) => {
    bind(google_language_models_manager_impl_1.GoogleLanguageModelsManagerImpl).toSelf().inSingletonScope();
    bind(google_language_models_manager_1.GoogleLanguageModelsManager).toService(google_language_models_manager_impl_1.GoogleLanguageModelsManagerImpl);
    bind(core_1.ConnectionHandler).toDynamicValue(ctx => new core_1.RpcConnectionHandler(google_language_models_manager_1.GOOGLE_LANGUAGE_MODELS_MANAGER_PATH, () => ctx.container.get(google_language_models_manager_1.GoogleLanguageModelsManager))).inSingletonScope();
});
exports.default = new inversify_1.ContainerModule(bind => {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: google_preferences_1.GooglePreferencesSchema });
    bind(connection_container_module_1.ConnectionContainerModule).toConstantValue(geminiConnectionModule);
});
//# sourceMappingURL=google-backend-module.js.map