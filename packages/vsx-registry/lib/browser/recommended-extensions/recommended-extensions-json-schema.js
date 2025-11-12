"use strict";
// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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
exports.ExtensionSchemaContribution = exports.extensionsConfigurationSchema = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const json_schema_store_1 = require("@theia/core/lib/browser/json-schema-store");
const uri_1 = require("@theia/core/lib/common/uri");
const browser_1 = require("@theia/workspace/lib/browser");
const recommended_extensions_preference_contribution_1 = require("../../common/recommended-extensions-preference-contribution");
exports.extensionsConfigurationSchema = {
    $id: recommended_extensions_preference_contribution_1.extensionsSchemaID,
    default: { recommendations: [] },
    type: 'object',
    properties: {
        recommendations: {
            title: 'A list of extensions recommended for users of this workspace. Should use the form "<publisher>.<extension name>"',
            type: 'array',
            items: {
                type: 'string',
                pattern: '^\\w[\\w-]+\\.\\w[\\w-]+$',
                patternErrorMessage: "Expected format '${publisher}.${name}'. Example: 'eclipse.theia'."
            },
            default: [],
        },
        unwantedRecommendations: {
            title: 'A list of extensions recommended by default that should not be recommended to users of this workspace. Should use the form "<publisher>.<extension name>"',
            type: 'array',
            items: {
                type: 'string',
                pattern: '^\\w[\\w-]+\\.\\w[\\w-]+$',
                patternErrorMessage: "Expected format '${publisher}.${name}'. Example: 'eclipse.theia'."
            },
            default: [],
        }
    },
    allowComments: true,
    allowTrailingCommas: true,
};
let ExtensionSchemaContribution = class ExtensionSchemaContribution {
    constructor() {
        this.uri = new uri_1.default(recommended_extensions_preference_contribution_1.extensionsSchemaID);
    }
    init() {
        this.schemaStore.setSchema(this.uri, exports.extensionsConfigurationSchema);
    }
    registerSchemas(context) {
        context.registerSchema({
            fileMatch: ['extensions.json'],
            url: this.uri.toString(),
        });
        this.workspaceService.updateSchema('extensions', { $ref: this.uri.toString() });
    }
};
exports.ExtensionSchemaContribution = ExtensionSchemaContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(json_schema_store_1.JsonSchemaDataStore),
    tslib_1.__metadata("design:type", json_schema_store_1.JsonSchemaDataStore)
], ExtensionSchemaContribution.prototype, "schemaStore", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WorkspaceService),
    tslib_1.__metadata("design:type", browser_1.WorkspaceService)
], ExtensionSchemaContribution.prototype, "workspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ExtensionSchemaContribution.prototype, "init", null);
exports.ExtensionSchemaContribution = ExtensionSchemaContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ExtensionSchemaContribution);
//# sourceMappingURL=recommended-extensions-json-schema.js.map