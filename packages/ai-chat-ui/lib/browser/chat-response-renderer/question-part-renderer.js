"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionPartRenderer = void 0;
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
const ai_chat_1 = require("@theia/ai-chat");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
let QuestionPartRenderer = class QuestionPartRenderer {
    canHandle(response) {
        if (ai_chat_1.QuestionResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(question, node) {
        return (React.createElement("div", { className: "theia-QuestionPartRenderer-root" },
            React.createElement("div", { className: "theia-QuestionPartRenderer-question" }, question.question),
            React.createElement("div", { className: "theia-QuestionPartRenderer-options" }, question.options.map((option, index) => (React.createElement("button", { className: `theia-button theia-QuestionPartRenderer-option ${question.selectedOption === option ? 'selected' : ''}`, onClick: () => {
                    question.selectedOption = option;
                    question.handler(option);
                }, disabled: question.selectedOption !== undefined || !node.response.isWaitingForInput, key: index }, option.text))))));
    }
};
exports.QuestionPartRenderer = QuestionPartRenderer;
exports.QuestionPartRenderer = QuestionPartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], QuestionPartRenderer);
//# sourceMappingURL=question-part-renderer.js.map