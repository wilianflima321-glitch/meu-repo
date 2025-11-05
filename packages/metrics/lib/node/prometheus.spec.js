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
const chai = require("chai");
const prometheus_1 = require("./prometheus");
const expect = chai.expect;
describe('Prometheus helper module', () => {
    /* According to https://prometheus.io/docs/concepts/data_model/ */
    const validName = 'theia_extension3242-:';
    const invalidTheiaName = '@theia/something';
    const validTheiaName = 'theia_something';
    const invalidName2 = '@theia/?$%^ ';
    it('Should correctly validate a metric name', () => {
        expect(prometheus_1.PROMETHEUS_REGEXP.test(validName)).to.be.true;
        expect(prometheus_1.PROMETHEUS_REGEXP.test(invalidTheiaName)).to.be.false;
        expect(prometheus_1.PROMETHEUS_REGEXP.test(invalidName2)).to.be.false;
    });
    it('Should correctly return a valid name from an otherwise invalid prometheus string', () => {
        expect(prometheus_1.PROMETHEUS_REGEXP.test(invalidTheiaName)).to.be.false;
        const newName = (0, prometheus_1.toPrometheusValidName)(invalidTheiaName);
        expect(prometheus_1.PROMETHEUS_REGEXP.test(newName)).to.be.true;
        expect(newName).to.be.equal(validTheiaName);
        const newName2 = (0, prometheus_1.toPrometheusValidName)(invalidName2);
        expect(prometheus_1.PROMETHEUS_REGEXP.test(newName2)).to.be.true;
    });
});
//# sourceMappingURL=prometheus.spec.js.map