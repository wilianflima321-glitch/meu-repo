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
exports.TheiaNotificationOverlay = void 0;
const theia_page_object_1 = require("./theia-page-object");
class TheiaNotificationOverlay extends theia_page_object_1.TheiaPageObject {
    constructor(app, notificationIndicator) {
        super(app);
        this.notificationIndicator = notificationIndicator;
        this.HEADER_NOTIFICATIONS = 'NOTIFICATIONS';
        this.HEADER_NO_NOTIFICATIONS = 'NO NEW NOTIFICATIONS';
    }
    get selector() {
        return '.theia-notifications-overlay';
    }
    get containerSelector() {
        return `${this.selector} .theia-notifications-container.theia-notification-center`;
    }
    get titleSelector() {
        return `${this.containerSelector} .theia-notification-center-header-title`;
    }
    async isVisible() {
        const element = await this.page.$(`${this.containerSelector}.open`);
        return element ? element.isVisible() : false;
    }
    async waitForVisible() {
        await this.page.waitForSelector(`${this.containerSelector}.open`);
    }
    async activate() {
        if (!await this.isVisible()) {
            await this.notificationIndicator.toggleOverlay();
        }
        await this.waitForVisible();
    }
    async toggle() {
        await this.app.quickCommandPalette.type('Toggle Notifications');
        await this.app.quickCommandPalette.trigger('Notifications: Toggle Notifications');
    }
    entrySelector(entryText) {
        return `${this.containerSelector} .theia-notification-message span:has-text("${entryText}")`;
    }
    async waitForEntry(entryText) {
        await this.activate();
        await this.page.waitForSelector(this.entrySelector(entryText));
    }
    async waitForEntryDetached(entryText) {
        await this.activate();
        await this.page.waitForSelector(this.entrySelector(entryText), { state: 'detached' });
    }
    async isEntryVisible(entryText) {
        await this.activate();
        const element = await this.page.$(this.entrySelector(entryText));
        return !!element && element.isVisible();
    }
    get clearAllButtonSelector() {
        return this.selector + ' .theia-notification-center-header ul > li.codicon.codicon-clear-all';
    }
    async clearAllNotifications() {
        await this.activate();
        const element = await this.page.waitForSelector(this.clearAllButtonSelector);
        await element.click();
        await this.notificationIndicator.waitForVisible(false /* expectNotifications */);
    }
}
exports.TheiaNotificationOverlay = TheiaNotificationOverlay;
//# sourceMappingURL=theia-notification-overlay.js.map