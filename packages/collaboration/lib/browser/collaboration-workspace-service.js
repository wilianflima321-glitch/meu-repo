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
exports.CollaborationWorkspaceService = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const vscode_languageserver_protocol_1 = require("@theia/core/shared/vscode-languageserver-protocol");
const browser_1 = require("@theia/workspace/lib/browser");
const collaboration_file_system_provider_1 = require("./collaboration-file-system-provider");
let CollaborationWorkspaceService = class CollaborationWorkspaceService extends browser_1.WorkspaceService {
    async setHostWorkspace(workspace, connection) {
        this.collabWorkspace = workspace;
        this.connection = connection;
        await this.setWorkspace({
            isDirectory: false,
            isFile: true,
            isReadonly: false,
            isSymbolicLink: false,
            name: core_1.nls.localize('theia/collaboration/collaborationWorkspace', 'Collaboration Workspace'),
            resource: collaboration_file_system_provider_1.CollaborationURI.create(this.collabWorkspace)
        });
        return vscode_languageserver_protocol_1.Disposable.create(() => {
            this.collabWorkspace = undefined;
            this.connection = undefined;
            this.setWorkspace(undefined);
        });
    }
    async computeRoots() {
        if (this.collabWorkspace) {
            return this.collabWorkspace.folders.map(e => this.entryToStat(e));
        }
        else {
            return super.computeRoots();
        }
    }
    entryToStat(entry) {
        const uri = collaboration_file_system_provider_1.CollaborationURI.create(this.collabWorkspace, entry);
        return {
            resource: uri,
            name: entry,
            isDirectory: true,
            isFile: false,
            isReadonly: false,
            isSymbolicLink: false
        };
    }
};
exports.CollaborationWorkspaceService = CollaborationWorkspaceService;
exports.CollaborationWorkspaceService = CollaborationWorkspaceService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CollaborationWorkspaceService);
//# sourceMappingURL=collaboration-workspace-service.js.map