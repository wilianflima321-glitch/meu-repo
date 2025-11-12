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
exports.ProgressPartRenderer = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/ai-chat/lib/common");
const React = require("@theia/core/shared/react");
const chat_progress_message_1 = require("../chat-progress-message");
let ProgressPartRenderer = class ProgressPartRenderer {
    canHandle(response) {
        if (common_1.ProgressChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(response) {
        return (React.createElement(chat_progress_message_1.ProgressMessage, { content: response.message, status: 'inProgress' }));
    }
};
exports.ProgressPartRenderer = ProgressPartRenderer;
exports.ProgressPartRenderer = ProgressPartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ProgressPartRenderer);
//# sourceMappingURL=progress-part-renderer.js.map