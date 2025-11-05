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
exports.useMarkdownRendering = exports.MarkdownPartRenderer = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/ai-chat/lib/common");
const react_1 = require("@theia/core/shared/react");
const React = require("@theia/core/shared/react");
const markdownit = require("@theia/core/shared/markdown-it");
const DOMPurify = require("@theia/core/shared/dompurify");
const browser_1 = require("@theia/core/lib/browser");
const core_1 = require("@theia/core");
let MarkdownPartRenderer = class MarkdownPartRenderer {
    constructor() {
        this.markdownIt = markdownit();
    }
    canHandle(response) {
        if (common_1.MarkdownChatResponseContent.is(response)) {
            return 10;
        }
        if (common_1.InformationalChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(response) {
        // TODO let the user configure whether they want to see informational content
        if (common_1.InformationalChatResponseContent.is(response)) {
            // null is valid in React
            // eslint-disable-next-line no-null/no-null
            return null;
        }
        return React.createElement(MarkdownRender, { response: response, openerService: this.openerService });
    }
};
exports.MarkdownPartRenderer = MarkdownPartRenderer;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.OpenerService),
    tslib_1.__metadata("design:type", Object)
], MarkdownPartRenderer.prototype, "openerService", void 0);
exports.MarkdownPartRenderer = MarkdownPartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MarkdownPartRenderer);
const MarkdownRender = ({ response, openerService }) => {
    const ref = (0, exports.useMarkdownRendering)(response.content, openerService);
    return React.createElement("div", { ref: ref });
};
/**
 * This hook uses markdown-it directly to render markdown.
 * The reason to use markdown-it directly is that the MarkdownRenderer is
 * overridden by theia with a monaco version. This monaco version strips all html
 * tags from the markdown with empty content. This leads to unexpected behavior when
 * rendering markdown with html tags.
 *
 * Moreover, we want to intercept link clicks to use the Theia OpenerService instead of the default browser behavior.
 *
 * @param markdown the string to render as markdown
 * @param skipSurroundingParagraph whether to remove a surrounding paragraph element (default: false)
 * @param openerService the service to handle link opening
 * @param eventHandler `handleEvent` will be called by default for `click` events and additionally
 * for all events enumerated in {@link DeclaredEventsEventListenerObject.handledEvents}. If `handleEvent` returns `true`,
 * no additional handlers will be run for the event.
 * @returns the ref to use in an element to render the markdown
 */
const useMarkdownRendering = (markdown, openerService, skipSurroundingParagraph = false, eventHandler) => {
    // null is valid in React
    // eslint-disable-next-line no-null/no-null
    const ref = (0, react_1.useRef)(null);
    const markdownString = typeof markdown === 'string' ? markdown : markdown.value;
    (0, react_1.useEffect)(() => {
        var _a, _b, _c, _d;
        const markdownIt = markdownit();
        const host = document.createElement('div');
        // markdownIt always puts the content in a paragraph element, so we remove it if we don't want that
        const html = skipSurroundingParagraph ? markdownIt.render(markdownString).replace(/^<p>|<\/p>|<p><\/p>$/g, '') : markdownIt.render(markdownString);
        host.innerHTML = DOMPurify.sanitize(html, {
            // DOMPurify usually strips non http(s) links from hrefs
            // but we want to allow them (see handleClick via OpenerService below)
            ALLOW_UNKNOWN_PROTOCOLS: true
        });
        while ((_a = ref === null || ref === void 0 ? void 0 : ref.current) === null || _a === void 0 ? void 0 : _a.firstChild) {
            ref.current.removeChild(ref.current.firstChild);
        }
        (_b = ref === null || ref === void 0 ? void 0 : ref.current) === null || _b === void 0 ? void 0 : _b.appendChild(host);
        // intercept link clicks to use the Theia OpenerService instead of the default browser behavior
        const handleClick = (event) => {
            if ((eventHandler === null || eventHandler === void 0 ? void 0 : eventHandler.handleEvent(event)) === true) {
                return;
            }
            let target = event.target;
            while (target && target.tagName !== 'A') {
                target = target.parentElement;
            }
            if (target && target.tagName === 'A') {
                const href = target.getAttribute('href');
                if (href) {
                    (0, browser_1.open)(openerService, new core_1.URI(href));
                    event.preventDefault();
                }
            }
        };
        (_c = ref === null || ref === void 0 ? void 0 : ref.current) === null || _c === void 0 ? void 0 : _c.addEventListener('click', handleClick);
        (_d = eventHandler === null || eventHandler === void 0 ? void 0 : eventHandler.handledEvents) === null || _d === void 0 ? void 0 : _d.forEach(eventType => { var _a; return eventType !== 'click' && ((_a = ref === null || ref === void 0 ? void 0 : ref.current) === null || _a === void 0 ? void 0 : _a.addEventListener(eventType, eventHandler)); });
        return () => {
            var _a, _b;
            (_a = ref.current) === null || _a === void 0 ? void 0 : _a.removeEventListener('click', handleClick);
            (_b = eventHandler === null || eventHandler === void 0 ? void 0 : eventHandler.handledEvents) === null || _b === void 0 ? void 0 : _b.forEach(eventType => { var _a; return eventType !== 'click' && ((_a = ref === null || ref === void 0 ? void 0 : ref.current) === null || _a === void 0 ? void 0 : _a.removeEventListener(eventType, eventHandler)); });
        };
    }, [markdownString, skipSurroundingParagraph, openerService]);
    return ref;
};
exports.useMarkdownRendering = useMarkdownRendering;
//# sourceMappingURL=markdown-part-renderer.js.map