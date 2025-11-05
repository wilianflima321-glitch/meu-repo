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
exports.WindowBlinkService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
/**
 * Service for blinking/flashing the application window to get user attention.
 */
let WindowBlinkService = class WindowBlinkService {
    constructor() {
        this.isElectron = core_1.environment.electron.is();
    }
    /**
     * Blink/flash the window to get user attention.
     * The implementation varies depending on the platform and environment.
     *
     * @param agentName Optional name of the agent to include in the blink notification
     */
    async blinkWindow(agentName) {
        try {
            if (this.isElectron) {
                await this.blinkElectronWindow(agentName);
            }
            else {
                await this.blinkBrowserWindow(agentName);
            }
            return { success: true };
        }
        catch (error) {
            console.warn('Failed to blink window:', error);
            try {
                if (document.hidden) {
                    this.focusWindow();
                }
                return { success: true };
            }
            catch (fallbackError) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to blink window'
                };
            }
        }
    }
    async blinkElectronWindow(agentName) {
        await this.blinkDocumentTitle(agentName);
        if (document.hidden) {
            try {
                const theiaCoreAPI = window.electronTheiaCore;
                if (theiaCoreAPI === null || theiaCoreAPI === void 0 ? void 0 : theiaCoreAPI.focusWindow) {
                    theiaCoreAPI.focusWindow();
                }
                else {
                    window.focus();
                }
            }
            catch (error) {
                console.debug('Could not focus hidden window:', error);
            }
        }
    }
    async blinkBrowserWindow(agentName) {
        await this.blinkDocumentTitle(agentName);
        this.blinkWithVisibilityAPI();
        if (document.hidden) {
            this.focusWindow();
        }
    }
    async blinkDocumentTitle(agentName) {
        const originalTitle = document.title;
        const alertTitle = agentName
            ? `🔔 Theia - Agent "${agentName}" Completed`
            : '🔔 Theia - Agent Completed';
        let blinkCount = 0;
        const maxBlinks = 6;
        const blinkInterval = setInterval(() => {
            if (blinkCount >= maxBlinks) {
                clearInterval(blinkInterval);
                document.title = originalTitle;
                return;
            }
            document.title = blinkCount % 2 === 0 ? alertTitle : originalTitle;
            blinkCount++;
        }, 500);
    }
    blinkWithVisibilityAPI() {
        // This method provides visual attention-getting behavior without creating notifications
        // as notifications are handled by the OSNotificationService to avoid duplicates
        if (!this.isElectron && typeof document.hidden !== 'undefined') {
            // Focus the window if it's hidden to get user attention
            if (document.hidden) {
                this.focusWindow();
            }
        }
    }
    focusWindow() {
        try {
            window.focus();
            // Try to scroll to top to create some visual movement
            if (document.body.scrollTop > 0 || document.documentElement.scrollTop > 0) {
                const currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
                window.scrollTo(0, 0);
                setTimeout(() => {
                    window.scrollTo(0, currentScroll);
                }, 100);
            }
        }
        catch (error) {
            console.debug('Could not focus window:', error);
        }
    }
    /**
     * Check if window blinking is supported in the current environment.
     */
    isBlinkSupported() {
        if (this.isElectron) {
            const theiaCoreAPI = window.electronTheiaCore;
            return !!(theiaCoreAPI === null || theiaCoreAPI === void 0 ? void 0 : theiaCoreAPI.focusWindow);
        }
        // In browser, we can always provide some form of attention-getting behavior
        return true;
    }
    /**
     * Get information about the blinking capabilities.
     */
    getBlinkCapabilities() {
        const features = [];
        let method = 'none';
        if (this.isElectron) {
            method = 'electron';
            const theiaCoreAPI = window.electronTheiaCore;
            if (theiaCoreAPI === null || theiaCoreAPI === void 0 ? void 0 : theiaCoreAPI.focusWindow) {
                features.push('electronTheiaCore.focusWindow');
                features.push('document.title blinking');
                features.push('window.focus');
            }
        }
        else {
            method = 'browser';
            features.push('document.title');
            features.push('window.focus');
            if (typeof document.hidden !== 'undefined') {
                features.push('Page Visibility API');
            }
        }
        return {
            supported: features.length > 0,
            method,
            features
        };
    }
};
exports.WindowBlinkService = WindowBlinkService;
exports.WindowBlinkService = WindowBlinkService = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], WindowBlinkService);
//# sourceMappingURL=window-blink-service.js.map