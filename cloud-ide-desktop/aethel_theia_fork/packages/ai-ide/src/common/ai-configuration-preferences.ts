// Minimal preference schema for AI provider configuration.

export const AiConfigurationPreferences: any = {
	type: 'object',
	properties: {
		'ai.providers': {
			type: 'array',
			default: [],
			description: 'List of configured LLM providers.'
		},
		'ai.defaultProviderId': {
			type: 'string',
			default: '',
			description: 'Default provider id used for requests.'
		}
	}
};
