"use strict";
/**
 * Common Code Snippets
 * Professional snippets for major languages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSS_SNIPPETS = exports.HTML_SNIPPETS = exports.PYTHON_SNIPPETS = exports.JAVASCRIPT_SNIPPETS = exports.TYPESCRIPT_SNIPPETS = void 0;
exports.getSnippetsForLanguage = getSnippetsForLanguage;
exports.registerSnippets = registerSnippets;
exports.TYPESCRIPT_SNIPPETS = {
    'class': {
        prefix: 'class',
        body: [
            'class ${1:ClassName} {',
            '\tconstructor(${2:params}) {',
            '\t\t${3}',
            '\t}',
            '',
            '\t${4}',
            '}'
        ],
        description: 'Class definition'
    },
    'interface': {
        prefix: 'interface',
        body: [
            'interface ${1:InterfaceName} {',
            '\t${2:property}: ${3:type};',
            '}'
        ],
        description: 'Interface definition'
    },
    'function': {
        prefix: 'fn',
        body: [
            'function ${1:functionName}(${2:params}): ${3:void} {',
            '\t${4}',
            '}'
        ],
        description: 'Function definition'
    },
    'arrow': {
        prefix: 'af',
        body: [
            'const ${1:functionName} = (${2:params}): ${3:void} => {',
            '\t${4}',
            '};'
        ],
        description: 'Arrow function'
    },
    'async': {
        prefix: 'async',
        body: [
            'async ${1:functionName}(${2:params}): Promise<${3:void}> {',
            '\t${4}',
            '}'
        ],
        description: 'Async function'
    },
    'try': {
        prefix: 'try',
        body: [
            'try {',
            '\t${1}',
            '} catch (error) {',
            '\tconsole.error(${2:\'Error:\'}, error);',
            '\t${3}',
            '}'
        ],
        description: 'Try-catch block'
    },
    'test': {
        prefix: 'test',
        body: [
            'test(\'${1:description}\', async () => {',
            '\t${2}',
            '\texpect(${3:actual}).toBe(${4:expected});',
            '});'
        ],
        description: 'Test case'
    },
    'describe': {
        prefix: 'describe',
        body: [
            'describe(\'${1:suite}\', () => {',
            '\ttest(\'${2:test}\', () => {',
            '\t\t${3}',
            '\t});',
            '});'
        ],
        description: 'Test suite'
    }
};
exports.JAVASCRIPT_SNIPPETS = {
    'log': {
        prefix: 'log',
        body: ['console.log(${1:message});'],
        description: 'Console log'
    },
    'warn': {
        prefix: 'warn',
        body: ['console.warn(${1:message});'],
        description: 'Console warn'
    },
    'error': {
        prefix: 'error',
        body: ['console.error(${1:message});'],
        description: 'Console error'
    },
    'for': {
        prefix: 'for',
        body: [
            'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {',
            '\tconst ${3:element} = ${2:array}[${1:i}];',
            '\t${4}',
            '}'
        ],
        description: 'For loop'
    },
    'foreach': {
        prefix: 'foreach',
        body: [
            '${1:array}.forEach((${2:element}) => {',
            '\t${3}',
            '});'
        ],
        description: 'ForEach loop'
    },
    'map': {
        prefix: 'map',
        body: [
            '${1:array}.map((${2:element}) => {',
            '\treturn ${3:element};',
            '});'
        ],
        description: 'Map function'
    },
    'filter': {
        prefix: 'filter',
        body: [
            '${1:array}.filter((${2:element}) => {',
            '\treturn ${3:condition};',
            '});'
        ],
        description: 'Filter function'
    },
    'reduce': {
        prefix: 'reduce',
        body: [
            '${1:array}.reduce((${2:acc}, ${3:element}) => {',
            '\treturn ${4:acc};',
            '}, ${5:initialValue});'
        ],
        description: 'Reduce function'
    },
    'promise': {
        prefix: 'promise',
        body: [
            'new Promise((resolve, reject) => {',
            '\t${1}',
            '});'
        ],
        description: 'Promise'
    },
    'timeout': {
        prefix: 'timeout',
        body: [
            'setTimeout(() => {',
            '\t${1}',
            '}, ${2:1000});'
        ],
        description: 'SetTimeout'
    }
};
exports.PYTHON_SNIPPETS = {
    'class': {
        prefix: 'class',
        body: [
            'class ${1:ClassName}:',
            '\tdef __init__(self, ${2:params}):',
            '\t\t${3:pass}'
        ],
        description: 'Class definition'
    },
    'def': {
        prefix: 'def',
        body: [
            'def ${1:function_name}(${2:params}):',
            '\t${3:pass}'
        ],
        description: 'Function definition'
    },
    'for': {
        prefix: 'for',
        body: [
            'for ${1:item} in ${2:iterable}:',
            '\t${3:pass}'
        ],
        description: 'For loop'
    },
    'if': {
        prefix: 'if',
        body: [
            'if ${1:condition}:',
            '\t${2:pass}'
        ],
        description: 'If statement'
    },
    'try': {
        prefix: 'try',
        body: [
            'try:',
            '\t${1:pass}',
            'except ${2:Exception} as e:',
            '\tprint(f"Error: {e}")',
            '\t${3:pass}'
        ],
        description: 'Try-except block'
    },
    'with': {
        prefix: 'with',
        body: [
            'with ${1:expression} as ${2:variable}:',
            '\t${3:pass}'
        ],
        description: 'With statement'
    }
};
exports.HTML_SNIPPETS = {
    'html5': {
        prefix: '!',
        body: [
            '<!DOCTYPE html>',
            '<html lang="${1:en}">',
            '<head>',
            '\t<meta charset="UTF-8">',
            '\t<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '\t<title>${2:Document}</title>',
            '</head>',
            '<body>',
            '\t${3}',
            '</body>',
            '</html>'
        ],
        description: 'HTML5 boilerplate'
    },
    'div': {
        prefix: 'div',
        body: ['<div class="${1:className}">$2</div>'],
        description: 'Div element'
    },
    'button': {
        prefix: 'button',
        body: ['<button type="${1:button}" class="${2:className}">${3:Text}</button>'],
        description: 'Button element'
    },
    'input': {
        prefix: 'input',
        body: ['<input type="${1:text}" id="${2:id}" name="${3:name}" placeholder="${4:placeholder}">'],
        description: 'Input element'
    }
};
exports.CSS_SNIPPETS = {
    'flex': {
        prefix: 'flex',
        body: [
            'display: flex;',
            'justify-content: ${1:center};',
            'align-items: ${2:center};'
        ],
        description: 'Flexbox container'
    },
    'grid': {
        prefix: 'grid',
        body: [
            'display: grid;',
            'grid-template-columns: ${1:repeat(3, 1fr)};',
            'gap: ${2:16px};'
        ],
        description: 'Grid container'
    },
    'media': {
        prefix: 'media',
        body: [
            '@media (${1:max-width}: ${2:768px}) {',
            '\t${3}',
            '}'
        ],
        description: 'Media query'
    }
};
/**
 * Get snippets for language
 */
function getSnippetsForLanguage(languageId) {
    switch (languageId) {
        case 'typescript':
        case 'typescriptreact':
            return { ...exports.JAVASCRIPT_SNIPPETS, ...exports.TYPESCRIPT_SNIPPETS };
        case 'javascript':
        case 'javascriptreact':
            return exports.JAVASCRIPT_SNIPPETS;
        case 'python':
            return exports.PYTHON_SNIPPETS;
        case 'html':
            return exports.HTML_SNIPPETS;
        case 'css':
        case 'scss':
        case 'less':
            return exports.CSS_SNIPPETS;
        default:
            return {};
    }
}
/**
 * Register snippets with Monaco
 */
function registerSnippets(monaco) {
    const languages = ['typescript', 'javascript', 'python', 'html', 'css'];
    for (const lang of languages) {
        const snippets = getSnippetsForLanguage(lang);
        const completionItems = Object.entries(snippets).map(([key, snippet]) => ({
            label: snippet.prefix,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snippet.body.join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: snippet.description,
            detail: `(snippet) ${snippet.description}`
        }));
        monaco.languages.registerCompletionItemProvider(lang, {
            provideCompletionItems: () => ({ suggestions: completionItems })
        });
    }
}
