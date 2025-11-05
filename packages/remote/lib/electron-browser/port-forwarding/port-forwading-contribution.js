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
exports.PortForwardingContribution = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const port_forwarding_widget_1 = require("./port-forwarding-widget");
let PortForwardingContribution = class PortForwardingContribution extends browser_1.AbstractViewContribution {
    constructor() {
        super({
            widgetId: port_forwarding_widget_1.PORT_FORWARDING_WIDGET_ID,
            widgetName: core_1.nls.localizeByDefault('Ports'),
            defaultWidgetOptions: {
                area: 'bottom'
            }
        });
    }
};
exports.PortForwardingContribution = PortForwardingContribution;
exports.PortForwardingContribution = PortForwardingContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], PortForwardingContribution);
//# sourceMappingURL=port-forwading-contribution.js.map