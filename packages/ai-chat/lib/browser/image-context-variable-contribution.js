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
exports.ImageContextVariableContribution = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const browser_2 = require("@theia/workspace/lib/browser");
const image_context_variable_1 = require("../common/image-context-variable");
let ImageContextVariableContribution = class ImageContextVariableContribution {
    registerVariables(service) {
        service.registerResolver(image_context_variable_1.IMAGE_CONTEXT_VARIABLE, this);
        service.registerOpener(image_context_variable_1.IMAGE_CONTEXT_VARIABLE, this);
        service.registerPasteHandler(this.handlePaste.bind(this));
    }
    async canResolve(request, _) {
        return image_context_variable_1.ImageContextVariable.isImageContextRequest(request) ? 1 : 0;
    }
    async resolve(request, _) {
        return image_context_variable_1.ImageContextVariable.resolve(request);
    }
    async canOpen(request, context) {
        var _a;
        return image_context_variable_1.ImageContextVariable.isImageContextRequest(request) && !!((_a = image_context_variable_1.ImageContextVariable.parseRequest(request)) === null || _a === void 0 ? void 0 : _a.wsRelativePath) ? 1 : 0;
    }
    async open(request, context) {
        const uri = await this.toUri(request);
        if (!uri) {
            throw new Error('Unable to resolve URI for request.');
        }
        await (0, browser_1.open)(this.openerService, uri);
    }
    async toUri(request) {
        const variable = image_context_variable_1.ImageContextVariable.parseRequest(request);
        return (variable === null || variable === void 0 ? void 0 : variable.wsRelativePath) ? this.makeAbsolute(variable.wsRelativePath) : undefined;
    }
    async handlePaste(event, context) {
        var _a;
        if (!((_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.items)) {
            return undefined;
        }
        const variables = [];
        for (const item of event.clipboardData.items) {
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    try {
                        const dataUrl = await this.readFileAsDataURL(blob);
                        // Extract the base64 data by removing the data URL prefix
                        // Format is like: data:image/png;base64,BASE64DATA
                        const imageData = dataUrl.substring(dataUrl.indexOf(',') + 1);
                        variables.push(image_context_variable_1.ImageContextVariable.createRequest({
                            data: imageData,
                            name: blob.name || `pasted-image-${Date.now()}.png`,
                            mimeType: blob.type
                        }));
                    }
                    catch (error) {
                        console.error('Failed to process pasted image:', error);
                    }
                }
            }
        }
        return variables.length > 0 ? { variables } : undefined;
    }
    readFileAsDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                var _a;
                if (!((_a = e.target) === null || _a === void 0 ? void 0 : _a.result)) {
                    reject(new Error('Failed to read file as data URL'));
                    return;
                }
                resolve(e.target.result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }
    async makeAbsolute(pathStr) {
        const path = new core_1.Path(core_1.Path.normalizePathSeparator(pathStr));
        if (!path.isAbsolute) {
            const workspaceRoots = this.wsService.tryGetRoots();
            const wsUris = workspaceRoots.map(root => root.resource.resolve(path));
            for (const uri of wsUris) {
                if (await this.fileService.exists(uri)) {
                    return uri;
                }
            }
        }
        const argUri = new core_1.URI(pathStr);
        if (await this.fileService.exists(argUri)) {
            return argUri;
        }
        return undefined;
    }
    canHandle(element) {
        return image_context_variable_1.ImageContextVariable.isImageContextRequest(element) ? 10 : -1;
    }
    getIcon(element) {
        const path = image_context_variable_1.ImageContextVariable.parseArg(element.arg).wsRelativePath;
        return path ? this.labelProvider.getIcon(new core_1.URI(path)) : undefined;
    }
    getName(element) {
        return image_context_variable_1.ImageContextVariable.parseArg(element.arg).name;
    }
    getDetails(element) {
        const path = image_context_variable_1.ImageContextVariable.parseArg(element.arg).wsRelativePath;
        return path ? this.labelProvider.getDetails(new core_1.URI(path)) : '[pasted]';
    }
};
exports.ImageContextVariableContribution = ImageContextVariableContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], ImageContextVariableContribution.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.WorkspaceService),
    tslib_1.__metadata("design:type", browser_2.WorkspaceService)
], ImageContextVariableContribution.prototype, "wsService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.OpenerService),
    tslib_1.__metadata("design:type", Object)
], ImageContextVariableContribution.prototype, "openerService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.LabelProvider),
    tslib_1.__metadata("design:type", browser_1.LabelProvider)
], ImageContextVariableContribution.prototype, "labelProvider", void 0);
exports.ImageContextVariableContribution = ImageContextVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ImageContextVariableContribution);
//# sourceMappingURL=image-context-variable-contribution.js.map