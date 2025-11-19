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
var AITokenUsageConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITokenUsageConfigurationWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const core_1 = require("@theia/core");
const token_usage_frontend_service_1 = require("@theia/ai-core/lib/browser/token-usage-frontend-service");
const date_fns_1 = require("date-fns");
// Using the interface from the token usage service
let AITokenUsageConfigurationWidget = class AITokenUsageConfigurationWidget extends browser_1.ReactWidget {
    static { AITokenUsageConfigurationWidget_1 = this; }
    static ID = 'ai-token-usage-configuration-container-widget';
    static LABEL = core_1.nls.localize('theia/ai/tokenUsage/label', 'Token Usage');
    // Data will be fetched from the service
    tokenUsageData = [];
    messageService;
    tokenUsageService;
    init() {
        this.id = AITokenUsageConfigurationWidget_1.ID;
        this.title.label = AITokenUsageConfigurationWidget_1.LABEL;
        this.title.closable = false;
        this.refreshData();
        this.tokenUsageService.onTokenUsageUpdated(data => {
            this.tokenUsageData = data;
            this.update();
        });
    }
    async refreshData() {
        try {
            this.tokenUsageData = await this.tokenUsageService.getTokenUsageData();
            this.update();
        }
        catch (error) {
            this.messageService.error(`Failed to fetch token usage data: ${error}`);
        }
    }
    formatNumber(num) {
        return num.toLocaleString();
    }
    formatDate(date) {
        if (!date) {
            return core_1.nls.localize('theia/ai/tokenUsage/never', 'Never');
        }
        return (0, date_fns_1.formatDistanceToNow)(date, { addSuffix: true });
    }
    hasCacheData() {
        return this.tokenUsageData.some(model => model.cachedInputTokens !== undefined ||
            model.readCachedInputTokens !== undefined);
    }
    renderHeaderRow() {
        const showCacheColumns = this.hasCacheData();
        return (React.createElement("tr", { className: "token-usage-header" },
            React.createElement("th", { className: "token-usage-model-column" }, core_1.nls.localize('theia/ai/tokenUsage/model', 'Model')),
            React.createElement("th", { className: "token-usage-column" }, core_1.nls.localize('theia/ai/tokenUsage/inputTokens', 'Input Tokens')),
            showCacheColumns && (React.createElement(React.Fragment, null,
                React.createElement("th", { className: "token-usage-column", title: core_1.nls.localize('theia/ai/tokenUsage/cachedInputTokensTooltip', "Tracked additionally to 'Input Tokens'. Usually more expensive than non-cached tokens.") }, core_1.nls.localize('theia/ai/tokenUsage/cachedInputTokens', 'Input Tokens Written to Cache')),
                React.createElement("th", { className: "token-usage-column", title: core_1.nls.localize('theia/ai/tokenUsage/readCachedInputTokensTooltip', "Tracked additionally to 'Input Token'. Usually much less expensive than not cached. Usually does not count to rate limits.") }, core_1.nls.localize('theia/ai/tokenUsage/readCachedInputTokens', 'Input Tokens Read From Cache')))),
            React.createElement("th", { className: "token-usage-column" }, core_1.nls.localize('theia/ai/tokenUsage/outputTokens', 'Output Tokens')),
            React.createElement("th", { className: "token-usage-column", title: core_1.nls.localize('theia/ai/tokenUsage/totalTokensTooltip', "'Input Tokens' + 'Output Tokens'") }, core_1.nls.localize('theia/ai/tokenUsage/totalTokens', 'Total Tokens')),
            React.createElement("th", { className: "token-usage-column" }, core_1.nls.localize('theia/ai/tokenUsage/lastUsed', 'Last Used'))));
    }
    renderModelRow(model) {
        const lastUsedDate = model.lastUsed ? new Date(model.lastUsed) : undefined;
        const exactDateString = lastUsedDate ? lastUsedDate.toLocaleString() : '';
        const showCacheColumns = this.hasCacheData();
        const totalTokens = model.inputTokens + model.outputTokens + (model.cachedInputTokens ?? 0);
        return (React.createElement("tr", { key: model.modelId, className: "token-usage-row" },
            React.createElement("td", { className: "token-usage-model-cell" }, model.modelId),
            React.createElement("td", { className: "token-usage-cell" }, this.formatNumber(model.inputTokens)),
            showCacheColumns && (React.createElement(React.Fragment, null,
                React.createElement("td", { className: "token-usage-cell" }, model.cachedInputTokens !== undefined ? this.formatNumber(model.cachedInputTokens) : '-'),
                React.createElement("td", { className: "token-usage-cell" }, model.readCachedInputTokens !== undefined ? this.formatNumber(model.readCachedInputTokens) : '-'))),
            React.createElement("td", { className: "token-usage-cell" }, this.formatNumber(model.outputTokens)),
            React.createElement("td", { className: "token-usage-cell" }, this.formatNumber(totalTokens)),
            React.createElement("td", { className: "token-usage-cell", title: exactDateString }, this.formatDate(lastUsedDate))));
    }
    renderSummaryRow() {
        // Only show summary row if there is data
        if (this.tokenUsageData.length === 0) {
            return undefined;
        }
        const totalInputTokens = this.tokenUsageData.reduce((sum, model) => sum + model.inputTokens, 0);
        const totalOutputTokens = this.tokenUsageData.reduce((sum, model) => sum + model.outputTokens, 0);
        const totalCachedInputTokens = this.tokenUsageData.reduce((sum, model) => sum + (model.cachedInputTokens || 0), 0);
        const totalReadCachedInputTokens = this.tokenUsageData.reduce((sum, model) => sum + (model.readCachedInputTokens || 0), 0);
        const totalTokens = totalInputTokens + totalCachedInputTokens + totalOutputTokens;
        const showCacheColumns = this.hasCacheData();
        return (React.createElement("tr", { className: "token-usage-summary-row" },
            React.createElement("td", { className: "token-usage-model-cell" },
                React.createElement("strong", null, core_1.nls.localize('theia/ai/tokenUsage/total', 'Total'))),
            React.createElement("td", { className: "token-usage-cell" },
                React.createElement("strong", null, this.formatNumber(totalInputTokens))),
            showCacheColumns && (React.createElement(React.Fragment, null,
                React.createElement("td", { className: "token-usage-cell" },
                    React.createElement("strong", null, this.formatNumber(totalCachedInputTokens))),
                React.createElement("td", { className: "token-usage-cell" },
                    React.createElement("strong", null, this.formatNumber(totalReadCachedInputTokens))))),
            React.createElement("td", { className: "token-usage-cell" },
                React.createElement("strong", null, this.formatNumber(totalOutputTokens))),
            React.createElement("td", { className: "token-usage-cell" },
                React.createElement("strong", null, this.formatNumber(totalTokens))),
            React.createElement("td", { className: "token-usage-cell" })));
    }
    render() {
        return (React.createElement("div", { className: "token-usage-configuration-container" },
            React.createElement("h2", { className: "token-usage-configuration-title" }, core_1.nls.localize('theia/ai/tokenUsage/title', 'AI Model Token Usage')),
            React.createElement("div", { className: "token-usage-table-container" }, this.tokenUsageData.length > 0 ? (React.createElement("table", { className: "token-usage-table" },
                React.createElement("thead", null, this.renderHeaderRow()),
                React.createElement("tbody", null,
                    this.tokenUsageData.map(model => this.renderModelRow(model)),
                    this.renderSummaryRow()))) : (React.createElement("div", { className: "token-usage-empty" },
                React.createElement("p", null, core_1.nls.localize('theia/ai/tokenUsage/noData', 'No token usage data available yet.'))))),
            React.createElement("div", { className: "token-usage-notes" },
                React.createElement("p", { className: "token-usage-note" },
                    React.createElement("i", { className: "codicon codicon-info" }),
                    core_1.nls.localize('theia/ai/tokenUsage/note', 'Token usage is tracked since the start of the application and is not persisted.')))));
    }
};
exports.AITokenUsageConfigurationWidget = AITokenUsageConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", Object)
], AITokenUsageConfigurationWidget.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(token_usage_frontend_service_1.TokenUsageFrontendService),
    tslib_1.__metadata("design:type", Object)
], AITokenUsageConfigurationWidget.prototype, "tokenUsageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AITokenUsageConfigurationWidget.prototype, "init", null);
exports.AITokenUsageConfigurationWidget = AITokenUsageConfigurationWidget = AITokenUsageConfigurationWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AITokenUsageConfigurationWidget);
//# sourceMappingURL=token-usage-configuration-widget.js.map