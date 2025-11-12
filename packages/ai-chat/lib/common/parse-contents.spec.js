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
exports.CommandContentMatcher = exports.CommandChatResponseContentImpl = exports.TestCodeContentMatcher = void 0;
const chai_1 = require("chai");
const chat_model_1 = require("./chat-model");
const parse_contents_1 = require("./parse-contents");
const response_content_matcher_1 = require("./response-content-matcher");
exports.TestCodeContentMatcher = {
    start: /^```.*?$/m,
    end: /^```$/m,
    contentFactory: (content) => {
        var _a;
        const language = ((_a = content.match(/^```(\w+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
        const code = content.replace(/^```(\w+)\n|```$/g, '');
        return new chat_model_1.CodeChatResponseContentImpl(code.trim(), language);
    }
};
class CommandChatResponseContentImpl {
    constructor(command) {
        this.command = command;
        this.kind = 'command';
    }
}
exports.CommandChatResponseContentImpl = CommandChatResponseContentImpl;
exports.CommandContentMatcher = {
    start: /^<command>$/m,
    end: /^<\/command>$/m,
    contentFactory: (content) => {
        const code = content.replace(/^<command>\n|<\/command>$/g, '');
        return new CommandChatResponseContentImpl(code.trim());
    }
};
const fakeRequest = {};
describe('parseContents', () => {
    it('should parse code content', () => {
        const text = '```typescript\nconsole.log("Hello World");\n```';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([new chat_model_1.CodeChatResponseContentImpl('console.log("Hello World");', 'typescript')]);
    });
    it('should parse markdown content', () => {
        const text = 'Hello **World**';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([new chat_model_1.MarkdownChatResponseContentImpl('Hello **World**')]);
    });
    it('should parse multiple content blocks', () => {
        const text = '```typescript\nconsole.log("Hello World");\n```\nHello **World**';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([
            new chat_model_1.CodeChatResponseContentImpl('console.log("Hello World");', 'typescript'),
            new chat_model_1.MarkdownChatResponseContentImpl('\nHello **World**')
        ]);
    });
    it('should parse multiple content blocks with different languages', () => {
        const text = '```typescript\nconsole.log("Hello World");\n```\n```python\nprint("Hello World")\n```';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([
            new chat_model_1.CodeChatResponseContentImpl('console.log("Hello World");', 'typescript'),
            new chat_model_1.CodeChatResponseContentImpl('print("Hello World")', 'python')
        ]);
    });
    it('should parse multiple content blocks with different languages and markdown', () => {
        const text = '```typescript\nconsole.log("Hello World");\n```\nHello **World**\n```python\nprint("Hello World")\n```';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([
            new chat_model_1.CodeChatResponseContentImpl('console.log("Hello World");', 'typescript'),
            new chat_model_1.MarkdownChatResponseContentImpl('\nHello **World**\n'),
            new chat_model_1.CodeChatResponseContentImpl('print("Hello World")', 'python')
        ]);
    });
    it('should parse content blocks with empty content', () => {
        const text = '```typescript\n```\nHello **World**\n```python\nprint("Hello World")\n```';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([
            new chat_model_1.CodeChatResponseContentImpl('', 'typescript'),
            new chat_model_1.MarkdownChatResponseContentImpl('\nHello **World**\n'),
            new chat_model_1.CodeChatResponseContentImpl('print("Hello World")', 'python')
        ]);
    });
    it('should parse content with markdown, code, and markdown', () => {
        const text = 'Hello **World**\n```typescript\nconsole.log("Hello World");\n```\nGoodbye **World**';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([
            new chat_model_1.MarkdownChatResponseContentImpl('Hello **World**\n'),
            new chat_model_1.CodeChatResponseContentImpl('console.log("Hello World");', 'typescript'),
            new chat_model_1.MarkdownChatResponseContentImpl('\nGoodbye **World**')
        ]);
    });
    it('should handle text with no special content', () => {
        const text = 'Just some plain text.';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([new chat_model_1.MarkdownChatResponseContentImpl('Just some plain text.')]);
    });
    it('should handle text with only start code block', () => {
        const text = '```typescript\nconsole.log("Hello World");';
        // We're using the standard CodeContentMatcher which has incompleteContentFactory
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest);
        (0, chai_1.expect)(result).to.deep.equal([new chat_model_1.CodeChatResponseContentImpl('console.log("Hello World");', 'typescript')]);
    });
    it('should handle text with only end code block', () => {
        const text = 'console.log("Hello World");\n```';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([new chat_model_1.MarkdownChatResponseContentImpl('console.log("Hello World");\n```')]);
    });
    it('should handle text with unmatched code block', () => {
        const text = '```typescript\nconsole.log("Hello World");\n```\n```python\nprint("Hello World")';
        // We're using the standard CodeContentMatcher which has incompleteContentFactory
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest);
        (0, chai_1.expect)(result).to.deep.equal([
            new chat_model_1.CodeChatResponseContentImpl('console.log("Hello World");', 'typescript'),
            new chat_model_1.CodeChatResponseContentImpl('print("Hello World")', 'python')
        ]);
    });
    it('should parse code block without newline after language', () => {
        const text = '```typescript console.log("Hello World");```';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [exports.TestCodeContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([
            new chat_model_1.MarkdownChatResponseContentImpl('```typescript console.log("Hello World");```')
        ]);
    });
    it('should parse with matches of multiple different matchers and default', () => {
        const text = '<command>\nMY_SPECIAL_COMMAND\n</command>\nHello **World**\n```python\nprint("Hello World")\n```\n<command>\nMY_SPECIAL_COMMAND2\n</command>';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [response_content_matcher_1.CodeContentMatcher, exports.CommandContentMatcher]);
        (0, chai_1.expect)(result).to.deep.equal([
            new CommandChatResponseContentImpl('MY_SPECIAL_COMMAND'),
            new chat_model_1.MarkdownChatResponseContentImpl('\nHello **World**\n'),
            new chat_model_1.CodeChatResponseContentImpl('print("Hello World")', 'python'),
            new CommandChatResponseContentImpl('MY_SPECIAL_COMMAND2'),
        ]);
    });
});
//# sourceMappingURL=parse-contents.spec.js.map