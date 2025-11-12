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
exports.RemoteNativeDependencyContribution = exports.DirectoryDependencyDownload = exports.FileDependencyResult = void 0;
const core_1 = require("@theia/core");
var FileDependencyResult;
(function (FileDependencyResult) {
    function is(item) {
        return (0, core_1.isObject)(item) && 'buffer' in item && 'file' in item;
    }
    FileDependencyResult.is = is;
})(FileDependencyResult || (exports.FileDependencyResult = FileDependencyResult = {}));
var DirectoryDependencyDownload;
(function (DirectoryDependencyDownload) {
    function is(item) {
        return (0, core_1.isObject)(item) && 'buffer' in item && 'archive' in item;
    }
    DirectoryDependencyDownload.is = is;
})(DirectoryDependencyDownload || (exports.DirectoryDependencyDownload = DirectoryDependencyDownload = {}));
exports.RemoteNativeDependencyContribution = Symbol('RemoteNativeDependencyContribution');
//# sourceMappingURL=remote-native-dependency-contribution.js.map