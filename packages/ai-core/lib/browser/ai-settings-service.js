"use strict";
var AISettingsServiceImpl_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISettingsServiceImpl = void 0;
const tslib_1 = require("tslib");
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
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/core/lib/common");
let AISettingsServiceImpl = AISettingsServiceImpl_1 = class AISettingsServiceImpl {
    constructor() {
        this.toDispose = new core_1.DisposableCollection();
        this.onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
    }
    init() {
        this.toDispose.push(this.preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === AISettingsServiceImpl_1.PREFERENCE_NAME) {
                this.onDidChangeEmitter.fire();
            }
        }));
    }
    async updateAgentSettings(agent, agentSettings) {
        const settings = await this.getSettings();
        const newAgentSettings = { ...settings[agent], ...agentSettings };
        settings[agent] = newAgentSettings;
        try {
            await this.preferenceService.set(AISettingsServiceImpl_1.PREFERENCE_NAME, settings, common_1.PreferenceScope.User);
        }
        catch (e) {
            this.onDidChangeEmitter.fire();
            this.logger.warn('Updating the preferences was unsuccessful: ' + e);
        }
    }
    async getAgentSettings(agent) {
        const settings = await this.getSettings();
        return settings[agent];
    }
    async getSettings() {
        await this.preferenceService.ready;
        const pref = this.preferenceService.inspect(AISettingsServiceImpl_1.PREFERENCE_NAME);
        return (pref === null || pref === void 0 ? void 0 : pref.value) ? pref.value : {};
    }
};
exports.AISettingsServiceImpl = AISettingsServiceImpl;
AISettingsServiceImpl.PREFERENCE_NAME = 'ai-features.agentSettings';
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], AISettingsServiceImpl.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], AISettingsServiceImpl.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AISettingsServiceImpl.prototype, "init", null);
exports.AISettingsServiceImpl = AISettingsServiceImpl = AISettingsServiceImpl_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AISettingsServiceImpl);
//# sourceMappingURL=ai-settings-service.js.map