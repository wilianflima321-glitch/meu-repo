import { injectable, inject } from '@theia/core/shared/inversify';
import { Agent, AgentRequest, AgentResponse, AgentContext } from './agent-base';
import { LlmProviderService } from './llm-provider-service';
import { createAgentLogger } from '../common/logger';
import { Validator } from '../common/validation';
import { AgentError } from '../common/errors';

@injectable()
export class CoderAgentNew extends Agent {
    
    static readonly ID = 'coder';
    static readonly NAME = 'Coder';
    static readonly DESCRIPTION = 'Expert in code generation, refactoring, and bug fixes';
    
    private readonly logger = createAgentLogger(CoderAgentNew.ID);
    
    private readonly SYSTEM_PROMPT = `You are an expert software engineer with deep knowledge of:
- Multiple programming languages (TypeScript, JavaScript, Python, Java, Go, Rust, etc.)
- Clean code principles and best practices
- Design patterns and SOLID principles
- Testing strategies (unit, integration, e2e)
- Code optimization and refactoring

Your role is to:
1. Write clean, maintainable, well-documented code
2. Refactor existing code to improve quality
3. Fix bugs and identify edge cases
4. Add appropriate error handling
5. Write tests for the code you generate

Always:
- Use proper type annotations
- Handle errors gracefully
- Write self-documenting code with clear variable names
- Add comments only for complex logic
- Consider edge cases and validation
- Follow the project's existing code style

When generating code:
- Provide complete, runnable implementations
- Include necessary imports
- Add error handling
- Consider performance implications
- Write accompanying tests when appropriate`;

    constructor(
        @inject(LlmProviderService) 
        protected readonly providerService: LlmProviderService
    ) {
        super(CoderAgentNew.ID, CoderAgentNew.NAME, providerService);
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
                userId: context.userId
            });

            // Analyze request to determine language and task
            const analysis = this.analyzeRequest(request.messages);

            // Build enhanced prompt with context
            const enhancedMessages = this.buildEnhancedPrompt(
                request.messages,
                analysis
            );

            // Call LLM provider
            const response = await this.providerService.sendRequestToProvider(
                context.preferredProvider,
                {
                    messages: [
                        { role: 'system', content: this.SYSTEM_PROMPT },
                        ...enhancedMessages
                    ],
                    temperature: 0.3, // Lower temperature for more consistent code
                    maxTokens: 3000
                }
            );

            const duration = Date.now() - startTime;
            
            this.logger.info('Request completed', {
                duration,
                contentLength: response.content?.length,
                tokensUsed: (response.tokensIn || 0) + (response.tokensOut || 0),
                language: analysis.language,
                taskType: analysis.taskType
            });

            return {
                agentId: this.id,
                content: response.content || 'No code generated.',
                metadata: {
                    tokensUsed: (response.tokensIn || 0) + (response.tokensOut || 0),
                    model: response.model,
                    provider: context.preferredProvider,
                    language: analysis.language,
                    taskType: analysis.taskType,
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
                content: 'I encountered an error while generating code. Please try again.',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private analyzeRequest(messages: AgentMessage[]): {
        language: string;
        taskType: string;
    } {
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage?.content?.toLowerCase() || '';

        // Detect language
        let language = 'typescript'; // default
        if (content.includes('python')) language = 'python';
        else if (content.includes('java')) language = 'java';
        else if (content.includes('go') || content.includes('golang')) language = 'go';
        else if (content.includes('rust')) language = 'rust';
        else if (content.includes('javascript') || content.includes('js')) language = 'javascript';

        // Detect task type
        let taskType = 'generate';
        if (content.includes('refactor')) taskType = 'refactor';
        else if (content.includes('fix') || content.includes('bug')) taskType = 'fix';
        else if (content.includes('test')) taskType = 'test';
        else if (content.includes('optimize')) taskType = 'optimize';
        else if (content.includes('review')) taskType = 'review';

        return { language, taskType };
    }

    private buildEnhancedPrompt(
        messages: AgentMessage[],
        analysis: { language: string; taskType: string }
    ): AgentMessage[] {
        const enhanced = [...messages];

        // Add language-specific context
        const languageContext = this.getLanguageContext(analysis.language);
        if (languageContext) {
            enhanced.push({
                role: 'system',
                content: languageContext
            });
        }

        // Add task-specific context
        const taskContext = this.getTaskContext(analysis.taskType);
        if (taskContext) {
            enhanced.push({
                role: 'system',
                content: taskContext
            });
        }

        return enhanced;
    }

    private getLanguageContext(language: string): string | null {
        const contexts: Record<string, string> = {
            typescript: 'Use TypeScript with strict type checking. Prefer interfaces over types for object shapes. Use async/await for asynchronous operations.',
            javascript: 'Use modern ES6+ syntax. Prefer const/let over var. Use arrow functions and destructuring where appropriate.',
            python: 'Follow PEP 8 style guide. Use type hints. Prefer list comprehensions and generators. Handle exceptions properly.',
            java: 'Follow Java naming conventions. Use proper access modifiers. Implement interfaces where appropriate. Handle checked exceptions.',
            go: 'Follow Go conventions. Use proper error handling (return error). Keep functions small and focused. Use defer for cleanup.',
            rust: 'Follow Rust conventions. Use proper ownership and borrowing. Handle Result and Option types. Avoid unsafe code unless necessary.'
        };

        return contexts[language] || null;
    }

    private getTaskContext(taskType: string): string | null {
        const contexts: Record<string, string> = {
            generate: 'Generate complete, production-ready code with proper error handling and validation.',
            refactor: 'Improve code quality while maintaining functionality. Focus on readability, maintainability, and performance.',
            fix: 'Identify the root cause of the bug. Fix it properly without introducing new issues. Add tests to prevent regression.',
            test: 'Write comprehensive tests covering happy paths, edge cases, and error conditions. Use appropriate testing framework.',
            optimize: 'Improve performance without sacrificing readability. Profile before optimizing. Document performance improvements.',
            review: 'Provide constructive feedback on code quality, potential bugs, security issues, and best practices.'
        };

        return contexts[taskType] || null;
    }
}
