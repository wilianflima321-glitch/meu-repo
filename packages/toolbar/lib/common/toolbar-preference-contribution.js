"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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
exports.ToolbarPreferences = exports.ToolbarPreferencesSchema = exports.TOOLBAR_ENABLE_PREFERENCE_ID = void 0;
const preference_scope_1 = require("@theia/core/lib/common/preferences/preference-scope");
exports.TOOLBAR_ENABLE_PREFERENCE_ID = 'toolbar.showToolbar';
exports.ToolbarPreferencesSchema = {
    properties: {
        [exports.TOOLBAR_ENABLE_PREFERENCE_ID]: {
            'type': 'boolean',
            'description': 'Show toolbar',
            'default': false,
            'scope': preference_scope_1.PreferenceScope.Workspace,
        },
    },
};
class ToolbarPreferencesContribution {
}
exports.ToolbarPreferences = Symbol('ToolbarPreferences');
//# sourceMappingURL=toolbar-preference-contribution.js.map