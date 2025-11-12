"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultResponseContentMatcherProvider = exports.ResponseContentMatcherProvider = exports.CodeContentMatcher = exports.DefaultResponseContentFactory = exports.MarkdownContentFactory = void 0;
const tslib_1 = require("tslib");
/*
 * Copyright (C) 2024 EclipseSource GmbH.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 */
const chat_model_1 = require("./chat-model");
const inversify_1 = require("@theia/core/shared/inversify");
const MarkdownContentFactory = (content, request) => new chat_model_1.MarkdownChatResponseContentImpl(content);
exports.MarkdownContentFactory = MarkdownContentFactory;
/**
 * Default response content factory used if no other `ResponseContentMatcher` applies.
 * By default, this factory creates a markdown content object.
 *
 * @see MarkdownChatResponseContentImpl
 */
let DefaultResponseContentFactory = class DefaultResponseContentFactory {
    create(content, request) {
        return (0, exports.MarkdownContentFactory)(content, request);
    }
};
exports.DefaultResponseContentFactory = DefaultResponseContentFactory;
exports.DefaultResponseContentFactory = DefaultResponseContentFactory = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], DefaultResponseContentFactory);
exports.CodeContentMatcher = {
    // Only match when we have the complete first line ending with a newline
    // This ensures we have the full language specification before creating the editor
    start: /^```.*\n/m,
    end: /^```$/m,
    contentFactory: (content, request) => {
        var _a;
        const language = ((_a = content.match(/^```(\w+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
        const code = content.replace(/^```(\w+)\n|```$/g, '');
        return new chat_model_1.CodeChatResponseContentImpl(code.trim(), language);
    },
    incompleteContentFactory: (content, request) => {
        var _a;
        // By this point, we know we have at least the complete first line with ```
        const firstLine = content.split('\n')[0];
        const language = ((_a = firstLine.match(/^```(\w+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
        // Remove the first line to get just the code content
        const code = content.substring(content.indexOf('\n') + 1);
        return new chat_model_1.CodeChatResponseContentImpl(code.trim(), language);
    }
};
/**
 * Clients can contribute response content matchers to parse the response content.
 *
 * The default chat user interface will collect all contributed matchers and use them
 * to parse the response into structured content parts (e.g. code blocks, markdown blocks),
 * which are then rendered with a `ChatResponsePartRenderer` registered for the respective
 * content part type.
 *
 * ### Example
 * ```ts
 * bind(ResponseContentMatcherProvider).to(MyResponseContentMatcherProvider);
 * ...
 * @injectable()
 * export class MyResponseContentMatcherProvider implements ResponseContentMatcherProvider {
 *     readonly matchers: ResponseContentMatcher[] = [{
 *       start: /^<command>$/m,
 *       end: /^</command>$/m,
 *       contentFactory: (content: string) => {
 *         const command = content.replace(/^<command>\n|<\/command>$/g, '');
 *         return new MyChatResponseContentImpl(command.trim());
 *       }
 *   }];
 * }
 * ```
 *
 * @see ResponseContentMatcher
 */
exports.ResponseContentMatcherProvider = Symbol('ResponseContentMatcherProvider');
let DefaultResponseContentMatcherProvider = class DefaultResponseContentMatcherProvider {
    constructor() {
        this.matchers = [exports.CodeContentMatcher];
    }
};
exports.DefaultResponseContentMatcherProvider = DefaultResponseContentMatcherProvider;
exports.DefaultResponseContentMatcherProvider = DefaultResponseContentMatcherProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], DefaultResponseContentMatcherProvider);
//# sourceMappingURL=response-content-matcher.js.map