export interface SendRequestOptions {
	input: string;
	settings?: any;
}

export interface LlmProviderResponse {
	status: number;
	body: any;
}

export interface ILlmProvider {
	id: string;
	sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse>;
}
