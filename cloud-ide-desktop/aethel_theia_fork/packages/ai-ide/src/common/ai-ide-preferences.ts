// Minimal preference schema for ai-ide.
// The real Theia preference system accepts a JSON schema-like object.

export const aiIdePreferenceSchema: any = {
	type: 'object',
	properties: {
		'ai-ide.enabled': {
			type: 'boolean',
			default: true,
			description: 'Enable/disable AI IDE features.'
		}
	}
};
