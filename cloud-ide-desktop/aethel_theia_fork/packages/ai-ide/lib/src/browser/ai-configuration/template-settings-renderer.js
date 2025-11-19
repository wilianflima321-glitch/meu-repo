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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptVariantRenderer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("@theia/core/shared/react"));
const nls_1 = require("@theia/core/lib/common/nls");
const PromptVariantRenderer = ({ agentId, promptVariantSet, promptService, }) => {
    const variantIds = promptService.getVariantIds(promptVariantSet.id);
    const defaultVariantId = promptService.getDefaultVariantId(promptVariantSet.id);
    const [selectedVariant, setSelectedVariant] = React.useState(defaultVariantId);
    React.useEffect(() => {
        const currentVariant = promptService.getSelectedVariantId(promptVariantSet.id);
        setSelectedVariant(currentVariant ?? defaultVariantId);
        const _disposable = promptService.onSelectedVariantChange((notification) => {
            if (notification.promptVariantSetId === promptVariantSet.id) {
                setSelectedVariant(notification.variantId ?? defaultVariantId);
            }
        });
        return () => {
            try {
                if (_disposable && typeof _disposable.dispose === 'function') {
                    const maybe = _disposable;
                    try {
                        if (maybe && typeof maybe.dispose === 'function') {
                            maybe.dispose();
                        }
                        else if (typeof maybe === 'function') {
                            maybe();
                        }
                    }
                    catch { /* swallow */ }
                }
                else if (typeof _disposable === 'function') {
                    try {
                        if (typeof _disposable === 'function') {
                            _disposable();
                        }
                        else if (_disposable && typeof _disposable.dispose === 'function') {
                            _disposable.dispose();
                        }
                    }
                    catch { /* swallow */ }
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "template-renderer", children: [(0, jsx_runtime_1.jsx)("div", { className: "settings-section-title template-header", children: (0, jsx_runtime_1.jsx)("strong", { children: promptVariantSet.id }) }), (0, jsx_runtime_1.jsxs)("div", { className: "template-controls", children: [(variantIds.length > 1 || isInvalidVariant) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: `variant-selector-${promptVariantSet.id}`, className: "template-select-label", children: nls_1.nls.localize('theia/ai/core/templateSettings/selectVariant', 'Select Variant:') }), (0, jsx_runtime_1.jsxs)("select", { id: `variant-selector-${promptVariantSet.id}`, className: `theia-select template-variant-selector ${isInvalidVariant ? 'error' : ''}`, value: isInvalidVariant ? 'invalid' : selectedVariant, onChange: handleVariantChange, children: [isInvalidVariant && ((0, jsx_runtime_1.jsx)("option", { value: "invalid", disabled: true, children: nls_1.nls.localize('theia/ai/core/templateSettings/unavailableVariant', 'Selected variant not available, default will be used') })), variantIds.map(variantId => ((0, jsx_runtime_1.jsx)("option", { value: variantId, children: variantId === defaultVariantId ? variantId + ' (default)' : variantId }, variantId)))] })] })), (0, jsx_runtime_1.jsx)("button", { className: "theia-button main", onClick: openTemplate, disabled: isInvalidVariant, children: nls_1.nls.localize('theia/ai/core/templateSettings/edit', 'Edit') }), (0, jsx_runtime_1.jsx)("button", { className: "theia-button secondary", onClick: resetTemplate, disabled: isInvalidVariant, children: nls_1.nls.localize('theia/ai/core/templateSettings/reset', 'Reset') })] })] }));
};
exports.PromptVariantRenderer = PromptVariantRenderer;
