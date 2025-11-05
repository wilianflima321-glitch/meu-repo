"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH and others.
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
exports.ChangeSetImpl = void 0;
const core_1 = require("@theia/core");
class ChangeSetImpl {
    /** @param changeSets ordered from tip to root. */
    static combine(changeSets) {
        const result = new Map();
        for (const next of changeSets) {
            next._elements.forEach((value, key) => !result.has(key) && result.set(key, value));
            // Break at the first element whose values were set, not just changed through addition and deletion.
            if (next.hasBeenSet) {
                break;
            }
        }
        return result;
    }
    get title() {
        return this._title;
    }
    constructor(elements = []) {
        this._onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this._onDidChangeEmitter.event;
        this._onDidChangeContentsEmitter = new core_1.Emitter();
        this.onDidChangeContents = this._onDidChangeContentsEmitter.event;
        this.hasBeenSet = false;
        this._elements = new Map();
        this._title = 'Suggested Changes';
        this.addElements(...elements);
    }
    getElements() {
        return core_1.ArrayUtils.coalesce(Array.from(this._elements.values()));
    }
    /** Will replace any element that is already present, using URI as identity criterion. */
    addElements(...elements) {
        const added = [];
        const modified = [];
        elements.forEach(element => {
            if (this.doAdd(element)) {
                modified.push(element.uri);
            }
            else {
                added.push(element.uri);
            }
        });
        this.notifyChange({ added, modified });
        return !!(added.length || modified.length);
    }
    setTitle(title) {
        this._title = title;
        this.notifyChange({ title });
    }
    doAdd(element) {
        var _a, _b;
        const id = element.uri.toString();
        const existing = this._elements.get(id);
        (_a = existing === null || existing === void 0 ? void 0 : existing.dispose) === null || _a === void 0 ? void 0 : _a.call(existing);
        this._elements.set(id, element);
        (_b = element.onDidChange) === null || _b === void 0 ? void 0 : _b.call(element, () => this.notifyChange({ state: [element.uri] }));
        return !!existing;
    }
    setElements(...elements) {
        this.hasBeenSet = true;
        const added = [];
        const modified = [];
        const removed = [];
        const toHandle = new Set(this._elements.keys());
        for (const element of elements) {
            toHandle.delete(element.uri.toString());
            if (this.doAdd(element)) {
                added.push(element.uri);
            }
            else {
                modified.push(element.uri);
            }
        }
        for (const toDelete of toHandle) {
            const uri = new core_1.URI(toDelete);
            if (this.doDelete(uri)) {
                removed.push(uri);
            }
        }
        this.notifyChange({ added, modified, removed });
    }
    removeElements(...uris) {
        const removed = [];
        for (const uri of uris) {
            if (this.doDelete(uri)) {
                removed.push(uri);
            }
        }
        this.notifyChange({ removed });
        return !!removed.length;
    }
    getElementByURI(uri) {
        return this._elements.get(uri.toString());
    }
    doDelete(uri) {
        var _a;
        const id = uri.toString();
        const delendum = this._elements.get(id);
        if (delendum) {
            (_a = delendum.dispose) === null || _a === void 0 ? void 0 : _a.call(delendum);
        }
        this._elements.set(id, undefined);
        return !!delendum;
    }
    notifyChange(change) {
        this._onDidChangeContentsEmitter.fire(change);
        this._onDidChangeEmitter.fire({ kind: 'updateChangeSet', elements: this.getElements(), title: this.title });
    }
    dispose() {
        this._onDidChangeEmitter.dispose();
        this._elements.forEach(element => { var _a; return (_a = element === null || element === void 0 ? void 0 : element.dispose) === null || _a === void 0 ? void 0 : _a.call(element); });
    }
}
exports.ChangeSetImpl = ChangeSetImpl;
//# sourceMappingURL=change-set.js.map