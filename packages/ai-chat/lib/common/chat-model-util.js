"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lastResponseContent = lastResponseContent;
exports.lastContentOfResponse = lastContentOfResponse;
exports.lastProgressMessage = lastProgressMessage;
exports.lastProgressMessageOfResponse = lastProgressMessageOfResponse;
exports.unansweredQuestions = unansweredQuestions;
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
const chat_model_1 = require("./chat-model");
function lastResponseContent(request) {
    var _a;
    return lastContentOfResponse((_a = request.response) === null || _a === void 0 ? void 0 : _a.response);
}
function lastContentOfResponse(response) {
    const content = response === null || response === void 0 ? void 0 : response.content;
    return content && content.length > 0 ? content[content.length - 1] : undefined;
}
function lastProgressMessage(request) {
    return lastProgressMessageOfResponse(request.response);
}
function lastProgressMessageOfResponse(response) {
    const progressMessages = response === null || response === void 0 ? void 0 : response.progressMessages;
    return progressMessages && progressMessages.length > 0 ? progressMessages[progressMessages.length - 1] : undefined;
}
function unansweredQuestions(request) {
    const response = request.response;
    return unansweredQuestionsOfResponse(response);
}
function unansweredQuestionsOfResponse(response) {
    if (!response || !response.response) {
        return [];
    }
    return response.response.content.filter((c) => chat_model_1.QuestionResponseContent.is(c) && c.selectedOption === undefined);
}
//# sourceMappingURL=chat-model-util.js.map