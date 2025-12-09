/**
 * Chat model types
 */

export interface MutableChatRequestModel {
    id: string;
    inputText?: string;
    session: {
        settings: any;
    };
    response: any;
    addData(key: string, value: any): void;
    removeData(key: string): void;
    getDataByKey?(key: string): any;
}

export class InformationalChatResponseContentImpl {
    content: string;
    constructor(content: string);
}
