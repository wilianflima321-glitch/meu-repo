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
exports.BackendRemoteServiceImpl = exports.REMOTE_START = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const backend_remote_service_1 = require("@theia/core/lib/node/remote/backend-remote-service");
exports.REMOTE_START = 'remote';
let BackendRemoteServiceImpl = class BackendRemoteServiceImpl extends backend_remote_service_1.BackendRemoteService {
    constructor() {
        super(...arguments);
        this.isRemote = false;
    }
    configure(conf) {
        conf.option(exports.REMOTE_START, {
            description: 'Starts the server as an endpoint for a remote connection (i.e. through SSH)',
            type: 'boolean',
            default: false
        });
    }
    setArguments(args) {
        this.isRemote = Boolean(args[exports.REMOTE_START]);
    }
    isRemoteServer() {
        return this.isRemote;
    }
};
exports.BackendRemoteServiceImpl = BackendRemoteServiceImpl;
exports.BackendRemoteServiceImpl = BackendRemoteServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], BackendRemoteServiceImpl);
//# sourceMappingURL=backend-remote-service-impl.js.map