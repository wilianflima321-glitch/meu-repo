"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH and others.
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
exports.InMemoryTaskContextStorage = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const ai_core_1 = require("@theia/ai-core");
const task_context_variable_1 = require("./task-context-variable");
const browser_1 = require("@theia/core/lib/browser");
let InMemoryTaskContextStorage = class InMemoryTaskContextStorage {
    constructor() {
        this.summaries = new Map();
        this.onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
    }
    sanitizeLabel(label) {
        // remove leading non-letter/number characters; use 'u' for unicode property escapes
        return label.replace(/^[^\p{L}\p{N}]+/u, '');
    }
    store(summary) {
        this.summaries.set(summary.id, { ...summary, label: this.sanitizeLabel(summary.label) });
        this.onDidChangeEmitter.fire();
    }
    getAll() {
        return Array.from(this.summaries.values());
    }
    get(identifier) {
        return this.summaries.get(identifier);
    }
    delete(identifier) {
        const didDelete = this.summaries.delete(identifier);
        if (didDelete) {
            this.onDidChangeEmitter.fire();
        }
        return didDelete;
    }
    clear() {
        if (this.summaries.size) {
            this.summaries.clear();
            this.onDidChangeEmitter.fire();
        }
    }
    async open(identifier) {
        const summary = this.get(identifier);
        if (!summary) {
            throw new Error('Unable to upon requested task context: none found.');
        }
        const resource = this.variableResourceResolver.getOrCreate({ variable: task_context_variable_1.TASK_CONTEXT_VARIABLE, arg: identifier }, {}, summary.summary);
        resource.update({ onSave: async (content) => { summary.summary = content; }, readOnly: false });
        await (0, browser_1.open)(this.openerService, resource.uri);
        resource.dispose();
    }
};
exports.InMemoryTaskContextStorage = InMemoryTaskContextStorage;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AIVariableResourceResolver),
    tslib_1.__metadata("design:type", ai_core_1.AIVariableResourceResolver)
], InMemoryTaskContextStorage.prototype, "variableResourceResolver", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.OpenerService),
    tslib_1.__metadata("design:type", Object)
], InMemoryTaskContextStorage.prototype, "openerService", void 0);
exports.InMemoryTaskContextStorage = InMemoryTaskContextStorage = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], InMemoryTaskContextStorage);
//# sourceMappingURL=task-context-storage-service.js.map