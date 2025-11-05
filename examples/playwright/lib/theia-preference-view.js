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
exports.TheiaPreferenceView = exports.TheiaPreferenceScope = exports.DefaultPreferences = exports.PreferenceIds = void 0;
const theia_view_1 = require("./theia-view");
const TheiaSettingsViewData = {
    tabSelector: '#shell-tab-settings_widget',
    viewSelector: '#settings_widget'
};
exports.PreferenceIds = {
    Editor: {
        AutoSave: 'files.autoSave',
        RenderWhitespace: 'editor.renderWhitespace'
    },
    Explorer: {
        AutoReveal: 'explorer.autoReveal'
    },
    DiffEditor: {
        MaxComputationTime: 'diffEditor.maxComputationTime'
    },
    Files: {
        EnableTrash: 'files.enableTrash'
    }
};
exports.DefaultPreferences = {
    Editor: {
        AutoSave: {
            Off: 'off',
            AfterDelay: 'afterDelay',
            OnFocusChange: 'onFocusChange',
            OnWindowChange: 'onWindowChange'
        },
        RenderWhitespace: {
            None: 'none',
            Boundary: 'boundary',
            Selection: 'selection',
            Trailing: 'trailing',
            All: 'all'
        }
    },
    Explorer: {
        AutoReveal: {
            Enabled: true
        }
    },
    DiffEditor: {
        MaxComputationTime: '5000'
    },
    Files: {
        EnableTrash: {
            Enabled: true
        }
    }
};
var TheiaPreferenceScope;
(function (TheiaPreferenceScope) {
    TheiaPreferenceScope["User"] = "User";
    TheiaPreferenceScope["Workspace"] = "Workspace";
})(TheiaPreferenceScope || (exports.TheiaPreferenceScope = TheiaPreferenceScope = {}));
class TheiaPreferenceView extends theia_view_1.TheiaView {
    constructor(app) {
        super(TheiaSettingsViewData, app);
        this.modificationIndicator = '.theia-mod-item-modified';
        this.optionSelectLabel = '.theia-select-component-label';
        this.optionSelectDropdown = '.theia-select-component-dropdown';
        this.optionSelectDropdownValue = '.theia-select-component-option-value';
    }
    /**
     * @param preferenceScope The preference scope (Workspace or User) to open the view for. Default is Workspace.
     * @param useMenu  If true, the view will be opened via the main menu. If false,
     *  the view will be opened via the quick command palette. Default is using the main menu.
     * @returns  The TheiaPreferenceView page object instance.
     */
    async open(preferenceScope = TheiaPreferenceScope.Workspace, useMenu = true) {
        var _a;
        if (useMenu) {
            const mainMenu = await this.app.menuBar.openMenu('File');
            await ((_a = (await mainMenu.menuItemByNamePath('Preferences', 'Settings'))) === null || _a === void 0 ? void 0 : _a.click());
        }
        else {
            await this.app.quickCommandPalette.type('Preferences:');
            await this.app.quickCommandPalette.trigger('Preferences: Open Settings (UI)');
        }
        await this.waitForVisible();
        await this.openPreferenceScope(preferenceScope);
        return this;
    }
    getScopeSelector(scope) {
        return `li.preferences-scope-tab div.lm-TabBar-tabLabel:has-text("${scope}")`;
    }
    async openPreferenceScope(scope) {
        await this.activate();
        const scopeTab = await this.page.waitForSelector(this.getScopeSelector(scope));
        await scopeTab.click();
    }
    async getBooleanPreferenceByPath(sectionTitle, name) {
        const preferenceId = await this.findPreferenceId(sectionTitle, name);
        return this.getBooleanPreferenceById(preferenceId);
    }
    async getBooleanPreferenceById(preferenceId) {
        const element = await this.findPreferenceEditorById(preferenceId);
        return element.isChecked();
    }
    async setBooleanPreferenceByPath(sectionTitle, name, value) {
        const preferenceId = await this.findPreferenceId(sectionTitle, name);
        return this.setBooleanPreferenceById(preferenceId, value);
    }
    async setBooleanPreferenceById(preferenceId, value) {
        const element = await this.findPreferenceEditorById(preferenceId);
        return value ? element.check() : element.uncheck();
    }
    async getStringPreferenceByPath(sectionTitle, name) {
        const preferenceId = await this.findPreferenceId(sectionTitle, name);
        return this.getStringPreferenceById(preferenceId);
    }
    async getStringPreferenceById(preferenceId) {
        const element = await this.findPreferenceEditorById(preferenceId);
        return element.evaluate(e => e.value);
    }
    async setStringPreferenceByPath(sectionTitle, name, value) {
        const preferenceId = await this.findPreferenceId(sectionTitle, name);
        return this.setStringPreferenceById(preferenceId, value);
    }
    async setStringPreferenceById(preferenceId, value) {
        const element = await this.findPreferenceEditorById(preferenceId);
        return element.fill(value);
    }
    async getOptionsPreferenceByPath(sectionTitle, name) {
        const preferenceId = await this.findPreferenceId(sectionTitle, name);
        return this.getOptionsPreferenceById(preferenceId);
    }
    async getOptionsPreferenceById(preferenceId) {
        const element = await this.findPreferenceEditorById(preferenceId, this.optionSelectLabel);
        return element.evaluate(e => { var _a; return (_a = e.textContent) !== null && _a !== void 0 ? _a : ''; });
    }
    async setOptionsPreferenceByPath(sectionTitle, name, value) {
        const preferenceId = await this.findPreferenceId(sectionTitle, name);
        return this.setOptionsPreferenceById(preferenceId, value);
    }
    async setOptionsPreferenceById(preferenceId, value) {
        const element = await this.findPreferenceEditorById(preferenceId, this.optionSelectLabel);
        await element.click();
        const option = await this.page.waitForSelector(`${this.optionSelectDropdown} ${this.optionSelectDropdownValue}:has-text("${value}")`);
        await option.click();
    }
    async resetPreferenceByPath(sectionTitle, name) {
        const preferenceId = await this.findPreferenceId(sectionTitle, name);
        return this.resetPreferenceById(preferenceId);
    }
    async resetPreferenceById(preferenceId) {
        // this is just to fail if the preference doesn't exist at all
        await this.findPreferenceEditorById(preferenceId, '');
        const resetPreferenceButton = await this.findPreferenceResetButton(preferenceId);
        await resetPreferenceButton.click();
        await this.waitForUnmodified(preferenceId);
    }
    async findPreferenceId(sectionTitle, name) {
        const viewElement = await this.viewElement();
        const sectionElement = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.$(`xpath=//li[contains(@class, 'settings-section-title') and text() = '${sectionTitle}']/..`));
        const firstPreferenceAfterSection = await (sectionElement === null || sectionElement === void 0 ? void 0 : sectionElement.$(`xpath=following-sibling::li[div/text() = '${name}'][1]`));
        const preferenceId = await (firstPreferenceAfterSection === null || firstPreferenceAfterSection === void 0 ? void 0 : firstPreferenceAfterSection.getAttribute('data-pref-id'));
        if (!preferenceId) {
            throw new Error(`Could not find preference id for "${sectionTitle}" > (...) > "${name}"`);
        }
        return preferenceId;
    }
    async findPreferenceEditorById(preferenceId, elementType = 'input') {
        const viewElement = await this.viewElement();
        const element = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(this.getPreferenceEditorSelector(preferenceId, elementType), { timeout: this.customTimeout }));
        if (!element) {
            throw new Error(`Could not find element with preference id "${preferenceId}"`);
        }
        return element;
    }
    getPreferenceSelector(preferenceId) {
        return `li[data-pref-id="${preferenceId}"]`;
    }
    getPreferenceEditorSelector(preferenceId, elementType) {
        return `${this.getPreferenceSelector(preferenceId)} ${elementType}`;
    }
    async findPreferenceResetButton(preferenceId) {
        await this.activate();
        const viewElement = await this.viewElement();
        const settingsContextMenuBtn = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(`${this.getPreferenceSelector(preferenceId)} .settings-context-menu-btn`));
        if (!settingsContextMenuBtn) {
            throw new Error(`Could not find context menu button for element with preference id "${preferenceId}"`);
        }
        await settingsContextMenuBtn.click();
        const resetPreferenceButton = await this.page.waitForSelector('li[data-command="preferences:reset"]');
        if (!resetPreferenceButton) {
            throw new Error(`Could not find menu entry to reset preference with id "${preferenceId}"`);
        }
        return resetPreferenceButton;
    }
    async waitForModified(preferenceId) {
        await this.activate();
        const viewElement = await this.viewElement();
        await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(`${this.getPreferenceGutterSelector(preferenceId)}${this.modificationIndicator}`, { timeout: this.customTimeout }));
    }
    async waitForUnmodified(preferenceId) {
        await this.activate();
        const viewElement = await this.viewElement();
        await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(`${this.getPreferenceGutterSelector(preferenceId)}${this.modificationIndicator}`, { state: 'detached', timeout: this.customTimeout }));
    }
    getPreferenceGutterSelector(preferenceId) {
        return `${this.getPreferenceSelector(preferenceId)} .pref-context-gutter`;
    }
}
exports.TheiaPreferenceView = TheiaPreferenceView;
//# sourceMappingURL=theia-preference-view.js.map