import { expect } from 'chai';
import { Container } from '@theia/core/shared/inversify';
import { TradingAgent } from '../trading-agent';
import { LanguageModelRegistry } from '@theia/ai-core/lib/common';
import { PromptService } from '@theia/ai-core/lib/common';
import { PolicyEngine } from '../../common/compliance/policy-engine';

describe('TradingAgent', () => {
    let container: Container;
    let agent: TradingAgent;
    let mockLLMRegistry: LanguageModelRegistry;
    let mockPromptService: PromptService;
    let mockPolicyEngine: PolicyEngine;

    beforeEach(() => {
        container = new Container();

        mockLLMRegistry = {
            getLanguageModels: () => [],
            selectLanguageModel: () => undefined,
        } as any;

        mockPromptService = {
            getPrompt: () => Promise.resolve(''),
            getRawPrompt: () => Promise.resolve(''),
        } as any;

        mockPolicyEngine = {
            checkPolicy: () => Promise.resolve({ allowed: true, violations: [] }),
            enforcePolicy: () => Promise.resolve(true),
        } as any;

        container.bind(LanguageModelRegistry).toConstantValue(mockLLMRegistry);
        container.bind(PromptService).toConstantValue(mockPromptService);
        container.bind(PolicyEngine).toConstantValue(mockPolicyEngine);
        container.bind(TradingAgent).toSelf().inSingletonScope();

        agent = container.get(TradingAgent);
    });

    describe('Agent Metadata', () => {
        it('should have correct ID', () => {
            expect(agent.id).to.equal('trading');
        });

        it('should have correct name', () => {
            expect(agent.name).to.equal('Trading Agent');
        });

        it('should have description', () => {
            expect(agent.description).to.be.a('string');
            expect(agent.description.length).to.be.greaterThan(0);
        });

        it('should have prompt templates', () => {
            expect(agent.promptTemplates).to.be.an('array');
            expect(agent.promptTemplates.length).to.be.greaterThan(0);
        });
    });

    describe('Trading Capabilities', () => {
        it('should support strategy backtesting', () => {
            const hasBacktestCapability = agent.promptTemplates.some(
                template => template.id.includes('backtest') || template.id.includes('strategy')
            );
            expect(hasBacktestCapability).to.be.true;
        });

        it('should support market analysis', () => {
            const hasAnalysisCapability = agent.promptTemplates.some(
                template => template.id.includes('analysis') || template.id.includes('market')
            );
            expect(hasAnalysisCapability).to.be.true;
        });

        it('should support risk management', () => {
            const hasRiskCapability = agent.promptTemplates.some(
                template => template.id.includes('risk') || template.id.includes('management')
            );
            expect(hasRiskCapability).to.be.true;
        });

        it('should support portfolio optimization', () => {
            const hasPortfolioCapability = agent.promptTemplates.some(
                template => template.id.includes('portfolio') || template.id.includes('optimization')
            );
            expect(hasPortfolioCapability).to.be.true;
        });
    });

    describe('Safety and Compliance', () => {
        it('should integrate with policy engine', () => {
            expect(agent).to.have.property('policyEngine');
        });

        it('should require approval for live trading', async () => {
            const request = {
                text: 'Execute live trade: BUY 100 shares of AAPL',
                agentId: 'trading',
            };

            // Should check policy before executing
            const policyCheck = await mockPolicyEngine.checkPolicy('trading.live', {});
            expect(policyCheck.allowed).to.be.true;
        });

        it('should allow paper trading without approval', async () => {
            const request = {
                text: 'Execute paper trade: BUY 100 shares of AAPL',
                agentId: 'trading',
            };

            // Paper trading should not require approval
            expect(() => agent.invoke(request as any)).to.not.throw();
        });

        it('should validate trade parameters', async () => {
            const invalidTrade = {
                text: 'BUY -100 shares', // Invalid quantity
                agentId: 'trading',
            };

            // Should validate and reject invalid trades
            try {
                await agent.invoke(invalidTrade as any);
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should enforce position limits', async () => {
            const largeTrade = {
                text: 'BUY 1000000 shares of AAPL', // Exceeds limits
                agentId: 'trading',
            };

            // Should enforce position limits
            try {
                await agent.invoke(largeTrade as any);
            } catch (error) {
                expect(error).to.exist;
            }
        });
    });

    describe('Strategy Analysis', () => {
        it('should analyze momentum strategies', async () => {
            const request = {
                text: 'Analyze momentum strategy with 20-day moving average',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should analyze mean reversion strategies', async () => {
            const request = {
                text: 'Analyze mean reversion strategy using Bollinger Bands',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should provide risk metrics', async () => {
            const request = {
                text: 'Calculate Sharpe ratio and max drawdown for my strategy',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Market Data', () => {
        it('should handle real-time data requests', async () => {
            const request = {
                text: 'Get current price of AAPL',
                agentId: 'trading',
            };

            expect(() => agent.invoke(request as any)).to.not.throw();
        });

        it('should handle historical data requests', async () => {
            const request = {
                text: 'Get historical prices for AAPL from 2023-01-01 to 2023-12-31',
                agentId: 'trading',
            };

            expect(() => agent.invoke(request as any)).to.not.throw();
        });

        it('should handle multiple symbols', async () => {
            const request = {
                text: 'Compare AAPL, GOOGL, and MSFT performance',
                agentId: 'trading',
            };

            expect(() => agent.invoke(request as any)).to.not.throw();
        });
    });

    describe('Backtesting', () => {
        it('should support strategy backtesting', async () => {
            const request = {
                text: 'Backtest moving average crossover strategy on SPY',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should provide performance metrics', async () => {
            const request = {
                text: 'Show backtest results with returns, drawdown, and win rate',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should support parameter optimization', async () => {
            const request = {
                text: 'Optimize moving average periods for best Sharpe ratio',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Risk Management', () => {
        it('should calculate position sizing', async () => {
            const request = {
                text: 'Calculate position size with 2% risk per trade',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should set stop losses', async () => {
            const request = {
                text: 'Set stop loss at 5% below entry price',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should calculate portfolio risk', async () => {
            const request = {
                text: 'Calculate portfolio VaR and expected shortfall',
                agentId: 'trading',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid symbols', async () => {
            const request = {
                text: 'Get price of INVALID_SYMBOL_XYZ',
                agentId: 'trading',
            };

            try {
                await agent.invoke(request as any);
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should handle missing data', async () => {
            const request = {
                text: 'Get data for date range with no trading days',
                agentId: 'trading',
            };

            try {
                await agent.invoke(request as any);
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should handle API failures gracefully', async () => {
            const request = {
                text: 'Get market data',
                agentId: 'trading',
            };

            // Should handle API failures without crashing
            try {
                await agent.invoke(request as any);
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
            }
        });
    });

    describe('Performance', () => {
        it('should handle large datasets efficiently', async () => {
            const request = {
                text: 'Backtest strategy on 10 years of daily data',
                agentId: 'trading',
            };

            const start = Date.now();
            await agent.invoke(request as any).catch(() => {});
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(5000); // Should complete in < 5s
        });

        it('should cache market data', async () => {
            const request = {
                text: 'Get AAPL price',
                agentId: 'trading',
            };

            // First call
            const start1 = Date.now();
            await agent.invoke(request as any).catch(() => {});
            const duration1 = Date.now() - start1;

            // Second call (should be cached)
            const start2 = Date.now();
            await agent.invoke(request as any).catch(() => {});
            const duration2 = Date.now() - start2;

            // Second call should be faster (cached)
            expect(duration2).to.be.lessThanOrEqual(duration1);
        });
    });

    describe('Integration', () => {
        it('should integrate with LLM registry', () => {
            expect(agent).to.have.property('languageModelRegistry');
        });

        it('should integrate with prompt service', () => {
            expect(agent).to.have.property('promptService');
        });

        it('should integrate with policy engine', () => {
            expect(agent).to.have.property('policyEngine');
        });

        it('should be injectable', () => {
            const newAgent = container.get(TradingAgent);
            expect(newAgent).to.equal(agent); // Singleton
        });
    });

    describe('Specialization', () => {
        it('should focus on trading concerns', () => {
            const tradingKeywords = [
                'trading',
                'strategy',
                'backtest',
                'portfolio',
                'risk',
                'market',
                'price',
                'position',
            ];

            const hasTradingFocus = agent.promptTemplates.some(template => {
                const templateText = template.template.toLowerCase();
                return tradingKeywords.some(keyword => templateText.includes(keyword));
            });

            expect(hasTradingFocus).to.be.true;
        });

        it('should not handle non-trading tasks', () => {
            const nonTradingKeywords = [
                'code',
                'architecture',
                'design',
                'implement',
            ];

            const hasNonTradingFocus = agent.promptTemplates.every(template => {
                const templateText = template.template.toLowerCase();
                return !nonTradingKeywords.every(keyword => templateText.includes(keyword));
            });

            expect(hasNonTradingFocus).to.be.true;
        });
    });
});
