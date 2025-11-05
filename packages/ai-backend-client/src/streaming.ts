// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************

import {
  LanguageModelStreamResponsePart,
  TokenUsageService,
  UsageResponsePart,
} from '@theia/ai-core';

import type { ChatStreamChunk } from './index';

export interface BackendStreamContext {
  readonly modelId: string;
  readonly requestId?: string;
  readonly tokenUsageService?: TokenUsageService;
}

/**
 * Wraps the backend streaming payload and exposes it as a Theia language model iterator.
 */
export class BackendStreamingIterator
  implements AsyncIterableIterator<LanguageModelStreamResponsePart>
{
  private readonly queue: LanguageModelStreamResponsePart[] = [];
  private finished = false;

  constructor(
    private readonly source: AsyncGenerator<ChatStreamChunk, void, unknown>,
    private readonly cleanup: () => void,
    private readonly context: BackendStreamContext,
  ) {}

  [Symbol.asyncIterator](): AsyncIterableIterator<LanguageModelStreamResponsePart> {
    return this;
  }

  async next(): Promise<IteratorResult<LanguageModelStreamResponsePart>> {
    if (this.queue.length) {
      return { done: false, value: this.queue.shift()! };
    }

    if (this.finished) {
      return { done: true, value: undefined as any };
    }

    const { value, done } = await this.source.next();
    if (done || !value) {
      this.finish();
      return { done: true, value: undefined as any };
    }

    if (value.done) {
      this.finish();
      return { done: true, value: undefined as any };
    }

    const parts: LanguageModelStreamResponsePart[] = [];

    if (typeof value.content === 'string') {
      parts.push({ content: value.content });
    }

    if (value.usage) {
      const usagePart: UsageResponsePart = {
        input_tokens: value.usage.prompt_tokens ?? 0,
        output_tokens:
          value.usage.completion_tokens ??
          Math.max(
            (value.usage.total_tokens ?? 0) - (value.usage.prompt_tokens ?? 0),
            value.usage.completion_tokens ?? 0,
          ),
      };
      parts.push(usagePart);
      this.recordUsage(usagePart);
    }

    if (!parts.length) {
      return this.next();
    }

    if (parts.length > 1) {
      this.queue.push(...parts.slice(1));
    }

    return { done: false, value: parts[0] };
  }

  async return(): Promise<IteratorResult<LanguageModelStreamResponsePart>> {
    this.finish();
    if (this.source.return) {
      await this.source.return(undefined as never);
    }
    return { done: true, value: undefined as any };
  }

  private finish(): void {
    if (!this.finished) {
      this.finished = true;
      this.cleanup();
    }
  }

  private recordUsage(part: UsageResponsePart): void {
    const { tokenUsageService, modelId, requestId } = this.context;
    if (!tokenUsageService || !requestId) {
      return;
    }

    void tokenUsageService
      .recordTokenUsage(modelId, {
        inputTokens: part.input_tokens,
        outputTokens: part.output_tokens,
        requestId,
      })
      .catch((error: unknown) =>
        console.error('Error recording token usage:', error),
      );
  }
}
