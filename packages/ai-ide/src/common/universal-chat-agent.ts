// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/* eslint-disable @typescript-eslint/no-explicit-any, max-len */

import { LanguageModelRequirement, LanguageModel, LanguageModelMessage, LanguageModelResponse } from '@theia/ai-core/lib/common';
import { injectable, inject } from '@theia/core/shared/inversify';
import { LlmProviderService } from './llm-provider-service';
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { nls } from '@theia/core';
import { universalTemplate, universalTemplateVariant } from './universal-prompt-template';

export const UniversalChatAgentId = 'Universal';
@injectable()
export class UniversalChatAgent extends AbstractStreamParsingChatAgent {
   override id: string = UniversalChatAgentId;
   override name = UniversalChatAgentId;
   override languageModelRequirements: LanguageModelRequirement[] = [{
      purpose: 'chat',
      identifier: 'default/universal',
   }];
   protected override defaultLanguageModelPurpose: string = 'chat';
   override description = nls.localize('theia/ai/chat/universal/description', 'This agent is designed to help software developers by providing concise and accurate '
      + 'answers to general programming and software development questions. It is also the fall-back for any generic '
      + 'questions the user might ask. The universal agent currently does not have any context by default, i.e. it cannot '
      + 'access the current user context or the workspace.');

   override prompts = [{ id: 'universal-system', defaultVariant: universalTemplate, variants: [universalTemplateVariant] }];
   protected override systemPromptId: string = 'universal-system';

   private _llmProviderService?: LlmProviderService;
   @inject(LlmProviderService)
   protected set llmProviderService(v: LlmProviderService) { this._llmProviderService = v; }
   protected get llmProviderService(): LlmProviderService { if (!this._llmProviderService) { throw new Error('UniversalChatAgent: llmProviderService not injected'); } return this._llmProviderService; }

   protected override async sendLlmRequest(
      request: any,
      messages: LanguageModelMessage[],
      toolRequests: any[],
      languageModel: LanguageModel
   ): Promise<LanguageModelResponse> {
      const settings = { ...(this.getLlmSettings ? this.getLlmSettings() : {}), ...request.session?.settings };
      try {
       const svc: unknown = this.llmProviderService;
       const sendFn = ((): ((p?: unknown, o?: unknown) => Promise<unknown>) | undefined => {
          const maybe = svc as unknown as { sendRequestToProvider?: unknown };
          if (svc && typeof maybe.sendRequestToProvider === 'function') {
             return (maybe.sendRequestToProvider as Function).bind(svc) as unknown as (p?: unknown, o?: unknown) => Promise<unknown>;
          }
          return undefined;
       })();
       if (!sendFn) {
          throw new Error('LlmProviderService.sendRequestToProvider not available');
       }
       const resp = await sendFn(undefined, { input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'), settings });
       const normalizeProviderResp = (r: unknown): LanguageModelResponse => {
          if (r && typeof r === 'object') {
             const maybe = r as unknown as { status?: unknown; body?: unknown };
             const s = maybe.status;
             const body = maybe.body ?? r;
             const status = typeof s === 'number' ? s : 200;
             return { status, text: typeof body === 'string' ? body : JSON.stringify(body), raw: body } as unknown as LanguageModelResponse;
          }
          return { status: 200, text: typeof r === 'string' ? r : JSON.stringify(r), raw: r } as unknown as LanguageModelResponse;
       };
       return normalizeProviderResp(resp);
      } catch (e) {
         return this.languageModelService.sendRequest(languageModel, { messages, tools: toolRequests.length ? toolRequests : undefined, settings, agentId: this.id, sessionId: request.session.id, requestId: request.id, cancellationToken: request.response?.cancellationToken });
      }
   }
}
