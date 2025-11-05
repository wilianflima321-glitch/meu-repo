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
exports.TheiaMenuItem = void 0;
const util_1 = require("./util");
class TheiaMenuItem {
    constructor(element) {
        this.element = element;
    }
    labelElementHandle() {
        return this.element.waitForSelector('.lm-Menu-itemLabel');
    }
    shortCutElementHandle() {
        return this.element.waitForSelector('.lm-Menu-itemShortcut');
    }
    isHidden() {
        return (0, util_1.elementContainsClass)(this.element, 'lm-mod-collapsed');
    }
    async label() {
        if (await this.isHidden()) {
            return undefined;
        }
        return (0, util_1.textContent)(this.labelElementHandle());
    }
    async shortCut() {
        if (await this.isHidden()) {
            return undefined;
        }
        return (0, util_1.textContent)(this.shortCutElementHandle());
    }
    async hasSubmenu() {
        if (await this.isHidden()) {
            return false;
        }
        return (await this.element.getAttribute('data-type')) === 'submenu';
    }
    async isEnabled() {
        const classAttribute = (await this.element.getAttribute('class'));
        if (classAttribute === undefined || classAttribute === null) {
            return false;
        }
        return !classAttribute.includes('lm-mod-disabled') && !classAttribute.includes('lm-mod-collapsed');
    }
    async click() {
        return this.element.waitForSelector('.lm-Menu-itemLabel')
            .then(labelElement => labelElement.click({ position: { x: 10, y: 10 } }));
    }
    async hover() {
        return this.element.hover();
    }
}
exports.TheiaMenuItem = TheiaMenuItem;
//# sourceMappingURL=theia-menu-item.js.map