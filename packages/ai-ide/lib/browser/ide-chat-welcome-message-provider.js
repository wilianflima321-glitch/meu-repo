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
exports.IdeChatWelcomeMessageProvider = void 0;
const tslib_1 = require("tslib");
const chat_tree_view_1 = require("@theia/ai-chat-ui/lib/browser/chat-tree-view");
const React = require("@theia/core/shared/react");
const nls_1 = require("@theia/core/lib/common/nls");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const TheiaIdeAiLogo = ({ width = 200, height = 200, className = '' }) => React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 200 200", width: width, height: height, className: className },
    React.createElement("rect", { x: "55", y: "45", width: "90", height: "85", rx: "30", fill: "var(--theia-disabledForeground)" }),
    React.createElement("line", { x1: "100", y1: "45", x2: "100", y2: "30", stroke: "var(--theia-foreground)", strokeWidth: "4" }),
    React.createElement("circle", { cx: "100", cy: "25", r: "6", fill: "var(--theia-foreground)" }),
    React.createElement("rect", { x: "40", y: "75", width: "15", height: "30", rx: "5", fill: "var(--theia-foreground)" }),
    React.createElement("rect", { x: "145", y: "75", width: "15", height: "30", rx: "5", fill: "var(--theia-foreground)" }),
    React.createElement("circle", { cx: "80", cy: "80", r: "10", fill: "var(--theia-editor-background)" }),
    React.createElement("circle", { cx: "120", cy: "80", r: "10", fill: "var(--theia-editor-background)" }),
    React.createElement("path", { d: "M85 105 Q100 120 115 105", fill: "none", stroke: "var(--theia-editor-background)", strokeWidth: "4", strokeLinecap: "round" }),
    React.createElement("rect", { x: "55", y: "135", width: "90", height: "30", rx: "5", fill: "var(--theia-foreground)" }),
    React.createElement("rect", { x: "60", y: "140", width: "10", height: "8", rx: "2", fill: "var(--theia-editor-background)" }),
    React.createElement("rect", { x: "75", y: "140", width: "10", height: "8", rx: "2", fill: "var(--theia-editor-background)" }),
    React.createElement("rect", { x: "90", y: "140", width: "10", height: "8", rx: "2", fill: "var(--theia-editor-background)" }),
    React.createElement("rect", { x: "105", y: "140", width: "10", height: "8", rx: "2", fill: "var(--theia-editor-background)" }),
    React.createElement("rect", { x: "120", y: "140", width: "10", height: "8", rx: "2", fill: "var(--theia-editor-background)" }),
    React.createElement("rect", { x: "65", y: "152", width: "50", height: "8", rx: "2", fill: "var(--theia-editor-background)" }),
    React.createElement("rect", { x: "120", y: "152", width: "10", height: "8", rx: "2", fill: "var(--theia-editor-background)" }));
