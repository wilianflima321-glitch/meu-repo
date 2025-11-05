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
exports.TheiaDialog = void 0;
const theia_page_object_1 = require("./theia-page-object");
class TheiaDialog extends theia_page_object_1.TheiaPageObject {
    constructor() {
        super(...arguments);
        this.overlaySelector = '#theia-dialog-shell';
        this.blockSelector = this.overlaySelector + ' .dialogBlock';
        this.titleBarSelector = this.blockSelector + ' .dialogTitle';
        this.titleSelector = this.titleBarSelector + ' > div';
        this.contentSelector = this.blockSelector + ' .dialogContent > div';
        this.controlSelector = this.blockSelector + ' .dialogControl';
        this.errorSelector = this.blockSelector + ' .dialogContent';
    }
    async waitForVisible() {
        await this.page.waitForSelector(`${this.blockSelector}`, { state: 'visible' });
    }
    async waitForClosed() {
        await this.page.waitForSelector(`${this.blockSelector}`, { state: 'detached' });
    }
    async isVisible() {
        const pouDialogElement = await this.page.$(this.blockSelector);
        return pouDialogElement ? pouDialogElement.isVisible() : false;
    }
    async title() {
        const titleElement = await this.page.waitForSelector(`${this.titleSelector}`);
        return titleElement.textContent();
    }
    async waitUntilTitleIsDisplayed(title) {
        await this.page.waitForFunction(predicate => {
            const element = document.querySelector(predicate.titleSelector);
            return !!element && element.textContent === predicate.expectedTitle;
        }, { titleSelector: this.titleSelector, expectedTitle: title });
    }
    async contentElement() {
        return this.page.waitForSelector(this.contentSelector);
    }
    async buttonElement(label) {
        return this.page.waitForSelector(`${this.controlSelector} button:has-text("${label}")`);
    }
    async buttonElementByClass(buttonClass) {
        return this.page.waitForSelector(`${this.controlSelector} button${buttonClass}`);
    }
    async validationElement() {
        return this.page.waitForSelector(`${this.errorSelector} div.error`, { state: 'attached' });
    }
    async getValidationText() {
        const element = await this.validationElement();
        return element.textContent();
    }
    async validationResult() {
        const validationText = await this.getValidationText();
        return validationText !== '' ? false : true;
    }
    async close() {
        const closeButton = await this.page.waitForSelector(`${this.titleBarSelector} i.closeButton`);
        await closeButton.click();
        await this.waitForClosed();
    }
    async clickButton(buttonLabel) {
        const buttonElement = await this.buttonElement(buttonLabel);
        await buttonElement.click();
    }
    async isButtonDisabled(buttonLabel) {
        const buttonElement = await this.buttonElement(buttonLabel);
        return buttonElement.isDisabled();
    }
    async clickMainButton() {
        const buttonElement = await this.buttonElementByClass('.theia-button.main');
        await buttonElement.click();
    }
    async clickSecondaryButton() {
        const buttonElement = await this.buttonElementByClass('.theia-button.secondary');
        await buttonElement.click();
    }
    async waitUntilMainButtonIsEnabled() {
        await this.page.waitForFunction(predicate => {
            const button = document.querySelector(predicate.buttonSelector);
            return !!button && !button.disabled;
        }, { buttonSelector: `${this.controlSelector} > button.theia-button.main` });
    }
}
exports.TheiaDialog = TheiaDialog;
//# sourceMappingURL=theia-dialog.js.map