import { expect } from 'chai';
import { ArchitectAgentNew } from '../../architect-agent-new';
import { CoderAgentNew } from '../../coder-agent-new';
import { ResearchAgent } from '../../research-agent';
import { AIDreamSystem } from '../../ai-dream-system';
import { CharacterMemoryBank } from '../../character-memory-bank';

describe('Agent Integration Tests', () => {
    let architectAgent: ArchitectAgentNew;
    let coderAgent: CoderAgentNew;
    let researchAgent: ResearchAgent;
    let dreamSystem: AIDreamSystem;
    let memoryBank: CharacterMemoryBank;
    let mockProviderService: any;

    beforeEach(() => {
        mockProviderService = {
            sendRequestToProvider: async () => ({
                content: 'Mock response',
                tokensIn: 100,
                tokensOut: 50,
                model: 'gpt-4'
            })
        };

        architectAgent = new ArchitectAgentNew(mockProviderService);
        coderAgent = new CoderAgentNew(mockProviderService);
        researchAgent = new ResearchAgent();
        dreamSystem = new AIDreamSystem();
        memoryBank = new CharacterMemoryBank();
    });

    describe('Research → Architect → Coder Flow', () => {
        it('should complete full workflow', async () => {
            // 1. Research
            const researchPlan = await researchAgent.createPlan(
                'microservices architecture',
                'medium'
            );
            researchPlan.userApproved = true;
            
            const research = await researchAgent.execute(researchPlan);
            expect(research.findings).to.have.length.above(0);

            // 2. Architect analyzes
            const architectResponse = await architectAgent.invoke({
                messages: [
                    { role: 'user', content: `Based on this research: ${research.summary}, suggest an architecture` }
                ]
            }, {
                preferredProvider: 'mock'
            });
            
            expect(architectResponse.content).to.be.a('string');
            expect(architectResponse.error).to.be.undefined;

            // 3. Coder implements
            const coderResponse = await coderAgent.invoke({
                messages: [
                    { role: 'user', content: `Implement this architecture: ${architectResponse.content}` }
                ]
            }, {
                preferredProvider: 'mock'
            });
            
            expect(coderResponse.content).to.be.a('string');
            expect(coderResponse.error).to.be.undefined;
        });
    });

    describe('Dream → Memory Flow', () => {
        it('should dream and save to memory', async () => {
            // 1. Dream about character
            const dream = await dreamSystem.dream(
                'Medieval warrior',
                'character'
            );
            
            expect(dream.qualityScore).to.be.above(0);
            expect(dream.visualizations).to.have.length.above(0);

            // 2. Save to memory
            const profile = await memoryBank.register({
                name: 'Medieval Warrior',
                type: 'character',
                visualFeatures: {
                    bodyProportions: { height: 1.8, proportions: { head: 1, torso: 3, arms: 2, legs: 4 } },
                    styleSignature: dream.visualizations[0].embedding,
                    colorPalette: [],
                    texturePatterns: []
                },
                referenceImages: [],
                blueprints: [],
                consistencyRules: [],
                versions: []
            });

            expect(profile.id).to.exist;
            expect(profile.name).to.equal('Medieval Warrior');

            // 3. Retrieve from memory
            const found = await memoryBank.search({
                name: 'warrior',
                minSimilarity: 0.5
            });

            expect(found).to.have.length(1);
            expect(found[0].name).to.equal('Medieval Warrior');
        });
    });

    describe('Error Handling', () => {
        it('should handle provider errors gracefully', async () => {
            mockProviderService.sendRequestToProvider = async () => {
                throw new Error('Provider error');
            };

            const response = await architectAgent.invoke({
                messages: [{ role: 'user', content: 'Test' }]
            }, {});

            expect(response.error).to.exist;
            expect(response.content).to.include('error');
        });

        it('should validate input', async () => {
            const response = await architectAgent.invoke({
                messages: [] // Empty messages
            } as any, {});

            expect(response.error).to.exist;
        });
    });

    describe('Memory Persistence', () => {
        it('should save and load memory bank', async () => {
            // Register profile
            await memoryBank.register({
                name: 'Test Character',
                type: 'character',
                visualFeatures: {
                    bodyProportions: { height: 1.8, proportions: { head: 1, torso: 3, arms: 2, legs: 4 } },
                    styleSignature: new Float32Array(512),
                    colorPalette: [],
                    texturePatterns: []
                },
                referenceImages: [],
                blueprints: [],
                consistencyRules: [],
                versions: []
            });

            // Save
            await memoryBank.save();

            // Create new instance and load
            const newMemoryBank = new CharacterMemoryBank();
            await newMemoryBank.load();

            const profiles = await newMemoryBank.search({ name: 'Test' });
            expect(profiles).to.have.length(1);
        });
    });

    describe('Streaming', () => {
        it('should support streaming responses', async () => {
            const deltas: string[] = [];

            mockProviderService.sendRequestWithStreaming = async (
                providerId: string,
                options: any,
                onDelta: (delta: any) => void
            ) => {
                // Simulate streaming
                ['Hello', ' ', 'World'].forEach(chunk => {
                    onDelta({ content: chunk });
                });

                return {
                    content: 'Hello World',
                    model: 'gpt-4',
                    tokensIn: 10,
                    tokensOut: 10
                };
            };

            // Note: Would need to update agents to support streaming callback
            // This is a placeholder for future implementation
        });
    });
});
