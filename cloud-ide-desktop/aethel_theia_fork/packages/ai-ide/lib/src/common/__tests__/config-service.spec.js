"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const config_service_1 = require("../config/config-service");
describe('ConfigService', () => {
    let configService;
    beforeEach(async () => {
        configService = new config_service_1.ConfigService();
        await configService.load();
    });
    it('should load configuration', async () => {
        (0, chai_1.expect)(configService.isReady()).to.be.true;
    });
    it('should get configuration values', () => {
        const value = configService.get('llm.providers.openai.enabled', false);
        (0, chai_1.expect)(value).to.be.a('boolean');
    });
    it('should set configuration values', async () => {
        await configService.set('test.key', 'test-value', 'test-user');
        const value = configService.get('test.key');
        (0, chai_1.expect)(value).to.equal('test-value');
    });
    it('should get by category', () => {
        const llmConfigs = configService.getByCategory('llm');
        (0, chai_1.expect)(llmConfigs).to.be.an('array');
        (0, chai_1.expect)(llmConfigs.length).to.be.greaterThan(0);
    });
    it('should validate required fields', async () => {
        try {
            await configService.set('llm.providers.openai.apiKey', '', 'test-user');
            chai_1.expect.fail('Should have thrown validation error');
        }
        catch (error) {
            (0, chai_1.expect)(error.message).to.include('required');
        }
    });
    it('should track change history', async () => {
        await configService.set('test.key', 'value1', 'user1');
        await configService.set('test.key', 'value2', 'user2');
        const history = configService.getChangeHistory('test.key');
        (0, chai_1.expect)(history.length).to.equal(2);
        (0, chai_1.expect)(history[0].newValue).to.equal('value1');
        (0, chai_1.expect)(history[1].newValue).to.equal('value2');
    });
    it('should reset to default', async () => {
        await configService.set('llm.budget.default', 200, 'test-user');
        await configService.reset('llm.budget.default', 'test-user');
        const value = configService.get('llm.budget.default');
        (0, chai_1.expect)(value).to.equal(100); // Default value
    });
    it('should export configuration', () => {
        const exported = configService.export();
        (0, chai_1.expect)(exported).to.be.a('string');
        const parsed = JSON.parse(exported);
        (0, chai_1.expect)(parsed).to.have.property('version');
        (0, chai_1.expect)(parsed).to.have.property('configs');
    });
    it('should import configuration', async () => {
        const data = JSON.stringify({
            version: '1.0',
            timestamp: Date.now(),
            configs: [
                { key: 'test.import', value: 'imported-value', type: 'string', category: 'system' },
            ],
        });
        await configService.import(data, 'test-user');
        const value = configService.get('test.import');
        (0, chai_1.expect)(value).to.equal('imported-value');
    });
});
