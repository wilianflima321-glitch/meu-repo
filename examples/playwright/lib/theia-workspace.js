"use strict";
// *****************************************************************************
// Copyright (C) 2021 logi.cals GmbH, EclipseSource and others.
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
exports.TheiaWorkspace = void 0;
const fs = require("fs-extra");
const path_1 = require("path");
const util_1 = require("./util");
class TheiaWorkspace {
    /**
     * Creates a Theia workspace location with the specified path to files that shall be copied to this workspace.
     * The `pathOfFilesToInitialize` must be relative to cwd of the node process.
     *
     * @param {string[]} pathOfFilesToInitialize Path to files or folders that shall be copied to the workspace
     */
    constructor(pathOfFilesToInitialize) {
        this.pathOfFilesToInitialize = pathOfFilesToInitialize;
        this.workspacePath = fs.mkdtempSync((0, path_1.join)(util_1.OSUtil.tmpDir, 'cloud-ws-'));
    }
    /** Performs the file system operations preparing the workspace location synchronously. */
    initialize() {
        if (this.pathOfFilesToInitialize) {
            for (const initPath of this.pathOfFilesToInitialize) {
                const absoluteInitPath = (0, path_1.resolve)(process.cwd(), initPath);
                if (!fs.pathExistsSync(absoluteInitPath)) {
                    throw Error('Workspace does not exist at ' + absoluteInitPath);
                }
                fs.copySync(absoluteInitPath, this.workspacePath);
            }
        }
    }
    /** Returns the absolute path to the workspace location. */
    get path() {
        let workspacePath = this.workspacePath;
        if (util_1.OSUtil.isWindows) {
            // Drive letters in windows paths have to be lower case
            workspacePath = workspacePath.replace(/.:/, matchedChar => matchedChar.toLowerCase());
        }
        return workspacePath;
    }
    /**
     * Returns the absolute path to the workspace location
     * as it would be returned by URI.path.
     */
    get pathAsPathComponent() {
        let path = this.path;
        if (!path.startsWith(util_1.OSUtil.fileSeparator)) {
            path = util_1.OSUtil.fileSeparator + path;
        }
        return path.replace(/\\/g, '/');
    }
    /**
     * Returns a file URL for the given subpath relative to the workspace location.
     */
    pathAsUrl(subpath) {
        let path = (0, path_1.resolve)(this.path, subpath);
        if (!path.startsWith(util_1.OSUtil.fileSeparator)) {
            path = util_1.OSUtil.fileSeparator + path;
        }
        path = path.replace(/\\/g, '/').replace(/:/g, '%3A');
        return 'file://' + path;
    }
    clear() {
        fs.emptyDirSync(this.workspacePath);
    }
    remove() {
        fs.removeSync(this.workspacePath);
    }
}
exports.TheiaWorkspace = TheiaWorkspace;
//# sourceMappingURL=theia-workspace.js.map