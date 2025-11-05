"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageModelRenderer = void 0;
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
const React = require("@theia/core/shared/react");
const nls_1 = require("@theia/core/lib/common/nls");
const LanguageModelRenderer = ({ agent, languageModels, aiSettingsService, languageModelRegistry, languageModelAliases: aliases }) => {
    const findLanguageModelRequirement = async (purpose) => {
        const requirementSetting = await aiSettingsService.getAgentSettings(agent.id);
        return requirementSetting?.languageModelRequirements?.find(e => e.purpose === purpose);
    };
    const [lmRequirementMap, setLmRequirementMap] = React.useState({});
    const [resolvedAliasModels, setResolvedAliasModels] = React.useState({});
    React.useEffect(() => {
        const computeLmRequirementMap = async () => {
            const requirements = agent.languageModelRequirements ?? [];
            const map = await requirements.reduce(async (accPromise, curr) => {
                const acc = await accPromise;
                const purpose = curr.purpose ?? 'default';
                // take the agents requirements and override them with the user settings if present
                const lmRequirement = await findLanguageModelRequirement(purpose) ?? curr;
                // if no llm is selected through the identifier, see what would be the default
                if (!lmRequirement.identifier) {
                    const llm = await languageModelRegistry.selectLanguageModel({ agent: agent.id, ...lmRequirement });
                    lmRequirement.identifier = llm?.id;
                }
                acc[purpose] = lmRequirement;
                return acc;
            }, Promise.resolve({}));
            setLmRequirementMap(map);
        };
        computeLmRequirementMap();
    }, [agent.languageModelRequirements, languageModelRegistry]);
    // Effect to resolve alias to model whenever requirements.identifier or aliases change
    React.useEffect(() => {
        const resolveAliases = async () => {
            const newResolved = {};
            await Promise.all(Object.values(lmRequirementMap).map(async (requirements) => {
                const id = requirements.identifier;
                if (id && aliases.some(a => a.id === id)) {
                    newResolved[id] = await languageModelRegistry.getReadyLanguageModel(id);
                }
            }));
            setResolvedAliasModels(newResolved);
        };
        resolveAliases();
    }, [lmRequirementMap, aliases]);
    const onSelectedModelChange = (purpose, event) => {
        const newLmRequirementMap = { ...lmRequirementMap, [purpose]: { purpose, identifier: event.target.value } };
        aiSettingsService.updateAgentSettings(agent.id, { languageModelRequirements: Object.values(newLmRequirementMap) });
        setLmRequirementMap(newLmRequirementMap);
    };
    return React.createElement("div", { className: 'language-model-container' }, Object.values(lmRequirementMap).map((requirement, index) => {
        const id = requirement.identifier;
        const isAlias = !!id && aliases.some(a => a.id === id);
        const resolvedModel = isAlias && id ? resolvedAliasModels[id] : undefined;
        return (React.createElement(React.Fragment, { key: index },
            React.createElement("div", { className: "ai-alias-evaluates-to-container" },
                React.createElement("strong", null,
                    nls_1.nls.localize('theia/ai/core/languageModelRenderer/purpose', 'Purpose'),
                    ":"),
                " ",
                requirement.purpose),
            React.createElement("div", null,
                React.createElement("div", { className: "ai-alias-evaluates-to-container" },
                    React.createElement("label", { className: "theia-header no-select", htmlFor: `model-select-${agent.id}` }, nls_1.nls.localize('theia/ai/core/languageModelRenderer/languageModel', 'Language Model') + ': '),
                    React.createElement("select", { className: "theia-select", id: `model-select-${agent.id}-${requirement.purpose ?? 'default'}`, value: requirement.identifier ?? '', onChange: event => onSelectedModelChange(requirement.purpose ?? 'default', event) },
                        React.createElement("option", { value: "" }),
                        aliases?.sort((a, b) => a.id.localeCompare(b.id)).map(alias => (React.createElement("option", { key: `alias/${alias.id}`, value: alias.id, className: 'ai-language-model-item-ready' }, `[alias] ${alias.id}`))),
                        languageModels?.sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id)).map(model => {
                            const isNotReady = model.status.status !== 'ready';
                            return (React.createElement("option", { key: model.id, value: model.id, className: isNotReady ? 'ai-language-model-item-not-ready' : 'ai-language-model-item-ready', title: isNotReady && model.status.message ? model.status.message : undefined },
                                model.name ?? model.id,
                                " ",
                                isNotReady ? '✗' : '✓'));
                        }))),
                isAlias && (React.createElement("div", { className: "ai-alias-evaluates-to-container" },
                    React.createElement("label", { className: "ai-alias-evaluates-to-label" },
                        nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/evaluatesTo', 'Evaluates to'),
                        ":"),
                    resolvedModel ? (React.createElement("span", { className: "ai-alias-evaluates-to-value" },
                        resolvedModel.name ?? resolvedModel.id,
                        resolvedModel.status.status === 'ready' ? (React.createElement("span", { className: "ai-model-status-ready", title: "Ready" }, "\u2713")) : (React.createElement("span", { className: "ai-model-status-not-ready", title: resolvedModel.status.message || 'Not ready' }, "\u2717")))) : (React.createElement("span", { className: "ai-alias-evaluates-to-unresolved" },
                        nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/noResolvedModel', 'No model ready for this alias.'),
                        React.createElement("span", { className: "ai-model-status-not-ready", title: 'No model ready' }, "\u2717"))))),
                React.createElement("hr", null))));
    }));
};
exports.LanguageModelRenderer = LanguageModelRenderer;
//# sourceMappingURL=language-model-renderer.js.map