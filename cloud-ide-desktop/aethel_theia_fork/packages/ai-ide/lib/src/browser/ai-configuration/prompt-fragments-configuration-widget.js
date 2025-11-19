"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AIPromptFragmentsConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIPromptFragmentsConfigurationWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
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
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const prompt_service_1 = require("@theia/ai-core/lib/common/prompt-service");
const React = __importStar(require("@theia/core/shared/react"));
const agent_service_1 = require("@theia/ai-core/lib/common/agent-service");
const frontend_prompt_customization_service_1 = require("@theia/ai-core/lib/browser/frontend-prompt-customization-service");
/**
 * Widget for configuring AI prompt fragments and prompt variant sets.
 * Allows users to view, create, edit, and manage various types of prompt
 * fragments including their customizations and variants.
 */
let AIPromptFragmentsConfigurationWidget = class AIPromptFragmentsConfigurationWidget extends browser_1.ReactWidget {
    constructor() {
        super(...arguments);
        /**
         * Stores all available prompt fragments by ID
         */
        this.promptFragmentMap = new Map();
        /**
         * Stores prompt variant sets and their variant IDs
         */
        this.promptVariantsMap = new Map();
        /**
         * Currently active prompt fragments
         */
        this.activePromptFragments = [];
        /**
         * Tracks expanded state of prompt fragment sections in the UI
         */
        this.expandedPromptFragmentIds = new Set();
        /**
         * Tracks expanded state of prompt content display
         */
        this.expandedPromptFragmentTemplates = new Set();
        /**
         * Tracks expanded state of prompt variant set sections
         */
        this.expandedPromptVariantSetIds = new Set();
        /**
         * All available agents that may use prompts
         */
        this.availableAgents = [];
        /**
         * Maps prompt variant set IDs to their resolved variant IDs
         */
        this.effectiveVariantIds = new Map();
        /**
         * Maps prompt variant set IDs to their default variant IDs
         */
        this.defaultVariantIds = new Map();
        /**
         * Maps prompt variant set IDs to their user selected variant IDs
         */
        this.userSelectedVariantIds = new Map();
        this.togglePromptVariantSetExpansion = (promptVariantSetId) => {
            if (this.expandedPromptVariantSetIds.has(promptVariantSetId)) {
                this.expandedPromptVariantSetIds.delete(promptVariantSetId);
            }
            else {
                this.expandedPromptVariantSetIds.add(promptVariantSetId);
            }
            this.update();
        };
        this.togglePromptFragmentExpansion = (promptFragmentId) => {
            if (this.expandedPromptFragmentIds.has(promptFragmentId)) {
                this.expandedPromptFragmentIds.delete(promptFragmentId);
            }
            else {
                this.expandedPromptFragmentIds.add(promptFragmentId);
            }
            this.update();
        };
        this.toggleTemplateExpansion = (fragmentKey, event) => {
            event.stopPropagation();
            if (this.expandedPromptFragmentTemplates.has(fragmentKey)) {
                this.expandedPromptFragmentTemplates.delete(fragmentKey);
            }
            else {
                this.expandedPromptFragmentTemplates.add(fragmentKey);
            }
            this.update();
        };
        /**
         * Call the edit action for the provided customized prompt fragment
         * @param promptFragment Fragment to edit
         * @param event Mouse event
         */
        this.editPromptCustomization = (promptFragment, event) => {
            event.stopPropagation();
            this.promptService.editCustomization(promptFragment.id, promptFragment.customizationId);
        };
        /**
         * Resets a prompt fragment to use a specific customization (with confirmation dialog)
         * @param customization customization to reset to
         * @param event Mouse event
         */
        this.resetToPromptFragment = async (customization, event) => {
            event.stopPropagation();
            if ((0, prompt_service_1.isCustomizedPromptFragment)(customization)) {
                // Get the customization type to show in the confirmation dialog
                const type = await this.promptService.getCustomizationType(customization.id, customization.customizationId);
                const dialog = new browser_1.ConfirmDialog({
                    title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToCustomizationDialogTitle', 'Reset to Customization'),
                    msg: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToCustomizationDialogMsg', 'Are you sure you want to reset the prompt fragment "{0}" to use the {1} customization? This will remove all higher-priority customizations.', customization.id, type),
                    ok: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetButton', 'Reset'),
                    cancel: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/cancelButton', 'Cancel')
                });
                const shouldReset = await dialog.open();
                if (shouldReset) {
                    await this.promptService.resetToCustomization(customization.id, customization.customizationId);
                }
            }
            else {
                const dialog = new browser_1.ConfirmDialog({
                    title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToBuiltInDialogTitle', 'Reset to Built-in'),
                    msg: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToBuiltInDialogMsg', 'Are you sure you want to reset the prompt fragment "{0}" to its built-in version? This will remove all customizations.', customization.id),
                    ok: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetButton', 'Reset'),
                    cancel: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/cancelButton', 'Cancel')
                });
                const shouldReset = await dialog.open();
                if (shouldReset) {
                    await this.promptService.resetToBuiltIn(customization.id);
                }
            }
        };
        /**
         * Creates a new customization for a built-in prompt fragment
         * @param promptFragment Built-in prompt fragment to customize
         * @param event Mouse event
         */
        this.createPromptFragmentCustomization = (promptFragment, event) => {
            event.stopPropagation();
            this.promptService.createBuiltInCustomization(promptFragment.id);
        };
        /**
         * Deletes a customization with confirmation dialog
         * @param customization Customized prompt fragment to delete
         * @param event Mouse event
         */
        this.deletePromptFragmentCustomization = async (customization, event) => {
            event.stopPropagation();
            // First get the customization type and description to show in the confirmation dialog
            const type = await this.promptService.getCustomizationType(customization.id, customization.customizationId) || '';
            const description = await this.promptService.getCustomizationDescription(customization.id, customization.customizationId) || '';
            const dialog = new browser_1.ConfirmDialog({
                title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/removeCustomizationDialogTitle', 'Remove Customization'),
                msg: description ?
                    core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/removeCustomizationWithDescDialogMsg', 'Are you sure you want to remove the {0} customization for prompt fragment "{1}" ({2})?', type, customization.id, description) :
                    core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/removeCustomizationDialogMsg', 'Are you sure you want to remove the {0} customization for prompt fragment "{1}"?', type, customization.id),
                ok: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/removeButton', 'Remove'),
                cancel: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/cancelButton', 'Cancel')
            });
            const shouldDelete = await dialog.open();
            if (shouldDelete) {
                await this.promptService.removeCustomization(customization.id, customization.customizationId);
            }
        };
        /**
         * Removes all prompt customizations (resets to built-in versions) with confirmation
         */
        this.removeAllCustomizations = async () => {
            const dialog = new browser_1.ConfirmDialog({
                title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetAllCustomizationsDialogTitle', 'Reset All Customizations'),
                msg: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetAllCustomizationsDialogMsg', 'Are you sure you want to reset all prompt fragments to their built-in versions? This will remove all customizations.'),
                ok: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetAllButton', 'Reset All'),
                cancel: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/cancelButton', 'Cancel')
            });
            const shouldReset = await dialog.open();
            if (shouldReset) {
                this.promptService.resetAllToBuiltIn();
            }
        };
    }
    static { AIPromptFragmentsConfigurationWidget_1 = this; }
    static { this.ID = 'ai-prompt-fragments-configuration'; }
    static { this.LABEL = core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/label', 'Prompt Fragments'); }
    set promptService(v) { this._promptService = v; }
    get promptService() { if (!this._promptService) {
        throw new Error('AIPromptFragmentsConfigurationWidget: promptService not injected');
    } return this._promptService; }
    set agentService(v) { this._agentService = v; }
    get agentService() { if (!this._agentService) {
        throw new Error('AIPromptFragmentsConfigurationWidget: agentService not injected');
    } return this._agentService; }
    init() {
        this.id = AIPromptFragmentsConfigurationWidget_1.ID;
        this.title.label = AIPromptFragmentsConfigurationWidget_1.LABEL;
        this.title.caption = AIPromptFragmentsConfigurationWidget_1.LABEL;
        this.title.closable = true;
        this.addClass('ai-configuration-tab-content');
        this.loadPromptFragments();
        this.loadAgents();
        const _d1 = this.promptService.onPromptsChange(() => {
            this.loadPromptFragments();
        });
        const _d2 = this.agentService.onDidChangeAgents(() => {
            this.loadAgents();
        });
        this.toDispose.push({ dispose: () => { try {
                if (typeof _d1 === 'function') {
                    _d1();
                }
                else if (_d1 && typeof _d1.dispose === 'function') {
                    (_d1.dispose)();
                }
            }
            catch { } } });
        this.toDispose.push({ dispose: () => { try {
                if (typeof _d2 === 'function') {
                    _d2();
                }
                else if (_d2 && typeof _d2.dispose === 'function') {
                    (_d2.dispose)();
                }
            }
            catch { } } });
    }
    /**
     * Loads all prompt fragments and prompt variant sets from the prompt service.
     * Preserves UI expansion states and updates variant information.
     */
    loadPromptFragments() {
        this.promptFragmentMap = this.promptService.getAllPromptFragments();
        this.promptVariantsMap = this.promptService.getPromptVariantSets();
        this.activePromptFragments = this.promptService.getActivePromptFragments();
        // Preserve expansion state when reloading
        const existingExpandedFragmentIds = new Set(this.expandedPromptFragmentIds);
        const existingExpandedPromptVariantIds = new Set(this.expandedPromptVariantSetIds);
        const existingExpandedTemplates = new Set(this.expandedPromptFragmentTemplates);
        // If no sections were previously expanded, expand all by default
        if (existingExpandedFragmentIds.size === 0) {
            this.expandedPromptFragmentIds = new Set(Array.from(this.promptFragmentMap.keys()));
        }
        else {
            // Keep existing expansion state but remove entries for fragments that no longer exist
            this.expandedPromptFragmentIds = new Set(Array.from(existingExpandedFragmentIds).filter(id => this.promptFragmentMap.has(id)));
        }
        if (existingExpandedPromptVariantIds.size === 0) {
            this.expandedPromptVariantSetIds = new Set(Array.from(this.promptVariantsMap.keys()));
        }
        else {
            // Keep existing expansion state but remove entries for prompt variant sets that no longer exist
            this.expandedPromptVariantSetIds = new Set(Array.from(existingExpandedPromptVariantIds).filter(id => this.promptVariantsMap.has(id)));
        }
        // For templates, preserve existing expanded states - don't expand by default
        this.expandedPromptFragmentTemplates = new Set(Array.from(existingExpandedTemplates).filter(id => {
            const [fragmentId] = id.split('_');
            return this.promptFragmentMap.has(fragmentId);
        }));
        // Update variant information (selected/default/effective) for prompt variant sets
        for (const promptVariantSetId of this.promptVariantsMap.keys()) {
            const effectiveId = this.promptService.getEffectiveVariantId(promptVariantSetId);
            const defaultId = this.promptService.getDefaultVariantId(promptVariantSetId);
            const selectedId = this.promptService.getSelectedVariantId(promptVariantSetId) ?? defaultId;
            this.userSelectedVariantIds.set(promptVariantSetId, selectedId);
            this.effectiveVariantIds.set(promptVariantSetId, effectiveId);
            this.defaultVariantIds.set(promptVariantSetId, defaultId);
        }
        this.update();
    }
    /**
     * Loads all available agents from the agent service
     */
    loadAgents() {
        this.availableAgents = this.agentService.getAllAgents();
        this.update();
    }
    /**
     * Finds agents that use a specific prompt variant set
     * @param promptVariantSetId ID of the prompt variant set to match
     * @returns Array of agents that use the prompt variant set
     */
    getAgentsUsingPromptVariantId(promptVariantSetId) {
        return this.availableAgents.filter((agent) => agent.prompts.find(promptVariantSet => promptVariantSet.id === promptVariantSetId));
    }
    /**
     * Determines if a prompt fragment is currently the active one for its ID
     * @param promptFragment The prompt fragment to check
     * @returns True if this prompt fragment is the active customization
     */
    isActiveCustomization(promptFragment) {
        const activePromptFragment = this.activePromptFragments.find(activePrompt => activePrompt.id === promptFragment.id);
        if (!activePromptFragment) {
            return false;
        }
        if ((0, prompt_service_1.isCustomizedPromptFragment)(activePromptFragment) && (0, prompt_service_1.isCustomizedPromptFragment)(promptFragment)) {
            return (activePromptFragment.id === promptFragment.id &&
                activePromptFragment.template === promptFragment.template &&
                activePromptFragment.customizationId === promptFragment.customizationId &&
                activePromptFragment.priority === promptFragment.priority);
        }
        if ((0, prompt_service_1.isBasePromptFragment)(activePromptFragment) && (0, prompt_service_1.isBasePromptFragment)(promptFragment)) {
            return (activePromptFragment.id === promptFragment.id &&
                activePromptFragment.template === promptFragment.template);
        }
        return false;
    }
    /**
     * Main render method for the widget
     * @returns Complete UI for the configuration widget
     */
    render() {
        const nonSystemPromptFragments = this.getNonPromptVariantSetFragments();
        return ((0, jsx_runtime_1.jsxs)("div", { className: 'ai-prompt-fragments-configuration', children: [(0, jsx_runtime_1.jsxs)("div", { className: "prompt-fragments-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/headerTitle', 'Prompt Fragments') }), (0, jsx_runtime_1.jsx)("div", { className: "global-actions", children: (0, jsx_runtime_1.jsxs)("button", { className: "global-action-button", onClick: this.removeAllCustomizations, title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetAllCustomizationsTitle', 'Reset all customizations'), children: [core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetAllPromptFragments', 'Reset all prompt fragments'), " ", (0, jsx_runtime_1.jsx)("span", { className: (0, browser_1.codicon)('clear-all') })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "prompt-variants-container", children: [(0, jsx_runtime_1.jsx)("h3", { className: "section-header", children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/promptVariantsHeader', 'Prompt Variant Sets') }), Array.from(this.promptVariantsMap.entries()).map(([promptVariantSetId, variantIds]) => this.renderPromptVariantSet(promptVariantSetId, variantIds))] }), nonSystemPromptFragments.size > 0 && (0, jsx_runtime_1.jsxs)("div", { className: "prompt-fragments-container", children: [(0, jsx_runtime_1.jsx)("h3", { className: "section-header", children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/otherPromptFragmentsHeader', 'Other Prompt Fragments') }), Array.from(nonSystemPromptFragments.entries()).map(([promptFragmentId, fragments]) => this.renderPromptFragment(promptFragmentId, fragments))] }), this.promptFragmentMap.size === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "no-fragments", children: (0, jsx_runtime_1.jsx)("p", { children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/noFragmentsAvailable', 'No prompt fragments available.') }) }))] }));
    }
    /**
     * Renders a prompt variant set with its variants
     * @param promptVariantSetId ID of the prompt variant set
     * @param variantIds Array of variant IDs
     * @returns React node for the prompt variant set group
     */
    renderPromptVariantSet(promptVariantSetId, variantIds) {
        const isSectionExpanded = this.expandedPromptVariantSetIds.has(promptVariantSetId);
        // Get selected, effective, and default variant IDs from our class properties
        const selectedVariantId = this.userSelectedVariantIds.get(promptVariantSetId);
        const effectiveVariantId = this.effectiveVariantIds.get(promptVariantSetId);
        const defaultVariantId = this.defaultVariantIds.get(promptVariantSetId);
        // Get variant fragments grouped by ID
        const variantGroups = new Map();
        // First, collect all actual fragments for each variant ID
        for (const variantId of variantIds) {
            if (this.promptFragmentMap.has(variantId)) {
                variantGroups.set(variantId, this.promptFragmentMap.get(variantId));
            }
        }
        const relatedAgents = this.getAgentsUsingPromptVariantId(promptVariantSetId);
        // Determine warning/error state
        let variantSetMessage = undefined;
        if (effectiveVariantId === undefined) {
            // Error: effectiveId is undefined, so nothing works
            variantSetMessage = ((0, jsx_runtime_1.jsxs)("div", { className: "prompt-variant-error", children: [(0, jsx_runtime_1.jsx)("span", { className: "codicon codicon-error" }), core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/variantSetError', 'The selected variant does not exist and no default could be found. Please check your configuration.')] }));
        }
        else {
            const needsWarning = selectedVariantId ? effectiveVariantId !== selectedVariantId : effectiveVariantId !== defaultVariantId;
            if (needsWarning) {
                // Warning: selectedId is set but does not exist, so default is used
                variantSetMessage = ((0, jsx_runtime_1.jsxs)("div", { className: "prompt-variant-warning", children: [(0, jsx_runtime_1.jsx)("span", { className: "codicon codicon-warning" }), core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/variantSetWarning', 'The selected variant does not exist. The default variant is being used instead.')] }));
            }
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "prompt-fragment-section", children: [(0, jsx_runtime_1.jsxs)("div", { className: `prompt-fragment-header ${isSectionExpanded ? 'expanded' : ''}`, onClick: () => this.togglePromptVariantSetExpansion(promptVariantSetId), children: [(0, jsx_runtime_1.jsxs)("div", { className: "prompt-fragment-title", children: [(0, jsx_runtime_1.jsx)("span", { className: "expansion-icon", children: isSectionExpanded ? '▼' : '▶' }), (0, jsx_runtime_1.jsx)("h2", { children: promptVariantSetId })] }), relatedAgents.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "agent-chips-container", children: relatedAgents.map(agent => ((0, jsx_runtime_1.jsxs)("span", { className: "agent-chip", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/usedByAgentTitle', 'Used by agent: {0}', agent.name), onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, browser_1.codicon)('copilot') }), agent.name] }, agent.id))) }))] }), isSectionExpanded && ((0, jsx_runtime_1.jsxs)("div", { className: "prompt-fragment-body", children: [variantSetMessage, (0, jsx_runtime_1.jsx)("div", { className: "prompt-fragment-description", children: (0, jsx_runtime_1.jsx)("p", { children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/variantsOfSystemPrompt', 'Variants of this prompt variant set:') }) }), Array.from(variantGroups.entries()).map(([variantId, fragments]) => {
                            const isVariantExpanded = this.expandedPromptFragmentIds.has(variantId);
                            return ((0, jsx_runtime_1.jsxs)("div", { className: `prompt-fragment-section ${selectedVariantId === variantId ? 'selected-variant' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: `prompt-fragment-header ${isVariantExpanded ? 'expanded' : ''}`, onClick: () => this.togglePromptFragmentExpansion(variantId), children: (0, jsx_runtime_1.jsxs)("div", { className: "prompt-fragment-title", children: [(0, jsx_runtime_1.jsx)("span", { className: "expansion-icon", children: isVariantExpanded ? '▼' : '▶' }), (0, jsx_runtime_1.jsx)("h4", { children: variantId }), defaultVariantId === variantId && ((0, jsx_runtime_1.jsx)("span", { className: "badge default-variant", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/defaultVariantTitle', 'Default variant'), children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/defaultVariantLabel', 'Default') })), selectedVariantId === variantId && ((0, jsx_runtime_1.jsx)("span", { className: "selected-indicator", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/selectedVariantTitle', 'Selected variant'), children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/selectedVariantLabel', 'Selected') }))] }) }), isVariantExpanded && ((0, jsx_runtime_1.jsx)("div", { className: 'prompt-fragment-body', children: fragments.map(fragment => this.renderPromptFragmentCustomization(fragment)) }))] }, variantId));
                        })] }))] }, `variant-${promptVariantSetId}`));
    }
    /**
     * Gets fragments that aren't part of any prompt variant set
     * @returns Map of fragment IDs to their customizations
     */
    getNonPromptVariantSetFragments() {
        const nonSystemPromptFragments = new Map();
        const allVariantIds = new Set();
        // Collect all variant IDs from prompt variant sets
        for (const variants of this.promptVariantsMap.values()) {
            variants.forEach(variantId => allVariantIds.add(variantId));
        }
        // Add prompt variant set main IDs
        for (const promptVariantSetId of this.promptVariantsMap.keys()) {
            allVariantIds.add(promptVariantSetId);
        }
        // Filter the fragment map to only include non-prompt variant set fragments
        this.promptFragmentMap.forEach((fragments, promptFragmentId) => {
            if (!allVariantIds.has(promptFragmentId)) {
                nonSystemPromptFragments.set(promptFragmentId, fragments);
            }
        });
        return nonSystemPromptFragments;
    }
    /**
     * Renders a prompt fragment with all of its customizations
     * @param promptFragmentId ID of the prompt fragment
     * @param customizations Array of the customizations
     * @returns React node for the prompt fragment
     */
    renderPromptFragment(promptFragmentId, customizations) {
        const isSectionExpanded = this.expandedPromptFragmentIds.has(promptFragmentId);
        return ((0, jsx_runtime_1.jsxs)("div", { className: 'prompt-fragment-group', children: [(0, jsx_runtime_1.jsx)("div", { className: `prompt-fragment-header ${isSectionExpanded ? 'expanded' : ''}`, onClick: () => this.togglePromptFragmentExpansion(promptFragmentId), children: (0, jsx_runtime_1.jsxs)("div", { className: "prompt-fragment-title", children: [(0, jsx_runtime_1.jsx)("span", { className: "expansion-icon", children: isSectionExpanded ? '▼' : '▶' }), promptFragmentId] }) }), isSectionExpanded && ((0, jsx_runtime_1.jsx)("div", { className: "prompt-fragment-body", children: customizations.map(fragment => this.renderPromptFragmentCustomization(fragment)) }))] }, promptFragmentId));
    }
    /**
     * Renders a single prompt fragment customization with its controls and content
     * @param promptFragment The prompt fragment to render
     * @returns React node for the prompt fragment
     */
    renderPromptFragmentCustomization(promptFragment) {
        const isCustomized = (0, prompt_service_1.isCustomizedPromptFragment)(promptFragment);
        const isActive = this.isActiveCustomization(promptFragment);
        // Create a unique key for this fragment to track expansion state
        const fragmentKey = `${promptFragment.id}_${isCustomized ? promptFragment.customizationId : 'built-in'}`;
        const isTemplateExpanded = this.expandedPromptFragmentTemplates.has(fragmentKey);
        const hasCustomizedBuiltIn = this.promptFragmentMap.get(promptFragment.id)?.some(fragment => (0, prompt_service_1.isCustomizedPromptFragment)(fragment) && fragment.priority === frontend_prompt_customization_service_1.CustomizationSource.CUSTOMIZED);
        return ((0, jsx_runtime_1.jsxs)("div", { className: `prompt-customization ${isActive ? 'active-customization' : ''}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "prompt-customization-header", children: [(0, jsx_runtime_1.jsxs)("div", { className: "prompt-customization-title", children: [(0, jsx_runtime_1.jsx)(React.Suspense, { fallback: (0, jsx_runtime_1.jsx)("div", { children: "Loading..." }), children: (0, jsx_runtime_1.jsx)(CustomizationTypeBadge, { promptFragment: promptFragment, promptService: this.promptService }) }), isActive && ((0, jsx_runtime_1.jsx)("span", { className: "active-indicator", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/activeCustomizationTitle', 'Active customization'), children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/activeCustomizationLabel', 'Active') }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "prompt-customization-actions", children: [!isCustomized && !hasCustomizedBuiltIn && ((0, jsx_runtime_1.jsx)("button", { className: "template-action-button config-button", onClick: e => this.createPromptFragmentCustomization(promptFragment, e), title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/createCustomizationTitle', 'Create Customization'), children: (0, jsx_runtime_1.jsx)("span", { className: (0, browser_1.codicon)('add') }) })), isCustomized && ((0, jsx_runtime_1.jsx)("button", { className: "source-uri-button", onClick: e => this.editPromptCustomization(promptFragment, e), title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/editTemplateTitle', 'Edit template'), children: (0, jsx_runtime_1.jsx)("span", { className: (0, browser_1.codicon)('edit') }) })), !isActive && ((0, jsx_runtime_1.jsx)("button", { className: "template-action-button reset-button", onClick: e => this.resetToPromptFragment(promptFragment, e), title: !isCustomized ?
                                        core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToBuiltInTitle', 'Reset to this built-in') :
                                        core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToCustomizationTitle', 'Reset to this customization'), children: (0, jsx_runtime_1.jsx)("span", { className: (0, browser_1.codicon)('discard') }) })), isCustomized && ((0, jsx_runtime_1.jsx)("button", { className: "template-action-button delete-button", onClick: e => this.deletePromptFragmentCustomization(promptFragment, e), title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/deleteCustomizationTitle', 'Delete Customization'), children: (0, jsx_runtime_1.jsx)("span", { className: (0, browser_1.codicon)('trash') }) }))] })] }), isCustomized && ((0, jsx_runtime_1.jsx)(React.Suspense, { fallback: (0, jsx_runtime_1.jsx)("div", { children: "Loading..." }), children: (0, jsx_runtime_1.jsx)(DescriptionBadge, { promptFragment: promptFragment, promptService: this.promptService }) })), (0, jsx_runtime_1.jsxs)("div", { className: "template-content-container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "template-toggle-button", onClick: e => this.toggleTemplateExpansion(fragmentKey, e), children: [(0, jsx_runtime_1.jsx)("span", { className: "template-expansion-icon", children: isTemplateExpanded ? '▼' : '▶' }), (0, jsx_runtime_1.jsx)("span", { children: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/promptTemplateText', 'Prompt Template Text') })] }), isTemplateExpanded && ((0, jsx_runtime_1.jsx)("div", { className: "template-content", children: (0, jsx_runtime_1.jsx)("pre", { children: promptFragment.template }) }))] })] }, fragmentKey));
    }
};
exports.AIPromptFragmentsConfigurationWidget = AIPromptFragmentsConfigurationWidget;
__decorate([
    (0, inversify_1.inject)(prompt_service_1.PromptService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIPromptFragmentsConfigurationWidget.prototype, "promptService", null);
__decorate([
    (0, inversify_1.inject)(agent_service_1.AgentService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIPromptFragmentsConfigurationWidget.prototype, "agentService", null);
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AIPromptFragmentsConfigurationWidget.prototype, "init", null);
exports.AIPromptFragmentsConfigurationWidget = AIPromptFragmentsConfigurationWidget = AIPromptFragmentsConfigurationWidget_1 = __decorate([
    (0, inversify_1.injectable)()
], AIPromptFragmentsConfigurationWidget);
/**
 * Displays a badge indicating the type of a prompt fragment customization (built-in, user, workspace)
 */
const CustomizationTypeBadge = ({ promptFragment, promptService }) => {
    const [typeLabel, setTypeLabel] = React.useState('unknown');
    React.useEffect(() => {
        const fetchCustomizationType = async () => {
            if ((0, prompt_service_1.isCustomizedPromptFragment)(promptFragment)) {
                const customizationType = await promptService.getCustomizationType(promptFragment.id, promptFragment.customizationId);
                setTypeLabel(`${customizationType ?
                    customizationType + ' ' + core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/customization', 'customization')
                    : core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/customizationLabel', 'Customization')}`);
            }
            else {
                setTypeLabel(core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/builtInLabel', 'Built-in'));
            }
        };
        fetchCustomizationType();
    }, [promptFragment, promptService]);
    return (0, jsx_runtime_1.jsx)("span", { children: typeLabel });
};
/**
 * Displays the description of a customized prompt fragment if available
 */
const DescriptionBadge = ({ promptFragment, promptService }) => {
    const [description, setDescription] = React.useState('');
    React.useEffect(() => {
        const fetchDescription = async () => {
            const customizationDescription = await promptService.getCustomizationDescription(promptFragment.id, promptFragment.customizationId);
            setDescription(customizationDescription || '');
        };
        fetchDescription();
    }, [promptFragment.id, promptFragment.customizationId, promptService]);
    return (0, jsx_runtime_1.jsx)("span", { className: "prompt-customization-description", children: description });
};
