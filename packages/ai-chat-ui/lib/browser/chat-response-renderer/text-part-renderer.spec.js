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
const text_part_renderer_1 = require("./text-part-renderer");
const chai_1 = require("chai");
describe('TextPartRenderer', () => {
    it('accepts all parts', () => {
        const renderer = new text_part_renderer_1.TextPartRenderer();
        (0, chai_1.expect)(renderer.canHandle({ kind: 'text' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle({ kind: 'code' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle({ kind: 'command' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle({ kind: 'error' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle({ kind: 'horizontal' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle({ kind: 'informational' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle({ kind: 'markdownContent' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle({ kind: 'toolCall' })).to.be.greaterThan(0);
        (0, chai_1.expect)(renderer.canHandle(undefined)).to.be.greaterThan(0);
    });
    it('renders text correctly', () => {
        const renderer = new text_part_renderer_1.TextPartRenderer();
        const part = { kind: 'text', asString: () => 'Hello, World!' };
        const node = renderer.render(part);
        (0, chai_1.expect)(JSON.stringify(node)).to.contain('Hello, World!');
    });
    it('handles undefined content gracefully', () => {
        const renderer = new text_part_renderer_1.TextPartRenderer();
        const part = undefined;
        const node = renderer.render(part);
        (0, chai_1.expect)(node).to.exist;
    });
});
//# sourceMappingURL=text-part-renderer.spec.js.map