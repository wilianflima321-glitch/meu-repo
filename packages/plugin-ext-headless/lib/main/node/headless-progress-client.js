"use strict";
// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
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
exports.HeadlessProgressClient = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
/**
 * A simple progress client for headless plugins that just writes debug messages to the console
 * because there is no one connected frontend to which it is appropriate to send the messages.
 */
let HeadlessProgressClient = class HeadlessProgressClient {
    async showProgress(_progressId, message, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return core_1.ProgressMessage.Cancel;
        }
        console.debug(message.text);
    }
    async reportProgress(_progressId, update, message, cancellationToken) {
        var _a;
        if (cancellationToken.isCancellationRequested) {
            return;
        }
        const progress = update.work && update.work.total ? `[${100 * Math.min(update.work.done, update.work.total) / update.work.total}%]` : '';
        const text = `${progress} ${(_a = update.message) !== null && _a !== void 0 ? _a : 'completed ...'}`;
        console.debug(text);
    }
};
exports.HeadlessProgressClient = HeadlessProgressClient;
exports.HeadlessProgressClient = HeadlessProgressClient = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HeadlessProgressClient);
//# sourceMappingURL=headless-progress-client.js.map