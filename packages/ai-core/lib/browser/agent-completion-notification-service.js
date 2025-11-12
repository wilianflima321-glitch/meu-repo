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
exports.AgentCompletionNotificationService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const message_service_1 = require("@theia/core/lib/common/message-service");
const application_shell_1 = require("@theia/core/lib/browser/shell/application-shell");
const nls_1 = require("@theia/core/lib/common/nls");
const ai_core_preferences_1 = require("../common/ai-core-preferences");
const agent_service_1 = require("../common/agent-service");
const settings_service_1 = require("../common/settings-service");
const os_notification_service_1 = require("./os-notification-service");
const window_blink_service_1 = require("./window-blink-service");
const notification_types_1 = require("../common/notification-types");
const core_1 = require("@theia/core");
let AgentCompletionNotificationService = class AgentCompletionNotificationService {
    /**
     * Show a completion notification for the specified agent if enabled in preferences.
     *
     * @param agentId The unique identifier of the agent
     * @param taskDescription Optional description of the completed task
     */
    async showCompletionNotification(agentId, taskDescription) {
        const notificationType = await this.getNotificationTypeForAgent(agentId);
        if (notificationType === notification_types_1.NOTIFICATION_TYPE_OFF || this.isChatWidgetFocused()) {
            return;
        }
        try {
            const agentName = this.resolveAgentName(agentId);
            await this.executeNotificationType(agentName, taskDescription, notificationType);
        }
        catch (error) {
            console.error('Failed to show agent completion notification:', error);
        }
    }
    /**
     * Resolve the display name for an agent by its ID.
     *
     * @param agentId The unique identifier of the agent
     * @returns The agent's display name or the agent ID if not found
     */
    resolveAgentName(agentId) {
        try {
            const agents = this.agentService.getAllAgents();
            const agent = agents.find(a => a.id === agentId);
            return (agent === null || agent === void 0 ? void 0 : agent.name) || agentId;
        }
        catch (error) {
            console.warn(`Failed to resolve agent name for ID '${agentId}':`, error);
            return agentId;
        }
    }
    /**
     * Get the preferred notification type for a specific agent.
     * If no agent-specific preference is set, returns the global default notification type.
     */
    async getNotificationTypeForAgent(agentId) {
        const agentSettings = await this.settingsService.getAgentSettings(agentId);
        const agentNotificationType = agentSettings === null || agentSettings === void 0 ? void 0 : agentSettings.completionNotification;
        // If agent has no specific setting, use the global default
        if (!agentNotificationType) {
            return this.preferenceService.get(ai_core_preferences_1.PREFERENCE_NAME_DEFAULT_NOTIFICATION_TYPE, notification_types_1.NOTIFICATION_TYPE_OFF);
        }
        return agentNotificationType;
    }
    /**
     * Execute the specified notification type.
     */
    async executeNotificationType(agentName, taskDescription, type) {
        switch (type) {
            case notification_types_1.NOTIFICATION_TYPE_OS_NOTIFICATION:
                await this.showOSNotification(agentName, taskDescription);
                break;
            case notification_types_1.NOTIFICATION_TYPE_MESSAGE:
                await this.showMessageServiceNotification(agentName, taskDescription);
                break;
            case notification_types_1.NOTIFICATION_TYPE_BLINK:
                await this.showBlinkNotification(agentName);
                break;
            default:
                throw new Error(`Unknown notification type: ${type}`);
        }
    }
    /**
     * Show OS notification directly.
     */
    async showOSNotification(agentName, taskDescription) {
        const result = await this.osNotificationService.showAgentCompletionNotification(agentName, taskDescription);
        if (!result.success) {
            throw new Error(`OS notification failed: ${result.error}`);
        }
    }
    /**
     * Show MessageService notification.
     */
    async showMessageServiceNotification(agentName, taskDescription) {
        const message = taskDescription
            ? nls_1.nls.localize('theia/ai-core/agentCompletionWithTask', 'Agent "{0}" has completed the task: {1}', agentName, taskDescription)
            : nls_1.nls.localize('theia/ai-core/agentCompletionMessage', 'Agent "{0}" has completed its task.', agentName);
        this.messageService.info(message);
    }
    /**
     * Show window blink notification.
     */
    async showBlinkNotification(agentName) {
        const result = await this.windowBlinkService.blinkWindow(agentName);
        if (!result.success) {
            throw new Error(`Window blink notification failed: ${result.error}`);
        }
    }
    /**
     * Check if OS notifications are supported and enabled.
     */
    isOSNotificationSupported() {
        return this.osNotificationService.isNotificationSupported();
    }
    /**
     * Get the current OS notification permission status.
     */
    getOSNotificationPermission() {
        return this.osNotificationService.getPermissionStatus();
    }
    /**
     * Request OS notification permission from the user.
     */
    async requestOSNotificationPermission() {
        return this.osNotificationService.requestPermission();
    }
    /**
     * Check if any chat widget currently has focus.
     */
    isChatWidgetFocused() {
        const activeWidget = this.shell.activeWidget;
        if (!activeWidget) {
            return false;
        }
        return activeWidget.id === 'chat-view-widget';
    }
};
exports.AgentCompletionNotificationService = AgentCompletionNotificationService;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], AgentCompletionNotificationService.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(agent_service_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], AgentCompletionNotificationService.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(settings_service_1.AISettingsService),
    tslib_1.__metadata("design:type", Object)
], AgentCompletionNotificationService.prototype, "settingsService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(os_notification_service_1.OSNotificationService),
    tslib_1.__metadata("design:type", os_notification_service_1.OSNotificationService)
], AgentCompletionNotificationService.prototype, "osNotificationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(message_service_1.MessageService),
    tslib_1.__metadata("design:type", message_service_1.MessageService)
], AgentCompletionNotificationService.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(window_blink_service_1.WindowBlinkService),
    tslib_1.__metadata("design:type", window_blink_service_1.WindowBlinkService)
], AgentCompletionNotificationService.prototype, "windowBlinkService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(application_shell_1.ApplicationShell),
    tslib_1.__metadata("design:type", application_shell_1.ApplicationShell)
], AgentCompletionNotificationService.prototype, "shell", void 0);
exports.AgentCompletionNotificationService = AgentCompletionNotificationService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AgentCompletionNotificationService);
//# sourceMappingURL=agent-completion-notification-service.js.map