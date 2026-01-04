"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const branding_copy_1 = require("../browser/branding/branding-copy");
describe('AiIdeBrandingWidget localization', () => {
    it('exposes the english copy by default', () => {
        const copy = (0, branding_copy_1.getBrandingCopy)();
        assert_1.strict.equal(copy.name, 'Aethel IDE');
        assert_1.strict.equal(copy.tagline, 'Orchestrate providers, agents, and AI tools with confidence');
        assert_1.strict.equal(copy.quickActions.providers.label, 'Providers');
        assert_1.strict.equal(copy.quickActions.providers.description, 'Configure LLM providers and credentials');
    });
});
