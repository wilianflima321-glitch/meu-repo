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
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("@testing-library/react");
// Import compiled widget (CommonJS) via ES import and cast to any
const _billingAdminModule = __importStar(require("../../lib/browser/admin/billing-admin-widget"));
const { BillingAdminWidget } = _billingAdminModule;
describe('BillingAdminWidget smoke', () => {
    beforeAll(() => {
        // mock global fetch to avoid network calls
        global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    });
    afterAll(() => {
        global.fetch = undefined;
    });
    it('renders without crashing and shows toolbar buttons', () => {
        const widget = new BillingAdminWidget();
        const node = widget.render();
        const { container } = (0, react_1.render)((0, jsx_runtime_1.jsx)("div", { children: node }));
        expect(container.querySelector('.billing-admin-toolbar')).toBeTruthy();
        expect(container.querySelector('button[aria-label="Refresh billing"]')).toBeTruthy();
    });
});
