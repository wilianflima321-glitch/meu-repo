/**
 * Chat model types
 */

export interface MutableChatRequestModel {
    id: string;
    inputText?: string;
    session: {
        id: string;
        settings: any;
    };
    response: any & { cancellationToken?: any };
    addData(key: string, value: any): void;
    removeData(key: string): void;
    getDataByKey?(key: string): any;
    cancel(): void;
}

export interface ChatResponseContent {
    [key: string]: any;
}

export type CustomCallback = {
    label: string;
    callback: (...args: any[]) => any;
};

export class MarkdownChatResponseContentImpl implements ChatResponseContent {
    content: string;
    constructor(content: string);
}

export class ErrorChatResponseContentImpl implements ChatResponseContent {
    constructor(content: any);
}

export class QuestionResponseContentImpl implements ChatResponseContent {
    constructor(...args: any[]);
}

export class CommandChatResponseContentImpl implements ChatResponseContent {
    constructor(command: any, callback?: CustomCallback, args?: any[]);
}

export class HorizontalLayoutChatResponseContentImpl implements ChatResponseContent {
    constructor(children: ChatResponseContent[]);
}

export class InformationalChatResponseContentImpl {
    content: string;
    constructor(content: string);
}

