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
exports.AIConfigurationSelectionService = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
let AIConfigurationSelectionService = class AIConfigurationSelectionService {
    activeAgent;
    selectedAliasId;
    onDidSelectConfigurationEmitter = new core_1.Emitter();
    onDidSelectConfiguration = this.onDidSelectConfigurationEmitter.event;
    onDidAgentChangeEmitter = new core_1.Emitter();
    onDidAgentChange = this.onDidAgentChangeEmitter.event;
    onDidAliasChangeEmitter = new core_1.Emitter();
    onDidAliasChange = this.onDidAliasChangeEmitter.event;
    getActiveAgent() {
        return this.activeAgent;
    }
    setActiveAgent(agent) {
        this.activeAgent = agent;
        this.onDidAgentChangeEmitter.fire(agent);
    }
    getSelectedAliasId() {
        return this.selectedAliasId;
    }
    setSelectedAliasId(aliasId) {
        this.selectedAliasId = aliasId;
        this.onDidAliasChangeEmitter.fire(aliasId);
    }
    selectConfigurationTab(widgetId) {
        this.onDidSelectConfigurationEmitter.fire(widgetId);
    }
};
exports.AIConfigurationSelectionService = AIConfigurationSelectionService;
exports.AIConfigurationSelectionService = AIConfigurationSelectionService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIConfigurationSelectionService);
//# sourceMappingURL=ai-configuration-service.js.map