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
exports.ContextVariablePicker = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const QUERY_CONTEXT = { type: 'context-variable-picker' };
let ContextVariablePicker = class ContextVariablePicker {
    async pickContextVariable() {
        const variables = this.variableService.getContextVariables();
        const selection = await this.quickInputService.showQuickPick(variables.map(v => {
            var _a;
            return ({
                id: v.id,
                label: (_a = v.label) !== null && _a !== void 0 ? _a : v.name,
                variable: v,
                iconClasses: v.iconClasses,
            });
        }), { placeholder: 'Select a context variable to be attached to the message', });
        if (!selection) {
            return undefined;
        }
        const variable = selection.variable;
        if (!variable.args || variable.args.length === 0) {
            return { variable };
        }
        const argumentPicker = await this.variableService.getArgumentPicker(variable.name, QUERY_CONTEXT);
        if (!argumentPicker) {
            return this.useGenericArgumentPicker(variable);
        }
        const arg = await argumentPicker(QUERY_CONTEXT);
        if (!arg) {
            return undefined;
        }
        return { variable, arg };
    }
    async useGenericArgumentPicker(variable) {
        var _a;
        const args = [];
        for (const argument of (_a = variable.args) !== null && _a !== void 0 ? _a : []) {
            const placeHolder = argument.description;
            let input;
            if (argument.enum) {
                const picked = await this.quickInputService.pick(argument.enum.map(enumItem => ({ label: enumItem })), { placeHolder, canPickMany: false });
                input = picked === null || picked === void 0 ? void 0 : picked.label;
            }
            else {
                input = await this.quickInputService.input({ placeHolder });
            }
            if (!input && !argument.isOptional) {
                return;
            }
            args.push(input !== null && input !== void 0 ? input : '');
        }
        return { variable, arg: args.join(ai_core_1.PromptText.VARIABLE_SEPARATOR_CHAR) };
    }
};
exports.ContextVariablePicker = ContextVariablePicker;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AIVariableService),
    tslib_1.__metadata("design:type", Object)
], ContextVariablePicker.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    tslib_1.__metadata("design:type", Object)
], ContextVariablePicker.prototype, "quickInputService", void 0);
exports.ContextVariablePicker = ContextVariablePicker = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ContextVariablePicker);
//# sourceMappingURL=context-variable-picker.js.map