let IdeChatWelcomeMessageProvider = class IdeChatWelcomeMessageProvider {
    commandRegistry;
    renderWelcomeMessage() {
        return React.createElement("div", { className: 'theia-WelcomeMessage' },
            React.createElement(TheiaIdeAiLogo, { width: 200, height: 200, className: "theia-WelcomeMessage-Logo" }),
            React.createElement("div", { className: "theia-WelcomeMessage-Content" },
                React.createElement("h1", null, "Ask the Theia IDE AI"),
                React.createElement("p", null,
                    "To talk to a specialized agent, simply start your message with ",
                    React.createElement("em", null, "@"),
                    " followed by the agent's name:",
                    ' ',
                    React.createElement("em", null, "@Coder"),
                    ", ",
                    React.createElement("em", null, "@Architect"),
                    ", ",
                    React.createElement("em", null, "@Universal"),
                    ", and more."),
                React.createElement("p", null,
                    "Attach context:  use variables, like ",
                    React.createElement("em", null, "#file"),
                    ", ",
                    React.createElement("em", null, "#_f"),
                    " (current file), ",
                    React.createElement("em", null, "#selectedText"),
                    ' ',
                    "or click ",
                    React.createElement("span", { className: "codicon codicon-add" }),
                    "."),
                React.createElement("p", null,
                    "Lean more in the ",
                    React.createElement("a", { target: '_blank', href: "https://theia-ide.org/docs/user_ai/#chat" }, "documentation"),
                    ".")));
    }
    renderDisabledMessage() {
        return React.createElement("div", { className: 'theia-ResponseNode' },
            React.createElement("div", { className: 'theia-ResponseNode-Content', key: 'disabled-message' },
                React.createElement("div", { className: "disable-message" },
                    React.createElement("span", { className: "section-header" }, nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/aiFeatureHeader', '🚀 AI Features Available (Beta Version)!')),
                    React.createElement("div", { className: "section-title" },
                        React.createElement("p", null,
                            React.createElement("code", null, nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/featuresDisabled', 'Currently, all AI Features are disabled!')))),
                    React.createElement("div", { className: "section-title" },
                        React.createElement("p", null, nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/howToEnable', 'How to Enable the AI Features:'))),
                    React.createElement("div", { className: "section-content" },
                        React.createElement("p", null,
                            "To enable the AI features, please go to the AI features section of the\u00A0",
                            this.renderLinkButton(nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/settingsMenu', 'the settings menu'), browser_1.CommonCommands.OPEN_PREFERENCES.id, 'ai-features'),
                            "\u00A0and"),
                        React.createElement("ol", null,
                            React.createElement("li", null,
                                "Toggle the switch for ",
                                React.createElement("strong", null, nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/aiFeaturesEnable', 'Ai-features: Enable')),
                                "."),
                            React.createElement("li", null,
                                "Provide at least one LLM provider (e.g. OpenAI). See ",
                                React.createElement("a", { href: "https://theia-ide.org/docs/user_ai/", target: "_blank" }, "the documentation"),
                                "\u00A0for more information.")),
                        React.createElement("p", null,
                            "This will activate the AI capabilities in the app. Please remember, these features are ",
                            React.createElement("strong", null, "in a beta state"),
                            ", so they may change and we are working on improving them \uD83D\uDEA7.",
                            React.createElement("br", null),
                            "Please support us by ",
                            React.createElement("a", { href: "https://github.com/eclipse-theia/theia" }, "providing feedback"),
                            "!")),
                    React.createElement("div", { className: "section-title" },
                        React.createElement("p", null, "Currently Supported Views and Features:")),
                    React.createElement("div", { className: "section-content" },
                        React.createElement("p", null, "Once the AI features are enabled, you can access the following views and features:"),
                        React.createElement("ul", null,
                            React.createElement("li", null, "Code Completion"),
                            React.createElement("li", null, "Terminal Assistance (via CTRL+I in a terminal)"),
                            React.createElement("li", null,
                                "This Chat View (features the following agents):",
                                React.createElement("ul", null,
                                    React.createElement("li", null, "Universal Chat Agent"),
                                    React.createElement("li", null, "Coder Chat Agent"),
                                    React.createElement("li", null, "Architect Chat Agent"),
                                    React.createElement("li", null, "Command Chat Agent"),
                                    React.createElement("li", null, "Orchestrator Chat Agent"))),
                            React.createElement("li", null, this.renderLinkButton(nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/aiHistoryView', 'AI History View'), 'aiHistory:open')),
                            React.createElement("li", null, this.renderLinkButton(nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/aiConfigurationView', 'AI Configuration View'), 'aiConfiguration:open'))),
                        React.createElement("p", null,
                            "See ",
                            React.createElement("a", { href: "https://theia-ide.org/docs/user_ai/", target: "_blank" }, "the documentation"),
                            " for more information.")))));
    }
    renderLinkButton(title, openCommandId, ...commandArgs) {
        return React.createElement("a", { role: 'button', tabIndex: 0, onClick: () => this.commandRegistry.executeCommand(openCommandId, ...commandArgs), onKeyDown: e => (0, chat_tree_view_1.isEnterKey)(e) && this.commandRegistry.executeCommand(openCommandId) }, title);
    }
};
exports.IdeChatWelcomeMessageProvider = IdeChatWelcomeMessageProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", Object)
], IdeChatWelcomeMessageProvider.prototype, "commandRegistry", void 0);
exports.IdeChatWelcomeMessageProvider = IdeChatWelcomeMessageProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], IdeChatWelcomeMessageProvider);
//# sourceMappingURL=ide-chat-welcome-message-provider.js.map