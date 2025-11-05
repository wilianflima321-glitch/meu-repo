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
exports.RemoteRegistry = exports.AbstractRemoteRegistryContribution = exports.RemoteRegistryContribution = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const window_service_1 = require("@theia/core/lib/browser/window/window-service");
exports.RemoteRegistryContribution = Symbol('RemoteRegistryContribution');
let AbstractRemoteRegistryContribution = class AbstractRemoteRegistryContribution {
    openRemote(port, newWindow, workspace) {
        const searchParams = new URLSearchParams(location.search);
        const localPort = searchParams.get('localPort') || searchParams.get('port');
        const options = {
            search: { port }
        };
        if (localPort) {
            options.search.localPort = localPort;
        }
        if (workspace) {
            options.hash = workspace;
        }
        if (newWindow) {
            this.windowService.openNewDefaultWindow(options);
        }
        else {
            this.windowService.reload(options);
        }
    }
};
exports.AbstractRemoteRegistryContribution = AbstractRemoteRegistryContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(window_service_1.WindowService),
    tslib_1.__metadata("design:type", Object)
], AbstractRemoteRegistryContribution.prototype, "windowService", void 0);
exports.AbstractRemoteRegistryContribution = AbstractRemoteRegistryContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AbstractRemoteRegistryContribution);
class RemoteRegistry {
    constructor() {
        this._commands = [];
        this.onDidRegisterCommandEmitter = new core_1.Emitter();
    }
    get commands() {
        return this._commands;
    }
    get onDidRegisterCommand() {
        return this.onDidRegisterCommandEmitter.event;
    }
    registerCommand(command, handler) {
        this.onDidRegisterCommandEmitter.fire([command, handler]);
        this._commands.push(command);
    }
}
exports.RemoteRegistry = RemoteRegistry;
//# sourceMappingURL=remote-registry-contribution.js.map