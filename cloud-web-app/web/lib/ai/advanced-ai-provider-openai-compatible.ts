import type OpenAI from 'openai';

import { convertToOpenAI } from './advanced-ai-provider-adapters';
import { normalizeFinishReason, parseToolArguments } from './advanced-ai-provider-normalizers';
import type { CompletionOptions, CompletionResponse, Message } from './advanced-ai-provider-contracts';

export async function completeOpenAICompatible(
  client: OpenAI | null,
  provider: 'openai' | 'openrouter',
  messages: Message[],
  options: CompletionOptions,
): Promise<CompletionResponse> {
  if (provider === 'openai') {
        
        if (!client) throw new Error('OpenAI not configured');    
        
        const openaiMessages = convertToOpenAI(messages);    
        const tools = options.tools?.map(t => ({    
          type: 'function' as const,    
          function: {    
            name: t.name,    
            description: t.description,    
            parameters: t.parameters,    
          },    
        }));    
        
        const response = await client.chat.completions.create({    
          model: options.model!,    
          messages: openaiMessages,    
          temperature: options.temperature,    
          max_tokens: options.maxTokens,    
          top_p: options.topP,    
          frequency_penalty: options.frequencyPenalty,    
          presence_penalty: options.presencePenalty,    
          stop: options.stop,    
          tools: tools?.length ? tools : undefined,    
          tool_choice: options.toolChoice,    
          response_format: options.responseFormat,    
        });    
        
        const choice = response.choices[0];    
        const toolCalls = choice.message.tool_calls?.map(tc => ({    
          id: tc.id,    
          name: tc.function.name,    
          arguments: parseToolArguments(tc.function.arguments),    
        }));    
        
        return {    
          content: choice.message.content || '',    
          toolCalls,    
          finishReason: normalizeFinishReason(choice.finish_reason),    
          usage: {    
            promptTokens: response.usage?.prompt_tokens || 0,    
            completionTokens: response.usage?.completion_tokens || 0,    
            totalTokens: response.usage?.total_tokens || 0,    
          },    
          model: response.model,    
          provider: 'openai',    
          latencyMs: 0,    
        };    
  }

    
      if (!client) throw new Error('OpenRouter not configured');  
    
      const openaiMessages = convertToOpenAI(messages);  
      const tools = options.tools?.map(t => ({  
        type: 'function' as const,  
        function: {  
          name: t.name,  
          description: t.description,  
          parameters: t.parameters,  
        },  
      }));  
    
      const response = await client.chat.completions.create({  
        model: options.model!,  
        messages: openaiMessages,  
        temperature: options.temperature,  
        max_tokens: options.maxTokens,  
        top_p: options.topP,  
        frequency_penalty: options.frequencyPenalty,  
        presence_penalty: options.presencePenalty,  
        stop: options.stop,  
        tools: tools?.length ? tools : undefined,  
        tool_choice: options.toolChoice,  
        response_format: options.responseFormat,  
      });  
    
      const choice = response.choices[0];  
      const toolCalls = choice.message.tool_calls?.map(tc => ({  
        id: tc.id,  
        name: tc.function.name,  
        arguments: parseToolArguments(tc.function.arguments),  
      }));  
    
      return {  
        content: choice.message.content || '',  
        toolCalls,  
        finishReason: normalizeFinishReason(choice.finish_reason),  
        usage: {  
          promptTokens: response.usage?.prompt_tokens || 0,  
          completionTokens: response.usage?.completion_tokens || 0,  
          totalTokens: response.usage?.total_tokens || 0,  
        },  
        model: response.model,  
        provider: 'openrouter',  
        latencyMs: 0,  
      };  
}
