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
exports.DefaultCodeCompletionPostProcessor = exports.CodeCompletionPostProcessor = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/core/lib/common");
const ai_code_completion_preference_1 = require("../common/ai-code-completion-preference");
exports.CodeCompletionPostProcessor = Symbol('CodeCompletionPostProcessor');
let DefaultCodeCompletionPostProcessor = class DefaultCodeCompletionPostProcessor {
    postProcess(text) {
        if (this.preferenceService.get(ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_STRIP_BACKTICKS, true)) {
            return this.stripBackticks(text);
        }
        return text;
    }
    stripBackticks(text) {
        if (text.startsWith('```')) {
            // Remove the first backticks and any language identifier
            const startRemoved = text.slice(3).replace(/^\w*\n/, '');
            const lastBacktickIndex = startRemoved.lastIndexOf('```');
            return lastBacktickIndex !== -1 ? startRemoved.slice(0, lastBacktickIndex).trim() : startRemoved.trim();
        }
        return text;
    }
};
exports.DefaultCodeCompletionPostProcessor = DefaultCodeCompletionPostProcessor;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], DefaultCodeCompletionPostProcessor.prototype, "preferenceService", void 0);
exports.DefaultCodeCompletionPostProcessor = DefaultCodeCompletionPostProcessor = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], DefaultCodeCompletionPostProcessor);
//# sourceMappingURL=code-completion-postprocessor.js.map