"use strict";
// *****************************************************************************
// Copyright (C) 2018 Ericsson and others.
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
exports.NodeMetricsContribution = void 0;
const tslib_1 = require("tslib");
const prom = require("prom-client");
const inversify_1 = require("@theia/core/shared/inversify");
let NodeMetricsContribution = class NodeMetricsContribution {
    getMetrics() {
        return prom.register.metrics().toString();
    }
    startCollecting() {
        const collectDefaultMetrics = prom.collectDefaultMetrics;
        // Probe every 5th second.
        collectDefaultMetrics({ timeout: 5000 });
    }
};
exports.NodeMetricsContribution = NodeMetricsContribution;
exports.NodeMetricsContribution = NodeMetricsContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], NodeMetricsContribution);
//# sourceMappingURL=node-metrics-contribution.js.map