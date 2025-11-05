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
const google_preferences_1 = require("../common/google-preferences");
const browser_1 = require("@theia/core/lib/browser");
const google_frontend_application_contribution_1 = require("./google-frontend-application-contribution");
const common_1 = require("../common");
const core_1 = require("@theia/core");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: google_preferences_1.GooglePreferencesSchema });
    bind(google_frontend_application_contribution_1.GoogleFrontendApplicationContribution).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).toService(google_frontend_application_contribution_1.GoogleFrontendApplicationContribution);
    bind(common_1.GoogleLanguageModelsManager).toDynamicValue(ctx => {
        const provider = ctx.container.get(browser_1.RemoteConnectionProvider);
        return provider.createProxy(common_1.GOOGLE_LANGUAGE_MODELS_MANAGER_PATH);
    }).inSingletonScope();
});
//# sourceMappingURL=google-frontend-module.js.map