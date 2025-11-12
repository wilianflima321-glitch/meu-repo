import { injectable, inject } from '@theia/core/shared/inversify';
import { Agent, AgentRequest, AgentResponse, AgentContext } from './agent-base';
import { LlmProviderService } from './llm-provider-service';
import { createAgentLogger } from '../common/logger';
import { Validator } from '../common/validation';
import { AgentError } from '../common/errors';

@injectable()
export class ArchitectAgentNew extends Agent {
    
    static readonly ID = 'architect';
    static readonly NAME = 'Architect';
    static readonly DESCRIPTION = 'Expert in software architecture and design patterns';
    
    private readonly logger = createAgentLogger(ArchitectAgentNew.ID);
    
    private readonly SYSTEM_PROMPT = `You are an expert software architect with deep knowledge of:
- Design patterns (GoF, Enterprise, Cloud)
- System architecture (Microservices, Monolith, Serverless)
- SOLID principles and clean architecture
- Scalability and performance optimization
- Security best practices

Your role is to:
1. Analyze system requirements and constraints
2. Suggest appropriate architectural patterns
3. Identify potential issues and bottlenecks
4. Recommend best practices
5. Provide clear, actionable guidance

Always consider:
- Maintainability and extensibility
- Performance implications
- Security concerns
- Cost optimization
- Team capabilities

Provide specific, actionable recommendations with code examples when appropriate.`;

    constructor(
        @inject(LlmProviderService) 
        protected readonly providerService: LlmProviderService
    ) {
        super(ArchitectAgentNew.ID, ArchitectAgentNew.NAME, providerService);
    }

    async invoke(
        request: AgentRequest,
        context: AgentContext
    ): Promise<AgentResponse> {
        const startTime = Date.now();
        
        try {
            // Validate input
            const messages = Validator.arrayMinMax(
                request.messages,
                'messages',
                this.id,
                1,
                100
            );

            this.logger.info('Request started', {
                messageCount: messages.length,
                userId: context.userId,
                provider: context.preferredProvider
            });

            // Build enhanced prompt with context
            const enhancedMessages = this.buildEnhancedPrompt(request.messages);

            // Call LLM provider
            const response = await this.providerService.sendRequestToProvider(
                context.preferredProvider,
                {
                    messages: [
                        { role: 'system', content: this.SYSTEM_PROMPT },
                        ...enhancedMessages
                    ],
                    temperature: 0.7,
                    maxTokens: 2000
                }
            );

            const duration = Date.now() - startTime;
            
            this.logger.info('Request completed', {
                duration,
                contentLength: response.content?.length,
                tokensIn: response.tokensIn,
                tokensOut: response.tokensOut,
                model: response.model
            });

            return {
                agentId: this.id,
                content: response.content || 'No response generated.',
                metadata: {
                    tokensUsed: (response.tokensIn || 0) + (response.tokensOut || 0),
                    model: response.model,
                    provider: context.preferredProvider,
                    duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.logger.error('Request failed', error as Error, {
                duration,
                userId: context.userId
            });

            if (error instanceof AgentError) {
                return {
                    agentId: this.id,
                    content: error.message,
                    error: error.code,
                    metadata: error.metadata
                };
            }

            return {
                agentId: this.id,
                content: 'I encountered an error while analyzing the architecture. Please try again.',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private buildEnhancedPrompt(messages: AgentMessage[]): AgentMessage[] {
        const enhanced = [...messages];

        // Add context about common patterns
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.content) {
            const content = lastMessage.content.toLowerCase();
            
            // Add relevant context based on keywords
            if (content.includes('microservice')) {
                enhanced.push({
                    role: 'system',
                    content: 'Consider: API Gateway, Service Discovery, Circuit Breaker, Event-Driven Architecture'
                });
            }
            
            if (content.includes('scale') || content.includes('performance')) {
                enhanced.push({
                    role: 'system',
                    content: 'Consider: Caching strategies, Load balancing, Database optimization, CDN usage'
                });
            }
            
            if (content.includes('security')) {
                enhanced.push({
                    role: 'system',
                    content: 'Consider: Authentication (JWT/OAuth2), Authorization (RBAC), Input validation, Encryption at rest and in transit'
                });
            }
        }

        return enhanced;
    }
}
