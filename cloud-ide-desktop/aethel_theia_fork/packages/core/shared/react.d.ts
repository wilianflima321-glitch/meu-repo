declare module '@theia/core/shared/react' {
	import * as React from 'react';
	export = React;
}

declare module '@theia/core/shared/react/jsx-runtime' {
	// Support for automatic JSX runtime imports if needed
	export * from 'react/jsx-runtime';
}
