"use strict";
// *****************************************************************************
// Copyright (C) 2025 TypeFox GmbH and others.
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
const ollama_language_model_1 = require("./node/ollama-language-model");
const chai_1 = require("chai");
const sinon = require("sinon");
describe('ai-ollama package', () => {
    it('Transform to Ollama tools', () => {
        var _a, _b, _c;
        const req = createToolRequest();
        const model = new OllamaModelUnderTest();
        const ollamaTool = model.toOllamaTool(req);
        (0, chai_1.expect)(ollamaTool.function.name).equals('example-tool');
        (0, chai_1.expect)(ollamaTool.function.description).equals('Example Tool');
        (0, chai_1.expect)((_a = ollamaTool.function.parameters) === null || _a === void 0 ? void 0 : _a.type).equal('object');
        (0, chai_1.expect)((_b = ollamaTool.function.parameters) === null || _b === void 0 ? void 0 : _b.properties).to.deep.equal(req.parameters.properties);
        (0, chai_1.expect)((_c = ollamaTool.function.parameters) === null || _c === void 0 ? void 0 : _c.required).to.deep.equal(['question']);
    });
});
class OllamaModelUnderTest extends ollama_language_model_1.OllamaModel {
    constructor() {
        super('id', 'model', { status: 'ready' }, () => '');
    }
    toOllamaTool(tool) {
        return super.toOllamaTool(tool);
    }
}
function createToolRequest() {
    return {
        id: 'tool-1',
        name: 'example-tool',
        description: 'Example Tool',
        parameters: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'What is the best pizza topping?'
                },
                optional: {
                    type: 'string',
                    description: 'Optional parameter'
                }
            },
            required: ['question']
        },
        handler: sinon.stub()
    };
}
//# sourceMappingURL=package.spec.js.map