"use strict";
// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
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
exports.RemoteCopyRegistryImpl = void 0;
const tslib_1 = require("tslib");
const application_package_1 = require("@theia/core/shared/@theia/application-package");
const inversify_1 = require("@theia/core/shared/inversify");
const glob_1 = require("glob");
const util_1 = require("util");
const path = require("path");
const promiseGlob = (0, util_1.promisify)(glob_1.glob);
let RemoteCopyRegistryImpl = class RemoteCopyRegistryImpl {
    constructor() {
        this.files = [];
    }
    getFiles() {
        return this.files.slice();
    }
    async glob(pattern, target) {
        return this.doGlob(pattern, this.applicationPackage.projectPath, target);
    }
    async doGlob(pattern, cwd, target) {
        const projectPath = this.applicationPackage.projectPath;
        const globResult = await promiseGlob(pattern, { cwd, nodir: true });
        for (const file of globResult) {
            const targetFile = this.withTarget(file, target);
            this.files.push({
                path: path.relative(projectPath, path.resolve(cwd, file)),
                target: targetFile
            });
        }
    }
    file(file, target, options) {
        const targetFile = this.withTarget(file, target);
        this.files.push({
            path: file,
            target: targetFile,
            options
        });
    }
    async directory(dir, target) {
        let absoluteDir = dir;
        if (!path.isAbsolute(absoluteDir)) {
            absoluteDir = path.join(this.applicationPackage.projectPath, dir);
        }
        return this.doGlob('**/*', absoluteDir, target !== null && target !== void 0 ? target : dir);
    }
    withTarget(file, target) {
        return target ? path.join(target, file) : file;
    }
};
exports.RemoteCopyRegistryImpl = RemoteCopyRegistryImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(application_package_1.ApplicationPackage),
    tslib_1.__metadata("design:type", application_package_1.ApplicationPackage)
], RemoteCopyRegistryImpl.prototype, "applicationPackage", void 0);
exports.RemoteCopyRegistryImpl = RemoteCopyRegistryImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteCopyRegistryImpl);
//# sourceMappingURL=remote-copy-contribution.js.map