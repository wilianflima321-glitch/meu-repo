"use strict";
// *****************************************************************************
// Copyright (C) 2018 TypeFox and others.
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
/* eslint-disable no-unsanitized/property */
const jsdom_1 = require("@theia/core/lib/browser/test/jsdom");
let disableJSDOM = (0, jsdom_1.enableJSDOM)();
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({});
const chai = require("chai");
const chai_1 = require("chai");
const uri_1 = require("@theia/core/lib/common/uri");
const markdown_preview_handler_1 = require("./markdown-preview-handler");
disableJSDOM();
chai.use(require('chai-string'));
let previewHandler;
before(() => {
    previewHandler = new markdown_preview_handler_1.MarkdownPreviewHandler();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previewHandler.linkNormalizer = {
        normalizeLink: (documentUri, link) => 'endpoint/' + documentUri.parent.resolve(link).path.toString().substring(1)
    };
});
describe('markdown-preview-handler', () => {
    before(() => {
        disableJSDOM = (0, jsdom_1.enableJSDOM)();
    });
    after(() => {
        disableJSDOM();
    });
    it('renders html with line information', async () => {
        await assertRenderedContent(exampleMarkdown1, exampleHtml1);
    });
    it('renders images', async () => {
        await assertRenderedContent(exampleMarkdown2, exampleHtml2);
    });
    it('renders HTML image as block', async () => {
        await assertRenderedContent(exampleMarkdown3, exampleHtml3);
    });
    it('renders HTML images inlined', async () => {
        await assertRenderedContent(exampleMarkdown4, exampleHtml4);
    });
    it('renders multiple HTML images in a html block', async () => {
        await assertRenderedContent(exampleMarkdown5, exampleHtml5);
    });
    it('finds element for source line', () => {
        document.body.innerHTML = exampleHtml1;
        const element = previewHandler.findElementForSourceLine(document.body, 4);
        (0, chai_1.expect)(element).not.to.be.equal(undefined);
        (0, chai_1.expect)(element.tagName).to.be.equal('H2');
        (0, chai_1.expect)(element.textContent).to.be.equal('License');
    });
    it('finds previous element for empty source line', () => {
        document.body.innerHTML = exampleHtml1;
        const element = previewHandler.findElementForSourceLine(document.body, 3);
        (0, chai_1.expect)(element).not.to.be.equal(undefined);
        (0, chai_1.expect)(element.tagName).to.be.equal('P');
        (0, chai_1.expect)(element.textContent).that.startWith('Shows a preview of supported resources.');
    });
    it('finds source line for offset in html', () => {
        mockOffsetProperties();
        document.body.innerHTML = exampleHtml1;
        for (const expectedLine of [0, 1, 4, 5]) {
            const line = previewHandler.getSourceLineForOffset(document.body, offsetForLine(expectedLine));
            (0, chai_1.expect)(line).to.be.equal(expectedLine);
        }
    });
    it('interpolates source lines for offset in html', () => {
        mockOffsetProperties();
        document.body.innerHTML = exampleHtml1;
        const expectedLines = [1, 2, 3, 4];
        const offsets = expectedLines.map(l => offsetForLine(l));
        for (let i = 0; i < expectedLines.length; i++) {
            const expectedLine = expectedLines[i];
            const offset = offsets[i];
            const line = previewHandler.getSourceLineForOffset(document.body, offset);
            (0, chai_1.expect)(line).to.be.equal(expectedLine);
        }
    });
    it('can handle \'.md\' files', () => {
        (0, chai_1.expect)(previewHandler.canHandle(new uri_1.default('a.md'))).greaterThan(0);
    });
    it('can handle \'.markdown\' files', () => {
        (0, chai_1.expect)(previewHandler.canHandle(new uri_1.default('a.markdown'))).greaterThan(0);
    });
});
async function assertRenderedContent(source, expectation) {
    const contentElement = previewHandler.renderContent({ content: source, originUri: new uri_1.default('file:///workspace/DEMO.md') });
    (0, chai_1.expect)(contentElement.innerHTML).equals(expectation);
}
const exampleMarkdown1 = //
 `# Theia - Preview Extension
Shows a preview of supported resources.
See [here](https://github.com/eclipse-theia/theia).

## License
[Apache-2.0](https://github.com/eclipse-theia/theia/blob/master/LICENSE)
`;
const exampleHtml1 = //
 `<h1 id="theia---preview-extension" class="line" data-line="0">Theia - Preview Extension</h1>
<p class="line" data-line="1">Shows a preview of supported resources.
See <a href="https://github.com/eclipse-theia/theia">here</a>.</p>
<h2 id="license" class="line" data-line="4">License</h2>
<p class="line" data-line="5"><a href="https://github.com/eclipse-theia/theia/blob/master/LICENSE">Apache-2.0</a></p>
`;
const exampleMarkdown2 = //
 `# Heading
![alternativetext](subfolder/image.png)
`;
const exampleHtml2 = //
 `<h1 id="heading" class="line" data-line="0">Heading</h1>
<p class="line" data-line="1"><img src="endpoint/workspace/subfolder/image.png" alt="alternativetext"></p>
`;
const exampleMarkdown3 = //
 `# Block HTML Image
<img src="subfolder/image1.png" alt="tada"/>

# Block HTML Image
 <img src="subfolder/image3.png" alt="tada"/>
`;
const exampleHtml3 = //
 `<h1 id="block-html-image" class="line" data-line="0">Block HTML Image</h1>
<img src="endpoint/workspace/subfolder/image1.png" alt="tada">
<h1 id="block-html-image-2" class="line" data-line="3">Block HTML Image</h1>
<img src="endpoint/workspace/subfolder/image3.png" alt="tada">
`;
const exampleMarkdown4 = //
 `# Inlined HTML Image
text in paragraph <img src="subfolder/image2.png" alt="tada"/>
`;
const exampleHtml4 = //
 `<h1 id="inlined-html-image" class="line" data-line="0">Inlined HTML Image</h1>
<p class="line" data-line="1">text in paragraph <img src="endpoint/workspace/subfolder/image2.png" alt="tada"></p>
`;
const exampleMarkdown5 = //
 `# Multiple HTML Images nested in blocks
word  <p>
<img src="subfolder/image2.png" alt="tada"/>
</p>

<p>
<img src="subfolder/image2.png" alt="tada"/>
</p>
`;
const exampleHtml5 = //
 `<h1 id="multiple-html-images-nested-in-blocks" class="line" data-line="0">Multiple HTML Images nested in blocks</h1>
<p class="line" data-line="1">word  </p><p>
<img src="endpoint/workspace/subfolder/image2.png" alt="tada"></p>
<p></p>
<p>
<img src="endpoint/workspace/subfolder/image2.png" alt="tada">
</p>
`;
/**
 * `offsetTop` of elements to be `sourceLine` number times `20`.
 */
function mockOffsetProperties() {
    Object.defineProperties(HTMLElement.prototype, {
        offsetLeft: {
            get: () => 0
        },
        offsetTop: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            get: function () {
                const element = this;
                const line = Number.parseInt(element.getAttribute('data-line') || '0');
                return offsetForLine(line);
            }
        },
        offsetHeight: {
            get: () => 0
        },
        offsetWidth: {
            get: () => 0
        }
    });
}
function offsetForLine(line) {
    return line * 20;
}
//# sourceMappingURL=markdown-preview-handler.spec.js.map