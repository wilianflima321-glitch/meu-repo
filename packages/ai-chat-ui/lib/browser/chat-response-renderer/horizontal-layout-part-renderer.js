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
exports.HorizontalLayoutPartRenderer = void 0;
const tslib_1 = require("tslib");
const chat_response_part_renderer_1 = require("../chat-response-part-renderer");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/ai-chat/lib/common");
const React = require("@theia/core/shared/react");
const core_1 = require("@theia/core");
let HorizontalLayoutPartRenderer = class HorizontalLayoutPartRenderer {
    canHandle(response) {
        if (common_1.HorizontalLayoutChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(response, parentNode) {
        const contributions = this.chatResponsePartRenderers.getContributions();
        return (React.createElement("div", { className: "ai-chat-horizontal-layout", style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' } }, response.content.map(content => {
            const renderer = contributions
                .map(c => ({
                prio: c.canHandle(content),
                renderer: c,
            }))
                .sort((a, b) => b.prio - a.prio)[0].renderer;
            return renderer.render(content, parentNode);
        })));
    }
};
exports.HorizontalLayoutPartRenderer = HorizontalLayoutPartRenderer;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(chat_response_part_renderer_1.ChatResponsePartRenderer),
    tslib_1.__metadata("design:type", Object)
], HorizontalLayoutPartRenderer.prototype, "chatResponsePartRenderers", void 0);
exports.HorizontalLayoutPartRenderer = HorizontalLayoutPartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HorizontalLayoutPartRenderer);
//# sourceMappingURL=horizontal-layout-part-renderer.js.map