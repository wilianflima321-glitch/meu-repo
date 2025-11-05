"use strict";
var MemoryDockpanelPlaceholder_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDockpanelPlaceholder = void 0;
const tslib_1 = require("tslib");
/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
let MemoryDockpanelPlaceholder = MemoryDockpanelPlaceholder_1 = class MemoryDockpanelPlaceholder extends browser_1.ReactWidget {
    init() {
        this.id = MemoryDockpanelPlaceholder_1.ID;
        this.addClass(MemoryDockpanelPlaceholder_1.ID);
        this.update();
    }
    render() {
        return (React.createElement("div", { className: 't-mv-memory-fetch-error' },
            "Click the ",
            React.createElement("i", { className: 'memory-view-icon toolbar' }),
            " icon to add a new memory view or the ",
            React.createElement("i", { className: 'register-view-icon toolbar' }),
            " icon to add a register view."));
    }
};
exports.MemoryDockpanelPlaceholder = MemoryDockpanelPlaceholder;
MemoryDockpanelPlaceholder.ID = 'memory-dockpanel-placeholder';
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryDockpanelPlaceholder.prototype, "init", null);
exports.MemoryDockpanelPlaceholder = MemoryDockpanelPlaceholder = MemoryDockpanelPlaceholder_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryDockpanelPlaceholder);
//# sourceMappingURL=memory-dockpanel-placeholder-widget.js.map