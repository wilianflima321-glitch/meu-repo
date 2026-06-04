import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import type { Message } from './advanced-ai-provider-contracts';

export function convertToOpenAI(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      result.push({
        role: 'tool',
        content: message.content,
        tool_call_id: message.toolCallId!,
      });
    } else if (message.role === 'user' && message.images && message.images.length > 0) {
      result.push({
        role: 'user',
        content: [
          { type: 'text', text: message.content },
          ...message.images.map((image) => ({
            type: 'image_url' as const,
            image_url: {
              url:
                image.type === 'base64'
                  ? `data:${image.mediaType || 'image/jpeg'};base64,${image.data}`
                  : image.data,
            },
          })),
        ],
      });
    } else if (message.role === 'system') {
      result.push({
        role: 'system',
        content: message.content,
      });
    } else if (message.role === 'assistant') {
      result.push({
        role: 'assistant',
        content: message.content,
      });
    } else {
      result.push({
        role: 'user',
        content: message.content,
      });
    }
  }

  return result;
}

export function convertToAnthropic(messages: Message[]): {
  system: string;
  messages: Anthropic.MessageParam[];
} {
  const systemMessage = messages.find((message) => message.role === 'system');
  const otherMessages = messages.filter((message) => message.role !== 'system');

  return {
    system: systemMessage?.content || '',
    messages: otherMessages.map((message) => {
      if (message.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: message.toolCallId!,
              content: message.content,
            },
          ],
        };
      }

      if (message.images && message.images.length > 0) {
        return {
          role: message.role as 'user' | 'assistant',
          content: [
            { type: 'text' as const, text: message.content },
            ...message.images.map((image) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: image.mediaType || 'image/jpeg',
                data: image.data,
              },
            })),
          ],
        };
      }

      return {
        role: message.role as 'user' | 'assistant',
        content: message.content,
      };
    }),
  };
}

export function convertToGoogle(messages: Message[]): {
  systemInstruction: string;
  contents: Array<{
    role: 'model' | 'user';
    parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  }>;
} {
  const systemMessage = messages.find((message) => message.role === 'system');
  const otherMessages = messages.filter((message) => message.role !== 'system');

  return {
    systemInstruction: systemMessage?.content || '',
    contents: otherMessages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: message.images?.length
        ? [
            { text: message.content },
            ...message.images.map((image) => ({
              inlineData: {
                mimeType: image.mediaType || 'image/jpeg',
                data: image.data,
              },
            })),
          ]
        : [{ text: message.content }],
    })),
  };
}
