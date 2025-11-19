"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("@testing-library/react");
const ai_ide_branding_widget_1 = require("../browser/branding/ai-ide-branding-widget");
const createShellStub = () => ({
    addWidget: jest.fn(),
    activateWidget: jest.fn()
});
const createWidgetManagerStub = () => ({
    getOrCreateWidget: jest.fn(async () => ({ isAttached: true, id: 'stub-widget' }))
});
const createSelectionServiceStub = () => ({
    selectConfigurationTab: jest.fn()
});
describe('AiIdeBrandingWidget localization', () => {
    it('renders the english copy by default', () => {
        const widget = new ai_ide_branding_widget_1.AiIdeBrandingWidget(createShellStub(), createWidgetManagerStub(), createSelectionServiceStub());
        widget.init();
        const node = widget.render();
        const { getByText } = (0, react_1.render)((0, jsx_runtime_1.jsx)("div", { children: node }));
        expect(getByText('Aethel IDE')).toBeTruthy();
        expect(getByText('Orchestrate providers, agents, and AI tools with confidence')).toBeTruthy();
        expect(getByText('Providers')).toBeTruthy();
    });
});
