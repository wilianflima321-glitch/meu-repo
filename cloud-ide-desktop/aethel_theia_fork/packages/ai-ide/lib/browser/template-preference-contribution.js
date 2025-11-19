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
exports.TemplatePreferenceContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const frontend_prompt_customization_service_1 = require("@theia/ai-core/lib/browser/frontend-prompt-customization-service");
const workspace_preferences_1 = require("../common/workspace-preferences");
const browser_1 = require("@theia/workspace/lib/browser");
const core_1 = require("@theia/core");
let TemplatePreferenceContribution = class TemplatePreferenceContribution {
    preferenceService;
    customizationService;
    workspaceService;
    onStart() {
        Promise.all([this.preferenceService.ready, this.workspaceService.ready]).then(() => {
            // Set initial template configuration from preferences
            this.updateConfiguration();
            // Listen for preference changes
            this.preferenceService.onPreferenceChanged(event => {
                if (event.preferenceName === workspace_preferences_1.PROMPT_TEMPLATE_WORKSPACE_DIRECTORIES_PREF ||
                    event.preferenceName === workspace_preferences_1.PROMPT_TEMPLATE_ADDITIONAL_EXTENSIONS_PREF ||
                    event.preferenceName === workspace_preferences_1.PROMPT_TEMPLATE_WORKSPACE_FILES_PREF) {
                    this.updateConfiguration(event.preferenceName);
                }
            });
            // Listen for workspace root changes
            this.workspaceService.onWorkspaceLocationChanged(() => {
                this.updateConfiguration();
            });
        });
    }
    /**
     * Updates the template configuration in the customization service.
     * If a specific preference name is provided, only that configuration aspect is updated.
     * @param changedPreference Optional name of the preference that changed
     */
    async updateConfiguration(changedPreference) {
        const workspaceRoot = this.workspaceService.tryGetRoots()[0];
        if (!workspaceRoot) {
            return;
        }
        const workspaceRootUri = workspaceRoot.resource;
        const configProperties = {};
        const getPref = (key, d) => {
            const getter = this.preferenceService.get;
            if (typeof getter === 'function') {
                return getter.call(this.preferenceService, key, d);
            }
            return d;
        };
        if (!changedPreference || changedPreference === workspace_preferences_1.PROMPT_TEMPLATE_WORKSPACE_DIRECTORIES_PREF) {
            const relativeDirectories = getPref(workspace_preferences_1.PROMPT_TEMPLATE_WORKSPACE_DIRECTORIES_PREF, []);
            configProperties.directoryPaths = relativeDirectories.map(dir => {
                const path = new core_1.Path(dir);
                const resolveFn = workspaceRootUri.resolve;
                const uri = typeof resolveFn === 'function' ? resolveFn.call(workspaceRootUri, path.toString()) : workspaceRootUri;
                return (uri && uri.path) ? uri.path.toString() : '';
            });
        }
        if (!changedPreference || changedPreference === workspace_preferences_1.PROMPT_TEMPLATE_ADDITIONAL_EXTENSIONS_PREF) {
            configProperties.extensions = getPref(workspace_preferences_1.PROMPT_TEMPLATE_ADDITIONAL_EXTENSIONS_PREF, []);
        }
        if (!changedPreference || changedPreference === workspace_preferences_1.PROMPT_TEMPLATE_WORKSPACE_FILES_PREF) {
            const relativeFilePaths = getPref(workspace_preferences_1.PROMPT_TEMPLATE_WORKSPACE_FILES_PREF, []);
            configProperties.filePaths = relativeFilePaths.map(filePath => {
                const path = new core_1.Path(filePath);
                const resolveFn = workspaceRootUri.resolve;
                const uri = typeof resolveFn === 'function' ? resolveFn.call(workspaceRootUri, path.toString()) : workspaceRootUri;
                return (uri && uri.path) ? uri.path.toString() : '';
            });
        }
        await this.customizationService.updateConfiguration(configProperties);
    }
};
exports.TemplatePreferenceContribution = TemplatePreferenceContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], TemplatePreferenceContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(frontend_prompt_customization_service_1.DefaultPromptFragmentCustomizationService),
    tslib_1.__metadata("design:type", frontend_prompt_customization_service_1.DefaultPromptFragmentCustomizationService)
], TemplatePreferenceContribution.prototype, "customizationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WorkspaceService),
    tslib_1.__metadata("design:type", browser_1.WorkspaceService)
], TemplatePreferenceContribution.prototype, "workspaceService", void 0);
exports.TemplatePreferenceContribution = TemplatePreferenceContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TemplatePreferenceContribution);
//# sourceMappingURL=template-preference-contribution.js.map