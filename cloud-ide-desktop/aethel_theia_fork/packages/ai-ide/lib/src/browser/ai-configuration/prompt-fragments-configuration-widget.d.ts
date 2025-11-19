import { ReactWidget } from '@theia/core/lib/browser';
import { CustomizedPromptFragment, PromptFragment, PromptService, BasePromptFragment } from '@theia/ai-core/lib/common/prompt-service';
import * as React from '@theia/core/shared/react';
import { AgentService } from '@theia/ai-core/lib/common/agent-service';
import { Agent } from '@theia/ai-core/lib/common/agent';
/**
 * Widget for configuring AI prompt fragments and prompt variant sets.
 * Allows users to view, create, edit, and manage various types of prompt
 * fragments including their customizations and variants.
 */
export declare class AIPromptFragmentsConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-prompt-fragments-configuration";
    static readonly LABEL: string;
    /**
     * Stores all available prompt fragments by ID
     */
    protected promptFragmentMap: Map<string, PromptFragment[]>;
    /**
     * Stores prompt variant sets and their variant IDs
     */
    protected promptVariantsMap: Map<string, string[]>;
    /**
     * Currently active prompt fragments
     */
    protected activePromptFragments: PromptFragment[];
    /**
     * Tracks expanded state of prompt fragment sections in the UI
     */
    protected expandedPromptFragmentIds: Set<string>;
    /**
     * Tracks expanded state of prompt content display
     */
    protected expandedPromptFragmentTemplates: Set<string>;
    /**
     * Tracks expanded state of prompt variant set sections
     */
    protected expandedPromptVariantSetIds: Set<string>;
    /**
     * All available agents that may use prompts
     */
    protected availableAgents: Agent[];
    /**
     * Maps prompt variant set IDs to their resolved variant IDs
     */
    protected effectiveVariantIds: Map<string, string | undefined>;
    /**
     * Maps prompt variant set IDs to their default variant IDs
     */
    protected defaultVariantIds: Map<string, string | undefined>;
    /**
     * Maps prompt variant set IDs to their user selected variant IDs
     */
    protected userSelectedVariantIds: Map<string, string | undefined>;
    private _promptService?;
    protected set promptService(v: PromptService);
    protected get promptService(): PromptService;
    private _agentService?;
    protected set agentService(v: AgentService);
    protected get agentService(): AgentService;
    protected init(): void;
    /**
     * Loads all prompt fragments and prompt variant sets from the prompt service.
     * Preserves UI expansion states and updates variant information.
     */
    protected loadPromptFragments(): void;
    /**
     * Loads all available agents from the agent service
     */
    protected loadAgents(): void;
    /**
     * Finds agents that use a specific prompt variant set
     * @param promptVariantSetId ID of the prompt variant set to match
     * @returns Array of agents that use the prompt variant set
     */
    protected getAgentsUsingPromptVariantId(promptVariantSetId: string): Agent[];
    protected togglePromptVariantSetExpansion: (promptVariantSetId: string) => void;
    protected togglePromptFragmentExpansion: (promptFragmentId: string) => void;
    protected toggleTemplateExpansion: (fragmentKey: string, event: React.MouseEvent) => void;
    /**
     * Call the edit action for the provided customized prompt fragment
     * @param promptFragment Fragment to edit
     * @param event Mouse event
     */
    protected editPromptCustomization: (promptFragment: CustomizedPromptFragment, event: React.MouseEvent) => void;
    /**
     * Determines if a prompt fragment is currently the active one for its ID
     * @param promptFragment The prompt fragment to check
     * @returns True if this prompt fragment is the active customization
     */
    protected isActiveCustomization(promptFragment: PromptFragment): boolean;
    /**
     * Resets a prompt fragment to use a specific customization (with confirmation dialog)
     * @param customization customization to reset to
     * @param event Mouse event
     */
    protected resetToPromptFragment: (customization: PromptFragment, event: React.MouseEvent) => Promise<void>;
    /**
     * Creates a new customization for a built-in prompt fragment
     * @param promptFragment Built-in prompt fragment to customize
     * @param event Mouse event
     */
    protected createPromptFragmentCustomization: (promptFragment: BasePromptFragment, event: React.MouseEvent) => void;
    /**
     * Deletes a customization with confirmation dialog
     * @param customization Customized prompt fragment to delete
     * @param event Mouse event
     */
    protected deletePromptFragmentCustomization: (customization: CustomizedPromptFragment, event: React.MouseEvent) => Promise<void>;
    /**
     * Removes all prompt customizations (resets to built-in versions) with confirmation
     */
    protected removeAllCustomizations: () => Promise<void>;
    /**
     * Main render method for the widget
     * @returns Complete UI for the configuration widget
     */
    protected render(): React.ReactNode;
    /**
     * Renders a prompt variant set with its variants
     * @param promptVariantSetId ID of the prompt variant set
     * @param variantIds Array of variant IDs
     * @returns React node for the prompt variant set group
     */
    protected renderPromptVariantSet(promptVariantSetId: string, variantIds: string[]): React.ReactNode;
    /**
     * Gets fragments that aren't part of any prompt variant set
     * @returns Map of fragment IDs to their customizations
     */
    protected getNonPromptVariantSetFragments(): Map<string, PromptFragment[]>;
    /**
     * Renders a prompt fragment with all of its customizations
     * @param promptFragmentId ID of the prompt fragment
     * @param customizations Array of the customizations
     * @returns React node for the prompt fragment
     */
    protected renderPromptFragment(promptFragmentId: string, customizations: PromptFragment[]): React.ReactNode;
    /**
     * Renders a single prompt fragment customization with its controls and content
     * @param promptFragment The prompt fragment to render
     * @returns React node for the prompt fragment
     */
    protected renderPromptFragmentCustomization(promptFragment: PromptFragment): React.ReactNode;
}
