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
var AIPromptFragmentsConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIPromptFragmentsConfigurationWidget = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const prompt_service_1 = require("@theia/ai-core/lib/common/prompt-service");
const React = require("@theia/core/shared/react");
const agent_service_1 = require("@theia/ai-core/lib/common/agent-service");
const frontend_prompt_customization_service_1 = require("@theia/ai-core/lib/browser/frontend-prompt-customization-service");
/**
 * Widget for configuring AI prompt fragments and prompt variant sets.
 * Allows users to view, create, edit, and manage various types of prompt
 * fragments including their customizations and variants.
 */
let AIPromptFragmentsConfigurationWidget = class AIPromptFragmentsConfigurationWidget extends browser_1.ReactWidget {
    static { AIPromptFragmentsConfigurationWidget_1 = this; }
    static ID = 'ai-prompt-fragments-configuration';
    static LABEL = core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/label', 'Prompt Fragments');
    /**
     * Stores all available prompt fragments by ID
     */
    promptFragmentMap = new Map();
    /**
     * Stores prompt variant sets and their variant IDs
     */
    promptVariantsMap = new Map();
    /**
     * Currently active prompt fragments
     */
    activePromptFragments = [];
    /**
     * Tracks expanded state of prompt fragment sections in the UI
     */
    expandedPromptFragmentIds = new Set();
    /**
     * Tracks expanded state of prompt content display
     */
    expandedPromptFragmentTemplates = new Set();
    /**
     * Tracks expanded state of prompt variant set sections
     */
    expandedPromptVariantSetIds = new Set();
    /**
     * All available agents that may use prompts
     */
    availableAgents = [];
    /**
     * Maps prompt variant set IDs to their resolved variant IDs
     */
    effectiveVariantIds = new Map();
    /**
     * Maps prompt variant set IDs to their default variant IDs
     */
    defaultVariantIds = new Map();
    /**
     * Maps prompt variant set IDs to their user selected variant IDs
     */
    userSelectedVariantIds = new Map();
    promptService;
    agentService;
    init() {
        this.id = AIPromptFragmentsConfigurationWidget_1.ID;
        this.title.label = AIPromptFragmentsConfigurationWidget_1.LABEL;
        this.title.caption = AIPromptFragmentsConfigurationWidget_1.LABEL;
        this.title.closable = true;
        this.addClass('ai-configuration-tab-content');
        this.loadPromptFragments();
        this.loadAgents();
        const d1 = this.promptService.onPromptsChange(() => {
            this.loadPromptFragments();
        });
        const d2 = this.agentService.onDidChangeAgents(() => {
            this.loadAgents();
        });
        this.toDispose.push({ dispose: () => { try {
                if (typeof d1 === 'function') {
                    d1();
                }
                else if (typeof d1.dispose === 'function') {
                    d1.dispose();
                }
            }
            catch { } } });
        this.toDispose.push({ dispose: () => { try {
                if (typeof d2 === 'function') {
                    d2();
                }
                else if (typeof d2.dispose === 'function') {
                    d2.dispose();
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
    togglePromptVariantSetExpansion = (promptVariantSetId) => {
        if (this.expandedPromptVariantSetIds.has(promptVariantSetId)) {
            this.expandedPromptVariantSetIds.delete(promptVariantSetId);
        }
        else {
            this.expandedPromptVariantSetIds.add(promptVariantSetId);
        }
        this.update();
    };
    togglePromptFragmentExpansion = (promptFragmentId) => {
        if (this.expandedPromptFragmentIds.has(promptFragmentId)) {
            this.expandedPromptFragmentIds.delete(promptFragmentId);
        }
        else {
            this.expandedPromptFragmentIds.add(promptFragmentId);
        }
        this.update();
    };
    toggleTemplateExpansion = (fragmentKey, event) => {
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
    editPromptCustomization = (promptFragment, event) => {
        event.stopPropagation();
        this.promptService.editCustomization(promptFragment.id, promptFragment.customizationId);
    };
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
     * Resets a prompt fragment to use a specific customization (with confirmation dialog)
     * @param customization customization to reset to
     * @param event Mouse event
     */
    resetToPromptFragment = async (customization, event) => {
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
    createPromptFragmentCustomization = (promptFragment, event) => {
        event.stopPropagation();
        this.promptService.createBuiltInCustomization(promptFragment.id);
    };
    /**
     * Deletes a customization with confirmation dialog
     * @param customization Customized prompt fragment to delete
     * @param event Mouse event
     */
    deletePromptFragmentCustomization = async (customization, event) => {
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
    removeAllCustomizations = async () => {
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
    /**
     * Main render method for the widget
     * @returns Complete UI for the configuration widget
     */
    render() {
        const nonSystemPromptFragments = this.getNonPromptVariantSetFragments();
        return (React.createElement("div", { className: 'ai-prompt-fragments-configuration' },
            React.createElement("div", { className: "prompt-fragments-header" },
                React.createElement("h2", null, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/headerTitle', 'Prompt Fragments')),
                React.createElement("div", { className: "global-actions" },
                    React.createElement("button", { className: "global-action-button", onClick: this.removeAllCustomizations, title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetAllCustomizationsTitle', 'Reset all customizations') },
                        core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetAllPromptFragments', 'Reset all prompt fragments'),
                        " ",
                        React.createElement("span", { className: (0, browser_1.codicon)('clear-all') })))),
            React.createElement("div", { className: "prompt-variants-container" },
                React.createElement("h3", { className: "section-header" }, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/promptVariantsHeader', 'Prompt Variant Sets')),
                Array.from(this.promptVariantsMap.entries()).map(([promptVariantSetId, variantIds]) => this.renderPromptVariantSet(promptVariantSetId, variantIds))),
            nonSystemPromptFragments.size > 0 && React.createElement("div", { className: "prompt-fragments-container" },
                React.createElement("h3", { className: "section-header" }, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/otherPromptFragmentsHeader', 'Other Prompt Fragments')),
                Array.from(nonSystemPromptFragments.entries()).map(([promptFragmentId, fragments]) => this.renderPromptFragment(promptFragmentId, fragments))),
            this.promptFragmentMap.size === 0 && (React.createElement("div", { className: "no-fragments" },
                React.createElement("p", null, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/noFragmentsAvailable', 'No prompt fragments available.'))))));
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
            variantSetMessage = (React.createElement("div", { className: "prompt-variant-error" },
                React.createElement("span", { className: "codicon codicon-error" }),
                core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/variantSetError', 'The selected variant does not exist and no default could be found. Please check your configuration.')));
        }
        else {
            const needsWarning = selectedVariantId ? effectiveVariantId !== selectedVariantId : effectiveVariantId !== defaultVariantId;
            if (needsWarning) {
                // Warning: selectedId is set but does not exist, so default is used
                variantSetMessage = (React.createElement("div", { className: "prompt-variant-warning" },
                    React.createElement("span", { className: "codicon codicon-warning" }),
                    core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/variantSetWarning', 'The selected variant does not exist. The default variant is being used instead.')));
            }
        }
        return (React.createElement("div", { className: "prompt-fragment-section", key: `variant-${promptVariantSetId}` },
            React.createElement("div", { className: `prompt-fragment-header ${isSectionExpanded ? 'expanded' : ''}`, onClick: () => this.togglePromptVariantSetExpansion(promptVariantSetId) },
                React.createElement("div", { className: "prompt-fragment-title" },
                    React.createElement("span", { className: "expansion-icon" }, isSectionExpanded ? '▼' : '▶'),
                    React.createElement("h2", null, promptVariantSetId)),
                relatedAgents.length > 0 && (React.createElement("div", { className: "agent-chips-container" }, relatedAgents.map(agent => (React.createElement("span", { key: agent.id, className: "agent-chip", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/usedByAgentTitle', 'Used by agent: {0}', agent.name), onClick: e => e.stopPropagation() },
                    React.createElement("span", { className: (0, browser_1.codicon)('copilot') }),
                    agent.name)))))),
            isSectionExpanded && (React.createElement("div", { className: "prompt-fragment-body" },
                variantSetMessage,
                React.createElement("div", { className: "prompt-fragment-description" },
                    React.createElement("p", null, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/variantsOfSystemPrompt', 'Variants of this prompt variant set:'))),
                Array.from(variantGroups.entries()).map(([variantId, fragments]) => {
                    const isVariantExpanded = this.expandedPromptFragmentIds.has(variantId);
                    return (React.createElement("div", { key: variantId, className: `prompt-fragment-section ${selectedVariantId === variantId ? 'selected-variant' : ''}` },
                        React.createElement("div", { className: `prompt-fragment-header ${isVariantExpanded ? 'expanded' : ''}`, onClick: () => this.togglePromptFragmentExpansion(variantId) },
                            React.createElement("div", { className: "prompt-fragment-title" },
                                React.createElement("span", { className: "expansion-icon" }, isVariantExpanded ? '▼' : '▶'),
                                React.createElement("h4", null, variantId),
                                defaultVariantId === variantId && (React.createElement("span", { className: "badge default-variant", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/defaultVariantTitle', 'Default variant') }, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/defaultVariantLabel', 'Default'))),
                                selectedVariantId === variantId && (React.createElement("span", { className: "selected-indicator", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/selectedVariantTitle', 'Selected variant') }, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/selectedVariantLabel', 'Selected'))))),
                        isVariantExpanded && (React.createElement("div", { className: 'prompt-fragment-body' }, fragments.map(fragment => this.renderPromptFragmentCustomization(fragment))))));
                })))));
    }
    /**
     * Gets fragments that aren't part of any prompt variant set
     * @returns Map of fragment IDs to their customizations
     */
    getNonPromptVariantSetFragments() {
        const nonSystemPromptFragments = new Map();
        const allVariantIds = new Set();
        // Collect all variant IDs from prompt variant sets
        this.promptVariantsMap.forEach((variants, _) => {
            variants.forEach(variantId => allVariantIds.add(variantId));
        });
        // Add prompt variant set main IDs
        this.promptVariantsMap.forEach((_, promptVariantSetId) => {
            allVariantIds.add(promptVariantSetId);
        });
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
        return (React.createElement("div", { className: 'prompt-fragment-group', key: promptFragmentId },
            React.createElement("div", { className: `prompt-fragment-header ${isSectionExpanded ? 'expanded' : ''}`, onClick: () => this.togglePromptFragmentExpansion(promptFragmentId) },
                React.createElement("div", { className: "prompt-fragment-title" },
                    React.createElement("span", { className: "expansion-icon" }, isSectionExpanded ? '▼' : '▶'),
                    promptFragmentId)),
            isSectionExpanded && (React.createElement("div", { className: "prompt-fragment-body" }, customizations.map(fragment => this.renderPromptFragmentCustomization(fragment))))));
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
        return (React.createElement("div", { className: `prompt-customization ${isActive ? 'active-customization' : ''}`, key: fragmentKey },
            React.createElement("div", { className: "prompt-customization-header" },
                React.createElement("div", { className: "prompt-customization-title" },
                    React.createElement(React.Suspense, { fallback: React.createElement("div", null, "Loading...") },
                        React.createElement(CustomizationTypeBadge, { promptFragment: promptFragment, promptService: this.promptService })),
                    isActive && (React.createElement("span", { className: "active-indicator", title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/activeCustomizationTitle', 'Active customization') }, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/activeCustomizationLabel', 'Active')))),
                React.createElement("div", { className: "prompt-customization-actions" },
                    !isCustomized && !hasCustomizedBuiltIn && (React.createElement("button", { className: "template-action-button config-button", onClick: e => this.createPromptFragmentCustomization(promptFragment, e), title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/createCustomizationTitle', 'Create Customization') },
                        React.createElement("span", { className: (0, browser_1.codicon)('add') }))),
                    isCustomized && (React.createElement("button", { className: "source-uri-button", onClick: e => this.editPromptCustomization(promptFragment, e), title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/editTemplateTitle', 'Edit template') },
                        React.createElement("span", { className: (0, browser_1.codicon)('edit') }))),
                    !isActive && (React.createElement("button", { className: "template-action-button reset-button", onClick: e => this.resetToPromptFragment(promptFragment, e), title: !isCustomized ?
                            core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToBuiltInTitle', 'Reset to this built-in') :
                            core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/resetToCustomizationTitle', 'Reset to this customization') },
                        React.createElement("span", { className: (0, browser_1.codicon)('discard') }))),
                    isCustomized && (React.createElement("button", { className: "template-action-button delete-button", onClick: e => this.deletePromptFragmentCustomization(promptFragment, e), title: core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/deleteCustomizationTitle', 'Delete Customization') },
                        React.createElement("span", { className: (0, browser_1.codicon)('trash') }))))),
            isCustomized && (React.createElement(React.Suspense, { fallback: React.createElement("div", null, "Loading...") },
                React.createElement(DescriptionBadge, { promptFragment: promptFragment, promptService: this.promptService }))),
            React.createElement("div", { className: "template-content-container" },
                React.createElement("div", { className: "template-toggle-button", onClick: e => this.toggleTemplateExpansion(fragmentKey, e) },
                    React.createElement("span", { className: "template-expansion-icon" }, isTemplateExpanded ? '▼' : '▶'),
                    React.createElement("span", null, core_1.nls.localize('theia/ai/core/promptFragmentsConfiguration/promptTemplateText', 'Prompt Template Text'))),
                isTemplateExpanded && (React.createElement("div", { className: "template-content" },
                    React.createElement("pre", null, promptFragment.template))))));
    }
};
exports.AIPromptFragmentsConfigurationWidget = AIPromptFragmentsConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(prompt_service_1.PromptService),
    tslib_1.__metadata("design:type", Object)
], AIPromptFragmentsConfigurationWidget.prototype, "promptService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(agent_service_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], AIPromptFragmentsConfigurationWidget.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIPromptFragmentsConfigurationWidget.prototype, "init", null);
exports.AIPromptFragmentsConfigurationWidget = AIPromptFragmentsConfigurationWidget = AIPromptFragmentsConfigurationWidget_1 = tslib_1.__decorate([
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
    return React.createElement("span", null, typeLabel);
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
    return React.createElement("span", { className: "prompt-customization-description" }, description);
};
//# sourceMappingURL=prompt-fragments-configuration-widget.js.map