module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Allow transforming some ESM packages under node_modules that ship modern JS
  transformIgnorePatterns: [
    "node_modules/(?!(vscode-languageserver-types|vscode-languageserver-protocol|vscode-languageserver|vscode-jsonrpc|whatwg-url|jsdom|@theia/core|@theia/editor|@theia/task)/)"
  ],
  moduleNameMapper: {
    "@theia/core/lib/browser/widgets/react-widget": "<rootDir>/__mocks__/react-widget.js",
    "@theia/core$": "<rootDir>/__mocks__/theia-core-mock.js",
    "@theia/core/(.*)": "<rootDir>/__mocks__/theia-core-mock.js",
    // Keep other @theia packages mapping explicit when needed
    "@theia/debug/lib/browser/debug-configuration-manager": "<rootDir>/__mocks__/debug-configuration-manager-mock.js",
    "@theia/debug/lib/browser/debug-session-manager": "<rootDir>/__mocks__/debug-session-manager-mock.js",
    "vscode-uri": "<rootDir>/__mocks__/vscode-uri.js",
    "@theia/core/lib/common/content-replacer": "<rootDir>/__mocks__/content-replacer-mock.js",
    "@theia/core/lib/common/uri": "<rootDir>/__mocks__/vscode-uri.js"
  }
};

// map CSS files to a mock so node_modules CSS doesn't break Jest
module.exports.moduleNameMapper['\.css$'] = '<rootDir>/__mocks__/style-mock.js';

