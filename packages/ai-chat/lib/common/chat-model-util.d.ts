import { ChatProgressMessage, ChatRequestModel, ChatResponse, ChatResponseContent, ChatResponseModel, QuestionResponseContent } from './chat-model';
export declare function lastResponseContent(request: ChatRequestModel): ChatResponseContent | undefined;
export declare function lastContentOfResponse(response: ChatResponse | undefined): ChatResponseContent | undefined;
export declare function lastProgressMessage(request: ChatRequestModel): ChatProgressMessage | undefined;
export declare function lastProgressMessageOfResponse(response: ChatResponseModel | undefined): ChatProgressMessage | undefined;
export declare function unansweredQuestions(request: ChatRequestModel): QuestionResponseContent[];
//# sourceMappingURL=chat-model-util.d.ts.map