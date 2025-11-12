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
const chai_1 = require("chai");
const chat_model_1 = require("./chat-model");
const parse_contents_1 = require("./parse-contents");
const fakeRequest = {};
// Custom matchers with incompleteContentFactory for testing
const TestCodeContentMatcher = {
    start: /^```.*?$/m,
    end: /^```$/m,
    contentFactory: (content) => {
        var _a;
        const language = ((_a = content.match(/^```(\w+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
        const code = content.replace(/^```(\w+)\n|```$/g, '');
        return new chat_model_1.CodeChatResponseContentImpl(code.trim(), language);
    },
    incompleteContentFactory: (content) => {
        var _a;
        const language = ((_a = content.match(/^```(\w+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
        // Remove only the start delimiter, since we don't have an end delimiter yet
        const code = content.replace(/^```(\w+)\n?/g, '');
        return new chat_model_1.CodeChatResponseContentImpl(code.trim(), language);
    }
};
describe('parseContents with incomplete parts', () => {
    it('should handle incomplete code blocks with incompleteContentFactory', () => {
        // Only the start of a code block without an end
        const text = '```typescript\nconsole.log("Hello World");';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [TestCodeContentMatcher]);
        (0, chai_1.expect)(result.length).to.equal(1);
        (0, chai_1.expect)(result[0]).to.be.instanceOf(chat_model_1.CodeChatResponseContentImpl);
        const codeContent = result[0];
        (0, chai_1.expect)(codeContent.code).to.equal('console.log("Hello World");');
        (0, chai_1.expect)(codeContent.language).to.equal('typescript');
    });
    it('should handle complete code blocks with contentFactory', () => {
        const text = '```typescript\nconsole.log("Hello World");\n```';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [TestCodeContentMatcher]);
        (0, chai_1.expect)(result.length).to.equal(1);
        (0, chai_1.expect)(result[0]).to.be.instanceOf(chat_model_1.CodeChatResponseContentImpl);
        const codeContent = result[0];
        (0, chai_1.expect)(codeContent.code).to.equal('console.log("Hello World");');
        (0, chai_1.expect)(codeContent.language).to.equal('typescript');
    });
    it('should handle mixed content with incomplete and complete blocks', () => {
        const text = 'Some text\n```typescript\nconsole.log("Hello");\n```\nMore text\n```python\nprint("World")';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [TestCodeContentMatcher]);
        (0, chai_1.expect)(result.length).to.equal(4);
        (0, chai_1.expect)(result[0]).to.be.instanceOf(chat_model_1.MarkdownChatResponseContentImpl);
        (0, chai_1.expect)(result[1]).to.be.instanceOf(chat_model_1.CodeChatResponseContentImpl);
        const completeContent = result[1];
        (0, chai_1.expect)(completeContent.language).to.equal('typescript');
        (0, chai_1.expect)(result[2]).to.be.instanceOf(chat_model_1.MarkdownChatResponseContentImpl);
        (0, chai_1.expect)(result[3]).to.be.instanceOf(chat_model_1.CodeChatResponseContentImpl);
        const incompleteContent = result[3];
        (0, chai_1.expect)(incompleteContent.language).to.equal('python');
    });
    it('should use default content factory if no incompleteContentFactory provided', () => {
        // Create a matcher without incompleteContentFactory
        const matcherWithoutIncomplete = {
            start: /^<test>$/m,
            end: /^<\/test>$/m,
            contentFactory: (content) => new chat_model_1.MarkdownChatResponseContentImpl('complete: ' + content)
        };
        // Text with only the start delimiter
        const text = '<test>\ntest content';
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [matcherWithoutIncomplete]);
        (0, chai_1.expect)(result.length).to.equal(1);
        (0, chai_1.expect)(result[0]).to.be.instanceOf(chat_model_1.MarkdownChatResponseContentImpl);
        (0, chai_1.expect)(result[0].content.value).to.equal('<test>\ntest content');
    });
    it('should prefer complete matches over incomplete ones', () => {
        // Text with both a complete and incomplete match at same position
        const text = '```typescript\nconsole.log();\n```\n<test>\ntest content';
        const matcherWithoutIncomplete = {
            start: /^<test>$/m,
            end: /^<\/test>$/m,
            contentFactory: (content) => new chat_model_1.MarkdownChatResponseContentImpl('complete: ' + content)
        };
        const result = (0, parse_contents_1.parseContents)(text, fakeRequest, [TestCodeContentMatcher, matcherWithoutIncomplete]);
        (0, chai_1.expect)(result.length).to.equal(2);
        (0, chai_1.expect)(result[0]).to.be.instanceOf(chat_model_1.CodeChatResponseContentImpl);
        (0, chai_1.expect)(result[0].language).to.equal('typescript');
        (0, chai_1.expect)(result[1]).to.be.instanceOf(chat_model_1.MarkdownChatResponseContentImpl);
        (0, chai_1.expect)(result[1].content.value).to.contain('test content');
    });
});
//# sourceMappingURL=parse-contents-with-incomplete-parts.spec.js.map