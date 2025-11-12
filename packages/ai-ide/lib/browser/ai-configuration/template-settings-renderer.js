"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptVariantRenderer = void 0;
const React = require("@theia/core/shared/react");
const nls_1 = require("@theia/core/lib/common/nls");
const PromptVariantRenderer = ({ agentId, promptVariantSet, promptService, }) => {
    const variantIds = promptService.getVariantIds(promptVariantSet.id);
    const defaultVariantId = promptService.getDefaultVariantId(promptVariantSet.id);
    const [selectedVariant, setSelectedVariant] = React.useState(defaultVariantId);
    React.useEffect(() => {
        const currentVariant = promptService.getSelectedVariantId(promptVariantSet.id);
        setSelectedVariant(currentVariant ?? defaultVariantId);
        const disposable = promptService.onSelectedVariantChange((notification) => {
            if (notification.promptVariantSetId === promptVariantSet.id) {
                setSelectedVariant(notification.variantId ?? defaultVariantId);
            }
        });
        return () => {
            try {
                if (disposable && typeof disposable.dispose === 'function') {
                    disposable.dispose();
                }
                else if (typeof disposable === 'function') {
                    disposable();
                }
            }
            catch { }
        };
    }, [promptVariantSet.id, promptService, defaultVariantId]);
    const isInvalidVariant = !variantIds.includes(selectedVariant);
    const handleVariantChange = async (event) => {
        const newVariant = event.target.value;
        setSelectedVariant(newVariant);
        promptService.updateSelectedVariantId(agentId, promptVariantSet.id, newVariant);
    };
    const openTemplate = () => {
        promptService.editBuiltInCustomization(selectedVariant);
    };
    const resetTemplate = () => {
        promptService.resetToBuiltIn(selectedVariant);
    };
    return (React.createElement("div", { className: "template-renderer" },
        React.createElement("div", { className: "settings-section-title template-header" },
            React.createElement("strong", null, promptVariantSet.id)),
        React.createElement("div", { className: "template-controls" },
            (variantIds.length > 1 || isInvalidVariant) && (React.createElement(React.Fragment, null,
                React.createElement("label", { htmlFor: `variant-selector-${promptVariantSet.id}`, className: "template-select-label" }, nls_1.nls.localize('theia/ai/core/templateSettings/selectVariant', 'Select Variant:')),
                React.createElement("select", { id: `variant-selector-${promptVariantSet.id}`, className: `theia-select template-variant-selector ${isInvalidVariant ? 'error' : ''}`, value: isInvalidVariant ? 'invalid' : selectedVariant, onChange: handleVariantChange },
                    isInvalidVariant && (React.createElement("option", { value: "invalid", disabled: true }, nls_1.nls.localize('theia/ai/core/templateSettings/unavailableVariant', 'Selected variant not available, default will be used'))),
                    variantIds.map(variantId => (React.createElement("option", { key: variantId, value: variantId }, variantId === defaultVariantId ? variantId + ' (default)' : variantId)))))),
            React.createElement("button", { className: "theia-button main", onClick: openTemplate, disabled: isInvalidVariant }, nls_1.nls.localize('theia/ai/core/templateSettings/edit', 'Edit')),
            React.createElement("button", { className: "theia-button secondary", onClick: resetTemplate, disabled: isInvalidVariant }, nls_1.nls.localize('theia/ai/core/templateSettings/reset', 'Reset')))));
};
exports.PromptVariantRenderer = PromptVariantRenderer;
//# sourceMappingURL=template-settings-renderer.js.map