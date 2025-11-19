"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIConfigurationSelectionService = void 0;
const core_1 = require("@theia/core");
// Minimal runtime stub used during type-checking and initial compilation.
// This mirrors the shape used by ai-ide code; full implementation lives upstream.
class AIConfigurationSelectionService {
    constructor() {
        this.onDidSelectConfigurationEmitter = new core_1.Emitter();
        this.onDidSelectConfiguration = this.onDidSelectConfigurationEmitter.event;
        this.onDidAgentChangeEmitter = new core_1.Emitter();
        this.onDidAgentChange = this.onDidAgentChangeEmitter.event;
        this.onDidAliasChangeEmitter = new core_1.Emitter();
        this.onDidAliasChange = this.onDidAliasChangeEmitter.event;
    }
    getActiveAgent() { return this.activeAgent; }
    setActiveAgent(agent) { this.activeAgent = agent; this.onDidAgentChangeEmitter.fire(agent); }
    getSelectedAliasId() { return this.selectedAliasId; }
    setSelectedAliasId(aliasId) { this.selectedAliasId = aliasId; this.onDidAliasChangeEmitter.fire(aliasId); }
    selectConfigurationTab(widgetId) {
        this.onDidSelectConfigurationEmitter.fire(widgetId);
    }
}
exports.AIConfigurationSelectionService = AIConfigurationSelectionService;
