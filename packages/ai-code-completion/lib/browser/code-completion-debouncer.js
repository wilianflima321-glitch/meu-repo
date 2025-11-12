"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.InlineCompletionDebouncer = void 0;
class InlineCompletionDebouncer {
    debounce(callback, debounceDelay) {
        return new Promise((resolve, reject) => {
            if (this.timeoutId) {
                window.clearTimeout(this.timeoutId);
            }
            this.timeoutId = window.setTimeout(() => {
                callback()
                    .then(resolve)
                    .catch(reject);
                this.timeoutId = undefined;
            }, debounceDelay);
        });
    }
}
exports.InlineCompletionDebouncer = InlineCompletionDebouncer;
//# sourceMappingURL=code-completion-debouncer.js.map