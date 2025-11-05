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
exports.ThinkingPartRenderer = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/ai-chat/lib/common");
const nls_1 = require("@theia/core/lib/common/nls");
const React = require("@theia/core/shared/react");
let ThinkingPartRenderer = class ThinkingPartRenderer {
    canHandle(response) {
        if (common_1.ThinkingChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(response) {
        return (React.createElement("div", { className: 'theia-thinking' },
            React.createElement("details", null,
                React.createElement("summary", null, nls_1.nls.localize('theia/ai/chat-ui/thinking-part-renderer/thinking', 'Thinking')),
                React.createElement("pre", null, response.content))));
    }
};
exports.ThinkingPartRenderer = ThinkingPartRenderer;
exports.ThinkingPartRenderer = ThinkingPartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ThinkingPartRenderer);
//# sourceMappingURL=thinking-part-renderer.js.map