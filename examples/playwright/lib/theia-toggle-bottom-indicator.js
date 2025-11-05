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
exports.TheiaToggleBottomIndicator = void 0;
const theia_status_indicator_1 = require("./theia-status-indicator");
class TheiaToggleBottomIndicator extends theia_status_indicator_1.TheiaStatusIndicator {
    constructor() {
        super(...arguments);
        this.id = 'bottom-panel-toggle';
    }
}
exports.TheiaToggleBottomIndicator = TheiaToggleBottomIndicator;
//# sourceMappingURL=theia-toggle-bottom-indicator.js.map