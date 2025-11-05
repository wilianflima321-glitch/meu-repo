"use strict";
// *****************************************************************************
// Copyright (C) 2021 logi.cals GmbH, EclipseSource and others.
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
const test_1 = require("@playwright/test");
const theia_app_loader_1 = require("../theia-app-loader");
const theia_preference_view_1 = require("../theia-preference-view");
test_1.test.describe('Preference View', () => {
    let app;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        app = await theia_app_loader_1.TheiaAppLoader.load({ playwright, browser });
    });
    test_1.test.afterAll(async () => {
        await app.page.close();
    });
    (0, test_1.test)('should be visible and active after being opened', async () => {
        const preferenceView = await app.openPreferences(theia_preference_view_1.TheiaPreferenceView);
        (0, test_1.expect)(await preferenceView.isTabVisible()).toBe(true);
        (0, test_1.expect)(await preferenceView.isDisplayed()).toBe(true);
        (0, test_1.expect)(await preferenceView.isActive()).toBe(true);
    });
    (0, test_1.test)('should be able to read, set, and reset String preferences', async () => {
        const preferences = await app.openPreferences(theia_preference_view_1.TheiaPreferenceView);
        const preferenceId = theia_preference_view_1.PreferenceIds.DiffEditor.MaxComputationTime;
        await preferences.resetPreferenceById(preferenceId);
        (0, test_1.expect)(await preferences.getStringPreferenceById(preferenceId)).toBe(theia_preference_view_1.DefaultPreferences.DiffEditor.MaxComputationTime);
        await preferences.setStringPreferenceById(preferenceId, '8000');
        await preferences.waitForModified(preferenceId);
        (0, test_1.expect)(await preferences.getStringPreferenceById(preferenceId)).toBe('8000');
        await preferences.resetPreferenceById(preferenceId);
        (0, test_1.expect)(await preferences.getStringPreferenceById(preferenceId)).toBe(theia_preference_view_1.DefaultPreferences.DiffEditor.MaxComputationTime);
    });
    (0, test_1.test)('should be able to read, set, and reset Boolean preferences', async () => {
        const preferences = await app.openPreferences(theia_preference_view_1.TheiaPreferenceView);
        const preferenceId = theia_preference_view_1.PreferenceIds.Explorer.AutoReveal;
        await preferences.resetPreferenceById(preferenceId);
        (0, test_1.expect)(await preferences.getBooleanPreferenceById(preferenceId)).toBe(theia_preference_view_1.DefaultPreferences.Explorer.AutoReveal.Enabled);
        await preferences.setBooleanPreferenceById(preferenceId, false);
        await preferences.waitForModified(preferenceId);
        (0, test_1.expect)(await preferences.getBooleanPreferenceById(preferenceId)).toBe(false);
        await preferences.resetPreferenceById(preferenceId);
        (0, test_1.expect)(await preferences.getBooleanPreferenceById(preferenceId)).toBe(theia_preference_view_1.DefaultPreferences.Explorer.AutoReveal.Enabled);
    });
    (0, test_1.test)('should be able to read, set, and reset Options preferences', async () => {
        const preferences = await app.openPreferences(theia_preference_view_1.TheiaPreferenceView);
        const preferenceId = theia_preference_view_1.PreferenceIds.Editor.RenderWhitespace;
        await preferences.resetPreferenceById(preferenceId);
        (0, test_1.expect)(await preferences.getOptionsPreferenceById(preferenceId)).toBe(theia_preference_view_1.DefaultPreferences.Editor.RenderWhitespace.Selection);
        await preferences.setOptionsPreferenceById(preferenceId, theia_preference_view_1.DefaultPreferences.Editor.RenderWhitespace.Boundary);
        await preferences.waitForModified(preferenceId);
        (0, test_1.expect)(await preferences.getOptionsPreferenceById(preferenceId)).toBe(theia_preference_view_1.DefaultPreferences.Editor.RenderWhitespace.Boundary);
        await preferences.resetPreferenceById(preferenceId);
        (0, test_1.expect)(await preferences.getOptionsPreferenceById(preferenceId)).toBe(theia_preference_view_1.DefaultPreferences.Editor.RenderWhitespace.Selection);
    });
    (0, test_1.test)('should throw an error if we try to read, set, or reset a non-existing preference', async () => {
        const preferences = await app.openPreferences(theia_preference_view_1.TheiaPreferenceView);
        preferences.customTimeout = 500;
        try {
            await (0, test_1.expect)(preferences.getBooleanPreferenceById('not.a.real.preference')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.setBooleanPreferenceById('not.a.real.preference', true)).rejects.toThrowError();
            await (0, test_1.expect)(preferences.resetPreferenceById('not.a.real.preference')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.getStringPreferenceById('not.a.real.preference')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.setStringPreferenceById('not.a.real.preference', 'a')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.resetPreferenceById('not.a.real.preference')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.getOptionsPreferenceById('not.a.real.preference')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.setOptionsPreferenceById('not.a.real.preference', 'a')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.resetPreferenceById('not.a.real.preference')).rejects.toThrowError();
        }
        finally {
            preferences.customTimeout = undefined;
        }
    });
    (0, test_1.test)('should throw an error if we try to read, or set a preference with the wrong type', async () => {
        const preferences = await app.openPreferences(theia_preference_view_1.TheiaPreferenceView);
        const stringPreference = theia_preference_view_1.PreferenceIds.DiffEditor.MaxComputationTime;
        const booleanPreference = theia_preference_view_1.PreferenceIds.Explorer.AutoReveal;
        preferences.customTimeout = 500;
        try {
            await (0, test_1.expect)(preferences.getBooleanPreferenceById(stringPreference)).rejects.toThrowError();
            await (0, test_1.expect)(preferences.setBooleanPreferenceById(stringPreference, true)).rejects.toThrowError();
            await (0, test_1.expect)(preferences.setStringPreferenceById(booleanPreference, 'true')).rejects.toThrowError();
            await (0, test_1.expect)(preferences.setOptionsPreferenceById(booleanPreference, 'true')).rejects.toThrowError();
        }
        finally {
            preferences.customTimeout = undefined;
        }
    });
});
//# sourceMappingURL=theia-preference-view.test.js.map