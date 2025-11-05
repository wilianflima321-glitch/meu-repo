"use strict";
// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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
exports.bindExtensionPreferences = exports.ExtensionNotificationPreferences = exports.recommendedExtensionNotificationPreferencesSchema = exports.IGNORE_RECOMMENDATIONS_ID = exports.recommendedExtensionsPreferencesSchema = exports.extensionsSchemaID = void 0;
const core_1 = require("@theia/core");
exports.extensionsSchemaID = 'vscode://schemas/extensions';
exports.recommendedExtensionsPreferencesSchema = {
    scope: core_1.PreferenceScope.Folder,
    properties: {
        extensions: {
            $ref: exports.extensionsSchemaID,
            description: core_1.nls.localize('theia/vsx-registry/recommendedExtensions', 'A list of the names of extensions recommended for use in this workspace.'),
            default: { recommendations: [] },
        },
    },
};
exports.IGNORE_RECOMMENDATIONS_ID = 'extensions.ignoreRecommendations';
exports.recommendedExtensionNotificationPreferencesSchema = {
    scope: core_1.PreferenceScope.Folder,
    properties: {
        [exports.IGNORE_RECOMMENDATIONS_ID]: {
            description: core_1.nls.localize('theia/vsx-registry/showRecommendedExtensions', 'Controls whether notifications are shown for extension recommendations.'),
            default: false,
            type: 'boolean'
        }
    }
};
exports.ExtensionNotificationPreferences = Symbol('ExtensionNotificationPreferences');
function bindExtensionPreferences(bind) {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: exports.recommendedExtensionsPreferencesSchema });
    bind(core_1.PreferenceConfiguration).toConstantValue({ name: 'extensions' });
    bind(exports.ExtensionNotificationPreferences).toDynamicValue(({ container }) => {
        const preferenceService = container.get(core_1.PreferenceService);
        return (0, core_1.createPreferenceProxy)(preferenceService, exports.recommendedExtensionNotificationPreferencesSchema);
    }).inSingletonScope();
    bind(core_1.PreferenceContribution).toConstantValue({ schema: exports.recommendedExtensionNotificationPreferencesSchema });
}
exports.bindExtensionPreferences = bindExtensionPreferences;
//# sourceMappingURL=recommended-extensions-preference-contribution.js.map