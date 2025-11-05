"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
exports.CollaborationUtils = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const collaboration_workspace_service_1 = require("./collaboration-workspace-service");
let CollaborationUtils = class CollaborationUtils {
    getProtocolPath(uri) {
        if (!uri) {
            return undefined;
        }
        const path = uri.path.toString();
        const roots = this.workspaceService.tryGetRoots();
        for (const root of roots) {
            const rootUri = root.resource.path.toString() + '/';
            if (path.startsWith(rootUri)) {
                return root.name + '/' + path.substring(rootUri.length);
            }
        }
        return undefined;
    }
    getResourceUri(path) {
        if (!path) {
            return undefined;
        }
        const parts = path.split('/');
        const root = parts[0];
        const rest = parts.slice(1);
        const stat = this.workspaceService.tryGetRoots().find(e => e.name === root);
        if (stat) {
            const uriPath = stat.resource.path.join(...rest);
            const uri = stat.resource.withPath(uriPath);
            return uri;
        }
        else {
            return undefined;
        }
    }
};
exports.CollaborationUtils = CollaborationUtils;
tslib_1.__decorate([
    (0, inversify_1.inject)(collaboration_workspace_service_1.CollaborationWorkspaceService),
    tslib_1.__metadata("design:type", collaboration_workspace_service_1.CollaborationWorkspaceService)
], CollaborationUtils.prototype, "workspaceService", void 0);
exports.CollaborationUtils = CollaborationUtils = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CollaborationUtils);
//# sourceMappingURL=collaboration-utils.js.map