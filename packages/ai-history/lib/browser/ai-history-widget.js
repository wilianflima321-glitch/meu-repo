"use strict";
var AIHistoryView_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIHistoryView = void 0;
const tslib_1 = require("tslib");
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
const ai_core_1 = require("@theia/ai-core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const ai_history_exchange_card_1 = require("./ai-history-exchange-card");
const select_component_1 = require("@theia/core/lib/browser/widgets/select-component");
const core_1 = require("@theia/core");
let AIHistoryView = AIHistoryView_1 = class AIHistoryView extends browser_1.ReactWidget {
    constructor() {
        super();
        this._state = { chronological: false, compactView: true, renderNewlines: true };
        this.id = AIHistoryView_1.ID;
        this.title.label = AIHistoryView_1.LABEL;
        this.title.caption = AIHistoryView_1.LABEL;
        this.title.closable = true;
        this.title.iconClass = (0, browser_1.codicon)('history');
    }
    get state() {
        return this._state;
    }
    set state(state) {
        this._state = state;
        this.update();
    }
    storeState() {
        return this.state;
    }
    restoreState(oldState) {
        const copy = (0, core_1.deepClone)(this.state);
        if (oldState.chronological !== undefined) {
            copy.chronological = oldState.chronological;
        }
        if (oldState.compactView !== undefined) {
            copy.compactView = oldState.compactView;
        }
        if (oldState.renderNewlines !== undefined) {
            copy.renderNewlines = oldState.renderNewlines;
        }
        this.state = copy;
    }
    init() {
        this.update();
        this.toDispose.push(this.languageModelService.onSessionChanged((event) => this.historyContentUpdated(event)));
        this.selectAgent(this.agentService.getAllAgents()[0]);
    }
    selectAgent(agent) {
        this.state = { ...this.state, selectedAgentId: agent === null || agent === void 0 ? void 0 : agent.id };
    }
    historyContentUpdated(event) {
        this.update();
    }
    render() {
        const selectionChange = (value) => {
            this.selectAgent(this.agentService.getAllAgents().find(agent => agent.id === value.value));
        };
        const agents = this.agentService.getAllAgents();
        if (agents.length === 0) {
            return (React.createElement("div", { className: 'agent-history-widget' },
                React.createElement("div", { className: 'theia-card no-content' }, core_1.nls.localize('theia/ai/history/view/noAgent', 'No agent available.'))));
        }
        return (React.createElement("div", { className: 'agent-history-widget' },
            React.createElement(select_component_1.SelectComponent, { options: agents.map(agent => ({
                    value: agent.id,
                    label: agent.name,
                    description: agent.description || ''
                })), onChange: selectionChange, defaultValue: this.state.selectedAgentId }),
            React.createElement("div", { className: 'agent-history' }, this.renderHistory())));
    }
    renderHistory() {
        if (!this.state.selectedAgentId) {
            return React.createElement("div", { className: 'theia-card no-content' }, core_1.nls.localize('theia/ai/history/view/noAgentSelected', 'No agent selected.'));
        }
        const exchanges = this.getExchangesByAgent(this.state.selectedAgentId);
        if (exchanges.length === 0) {
            const selectedAgent = this.agentService.getAllAgents().find(agent => agent.id === this.state.selectedAgentId);
            return React.createElement("div", { className: 'theia-card no-content' }, core_1.nls.localize('theia/ai/history/view/noHistoryForAgent', 'No history available for the selected agent \'{0}\'', (selectedAgent === null || selectedAgent === void 0 ? void 0 : selectedAgent.name) || this.state.selectedAgentId));
        }
        // Sort exchanges by timestamp (using the first sub-request's timestamp)
        const sortedExchanges = [...exchanges].sort((a, b) => {
            var _a, _b;
            const aTimestamp = ((_a = a.requests[0]) === null || _a === void 0 ? void 0 : _a.metadata.timestamp) || 0;
            const bTimestamp = ((_b = b.requests[0]) === null || _b === void 0 ? void 0 : _b.metadata.timestamp) || 0;
            return this.state.chronological ? aTimestamp - bTimestamp : bTimestamp - aTimestamp;
        });
        return sortedExchanges.map(exchange => (React.createElement(ai_history_exchange_card_1.ExchangeCard, { key: exchange.id, exchange: exchange, selectedAgentId: this.state.selectedAgentId, compactView: this.state.compactView, renderNewlines: this.state.renderNewlines })));
    }
    /**
     * Get all exchanges for a specific agent.
     * Includes all exchanges in which the agent is involved, either as the main exchange or as a sub-request.
     * @param agentId The agent ID to filter by
     */
    getExchangesByAgent(agentId) {
        return this.languageModelService.sessions.flatMap(session => session.exchanges.filter(exchange => exchange.metadata.agent === agentId ||
            exchange.requests.some(request => request.metadata.agent === agentId)));
    }
    sortHistory(chronological) {
        this.state = { ...(0, core_1.deepClone)(this.state), chronological: chronological };
    }
    toggleCompactView() {
        this.state = { ...(0, core_1.deepClone)(this.state), compactView: !this.state.compactView };
    }
    toggleRenderNewlines() {
        this.state = { ...(0, core_1.deepClone)(this.state), renderNewlines: !this.state.renderNewlines };
    }
    get isChronological() {
        return this.state.chronological === true;
    }
    get isCompactView() {
        return this.state.compactView === true;
    }
    get isRenderNewlines() {
        return this.state.renderNewlines === true;
    }
};
exports.AIHistoryView = AIHistoryView;
AIHistoryView.ID = 'ai-history-widget';
AIHistoryView.LABEL = core_1.nls.localize('theia/ai/history/view/label', 'AI Agent History [Beta]');
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelService),
    tslib_1.__metadata("design:type", Object)
], AIHistoryView.prototype, "languageModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], AIHistoryView.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIHistoryView.prototype, "init", null);
exports.AIHistoryView = AIHistoryView = AIHistoryView_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], AIHistoryView);
//# sourceMappingURL=ai-history-widget.js.map