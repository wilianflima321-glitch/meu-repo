"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH and others.
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
exports.ImageContextVariable = exports.IMAGE_CONTEXT_VARIABLE = void 0;
const ai_core_1 = require("@theia/ai-core");
exports.IMAGE_CONTEXT_VARIABLE = {
    id: 'imageContext',
    description: 'Provides context information for an image',
    name: 'imageContext',
    label: 'Image File',
    iconClasses: ['codicon', 'codicon-file-media'],
    isContextVariable: true,
    args: [
        { name: 'name', description: 'The name of the image file if available.', isOptional: true },
        { name: 'wsRelativePath', description: 'The workspace-relative path of the image file if available.', isOptional: true },
        { name: 'data', description: 'The image data in base64.' },
        { name: 'mimeType', description: 'The mimetype of the image.' }
    ]
};
var ImageContextVariable;
(function (ImageContextVariable) {
    ImageContextVariable.name = 'name';
    ImageContextVariable.wsRelativePath = 'wsRelativePath';
    ImageContextVariable.data = 'data';
    ImageContextVariable.mimeType = 'mimeType';
    function isImageContextRequest(request) {
        return ai_core_1.AIVariableResolutionRequest.is(request) && request.variable.id === exports.IMAGE_CONTEXT_VARIABLE.id && !!request.arg;
    }
    ImageContextVariable.isImageContextRequest = isImageContextRequest;
    function isResolvedImageContext(resolved) {
        return ai_core_1.ResolvedAIContextVariable.is(resolved) && resolved.variable.id === exports.IMAGE_CONTEXT_VARIABLE.id && !!resolved.arg;
    }
    ImageContextVariable.isResolvedImageContext = isResolvedImageContext;
    function parseRequest(request) {
        return isImageContextRequest(request) ? parseArg(request.arg) : undefined;
    }
    ImageContextVariable.parseRequest = parseRequest;
    function resolve(request) {
        var _a, _b, _c, _d;
        const args = parseArg(request.arg);
        return {
            ...request,
            value: (_b = (_a = args.wsRelativePath) !== null && _a !== void 0 ? _a : args.name) !== null && _b !== void 0 ? _b : 'Image',
            contextValue: (_d = (_c = args.wsRelativePath) !== null && _c !== void 0 ? _c : args.name) !== null && _d !== void 0 ? _d : 'Image'
        };
    }
    ImageContextVariable.resolve = resolve;
    function parseResolved(resolved) {
        return isResolvedImageContext(resolved) ? parseArg(resolved.arg) : undefined;
    }
    ImageContextVariable.parseResolved = parseResolved;
    function createRequest(content) {
        return {
            variable: exports.IMAGE_CONTEXT_VARIABLE,
            arg: createArgString(content)
        };
    }
    ImageContextVariable.createRequest = createRequest;
    function createArgString(args) {
        return JSON.stringify(args);
    }
    ImageContextVariable.createArgString = createArgString;
    function parseArg(argString) {
        const result = {};
        if (!argString) {
            throw new Error('Invalid argument string: empty string');
        }
        try {
            const parsed = JSON.parse(argString);
            Object.assign(result, parsed);
        }
        catch (error) {
            throw new Error(`Failed to parse JSON argument string: ${error.message}`);
        }
        if (!result.data) {
            throw new Error(`Missing required argument: ${ImageContextVariable.data}`);
        }
        if (!result.mimeType) {
            throw new Error(`Missing required argument: ${ImageContextVariable.mimeType}`);
        }
        return result;
    }
    ImageContextVariable.parseArg = parseArg;
})(ImageContextVariable || (exports.ImageContextVariable = ImageContextVariable = {}));
//# sourceMappingURL=image-context-variable.js.map