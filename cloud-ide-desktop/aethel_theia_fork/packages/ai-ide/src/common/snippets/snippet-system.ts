/**
 * Snippet System - Professional Code Snippet Infrastructure
 * 
 * Sistema de snippets de código profissional para IDE de produção.
 * Inspirado em VS Code Snippets, JetBrains Live Templates, TextMate.
 * Suporta:
 * - Snippets por linguagem
 * - Tab stops e placeholders
 * - Transformações de variáveis
 * - Nested placeholders
 * - Choice elements
 * - Variables (TM_FILENAME, etc.)
 * - User snippets
 * - Extension snippets
 * - Snippet scopes
 */

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Snippet Types ====================

/**
 * Snippet scope
 */
export enum SnippetScope {
    Global = 'global',
    Workspace = 'workspace',
    Language = 'language',
    File = 'file'
}

/**
 * Snippet source
 */
export enum SnippetSource {
    Builtin = 'builtin',
    User = 'user',
    Workspace = 'workspace',
    Extension = 'extension'
}

/**
 * Snippet variable
 */
export enum SnippetVariable {
    // File variables
    TM_FILENAME = 'TM_FILENAME',
    TM_FILENAME_BASE = 'TM_FILENAME_BASE',
    TM_DIRECTORY = 'TM_DIRECTORY',
    TM_FILEPATH = 'TM_FILEPATH',
    RELATIVE_FILEPATH = 'RELATIVE_FILEPATH',
    
    // Selection variables
    TM_SELECTED_TEXT = 'TM_SELECTED_TEXT',
    TM_CURRENT_LINE = 'TM_CURRENT_LINE',
    TM_CURRENT_WORD = 'TM_CURRENT_WORD',
    
    // Line variables
    TM_LINE_INDEX = 'TM_LINE_INDEX',
    TM_LINE_NUMBER = 'TM_LINE_NUMBER',
    
    // Cursor variables
    CURSOR_INDEX = 'CURSOR_INDEX',
    CURSOR_NUMBER = 'CURSOR_NUMBER',
    
    // Date/Time variables
    CURRENT_YEAR = 'CURRENT_YEAR',
    CURRENT_YEAR_SHORT = 'CURRENT_YEAR_SHORT',
    CURRENT_MONTH = 'CURRENT_MONTH',
    CURRENT_MONTH_NAME = 'CURRENT_MONTH_NAME',
    CURRENT_MONTH_NAME_SHORT = 'CURRENT_MONTH_NAME_SHORT',
    CURRENT_DATE = 'CURRENT_DATE',
    CURRENT_DAY_NAME = 'CURRENT_DAY_NAME',
    CURRENT_DAY_NAME_SHORT = 'CURRENT_DAY_NAME_SHORT',
    CURRENT_HOUR = 'CURRENT_HOUR',
    CURRENT_MINUTE = 'CURRENT_MINUTE',
    CURRENT_SECOND = 'CURRENT_SECOND',
    CURRENT_SECONDS_UNIX = 'CURRENT_SECONDS_UNIX',
    CURRENT_TIMEZONE_OFFSET = 'CURRENT_TIMEZONE_OFFSET',
    
    // Random variables
    RANDOM = 'RANDOM',
    RANDOM_HEX = 'RANDOM_HEX',
    UUID = 'UUID',
    
    // Comment variables
    BLOCK_COMMENT_START = 'BLOCK_COMMENT_START',
    BLOCK_COMMENT_END = 'BLOCK_COMMENT_END',
    LINE_COMMENT = 'LINE_COMMENT',
    
    // Clipboard
    CLIPBOARD = 'CLIPBOARD',
    
    // Workspace
    WORKSPACE_NAME = 'WORKSPACE_NAME',
    WORKSPACE_FOLDER = 'WORKSPACE_FOLDER'
}

/**
 * Tab stop
 */
export interface TabStop {
    index: number;
    placeholder?: string;
    choices?: string[];
    transform?: SnippetTransform;
    nested?: TabStop[];
}

/**
 * Snippet transform
 */
export interface SnippetTransform {
    regex: string;
    replacement: string;
    options?: string;
}

/**
 * Snippet definition
 */
export interface SnippetDefinition {
    id: string;
    name: string;
    prefix: string | string[];
    body: string | string[];
    description?: string;
    
    // Scope
    scope?: string | string[];
    languages?: string[];
    
    // Source
    source: SnippetSource;
    extensionId?: string;
    
    // Metadata
    isFileTemplate?: boolean;
    sortText?: string;
    
    // Usage tracking
    usageCount?: number;
    lastUsed?: number;
}

/**
 * Parsed snippet
 */
export interface ParsedSnippet {
    definition: SnippetDefinition;
    tabStops: TabStop[];
    variables: Map<string, VariableReference>;
    finalCursorPosition?: number;
    text: string;
}

/**
 * Variable reference
 */
export interface VariableReference {
    name: string;
    default?: string;
    transform?: SnippetTransform;
}

/**
 * Snippet insertion context
 */
export interface InsertionContext {
    // File info
    fileName?: string;
    filePath?: string;
    directory?: string;
    relativePath?: string;
    workspaceName?: string;
    workspaceFolder?: string;
    
    // Editor state
    selectedText?: string;
    currentLine?: string;
    currentWord?: string;
    lineIndex?: number;
    lineNumber?: number;
    cursorIndex?: number;
    cursorNumber?: number;
    clipboard?: string;
    
    // Language
    languageId?: string;
    blockCommentStart?: string;
    blockCommentEnd?: string;
    lineComment?: string;
    
    // Custom variables
    customVariables?: Record<string, string>;
}

/**
 * Snippet completion
 */
export interface SnippetCompletion {
    snippet: SnippetDefinition;
    prefix: string;
    score: number;
}

/**
 * Active snippet session
 */
export interface SnippetSession {
    id: string;
    snippet: ParsedSnippet;
    startPosition: Position;
    endPosition: Position;
    currentTabStop: number;
    tabStopPositions: TabStopPosition[];
    isActive: boolean;
}

/**
 * Position
 */
export interface Position {
    line: number;
    character: number;
}

/**
 * Tab stop position
 */
export interface TabStopPosition {
    index: number;
    range: Range;
    placeholder?: string;
}

/**
 * Range
 */
export interface Range {
    start: Position;
    end: Position;
}

/**
 * Snippet file
 */
export interface SnippetFile {
    path: string;
    scope: SnippetScope;
    source: SnippetSource;
    languages?: string[];
    snippets: SnippetDefinition[];
    lastModified?: number;
}

// ==================== Events ====================

export interface SnippetInsertedEvent {
    snippet: SnippetDefinition;
    session: SnippetSession;
}

export interface SnippetSessionEndedEvent {
    session: SnippetSession;
    completed: boolean;
}

export interface SnippetFileChangedEvent {
    file: SnippetFile;
    action: 'added' | 'modified' | 'removed';
}

// ==================== Main Snippet System ====================

@injectable()
export class SnippetSystem {
    // Snippets storage
    private readonly snippets: Map<string, SnippetDefinition> = new Map();
    private readonly snippetsByLanguage: Map<string, Set<string>> = new Map();
    private readonly snippetsByPrefix: Map<string, Set<string>> = new Map();
    
    // Files
    private readonly snippetFiles: Map<string, SnippetFile> = new Map();
    
    // Active sessions
    private readonly activeSessions: Map<string, SnippetSession> = new Map();
    private sessionIdCounter = 0;
    
    // Paths
    private userSnippetsPath: string = '';
    private workspaceSnippetsPath: string = '';
    
    // Events
    private readonly onInsertedEmitter = new Emitter<SnippetInsertedEvent>();
    readonly onInserted: Event<SnippetInsertedEvent> = this.onInsertedEmitter.event;
    
    private readonly onSessionEndedEmitter = new Emitter<SnippetSessionEndedEvent>();
    readonly onSessionEnded: Event<SnippetSessionEndedEvent> = this.onSessionEndedEmitter.event;
    
    private readonly onFileChangedEmitter = new Emitter<SnippetFileChangedEvent>();
    readonly onFileChanged: Event<SnippetFileChangedEvent> = this.onFileChangedEmitter.event;

    constructor() {
        this.registerBuiltinSnippets();
    }

    // ==================== Initialization ====================

    /**
     * Initialize snippet system
     */
    async initialize(config: {
        userSnippetsPath: string;
        workspaceSnippetsPath?: string;
    }): Promise<void> {
        this.userSnippetsPath = config.userSnippetsPath;
        this.workspaceSnippetsPath = config.workspaceSnippetsPath || '';
        
        // Load user snippets
        await this.loadUserSnippets();
        
        // Load workspace snippets
        if (this.workspaceSnippetsPath) {
            await this.loadWorkspaceSnippets();
        }
    }

    // ==================== Builtin Snippets ====================

    /**
     * Register builtin snippets
     */
    private registerBuiltinSnippets(): void {
        // TypeScript/JavaScript snippets
        this.registerSnippetsForLanguage(['typescript', 'javascript', 'typescriptreact', 'javascriptreact'], [
            {
                id: 'console-log',
                name: 'Console Log',
                prefix: ['log', 'cl'],
                body: 'console.log($1);',
                description: 'Log to console',
                source: SnippetSource.Builtin
            },
            {
                id: 'console-error',
                name: 'Console Error',
                prefix: 'cerr',
                body: 'console.error($1);',
                description: 'Log error to console',
                source: SnippetSource.Builtin
            },
            {
                id: 'function',
                name: 'Function',
                prefix: ['fn', 'func'],
                body: [
                    'function ${1:name}(${2:params}) {',
                    '\t$0',
                    '}'
                ],
                description: 'Function declaration',
                source: SnippetSource.Builtin
            },
            {
                id: 'arrow-function',
                name: 'Arrow Function',
                prefix: ['af', 'arrow'],
                body: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
                description: 'Arrow function',
                source: SnippetSource.Builtin
            },
            {
                id: 'async-function',
                name: 'Async Function',
                prefix: 'afn',
                body: [
                    'async function ${1:name}(${2:params}) {',
                    '\t$0',
                    '}'
                ],
                description: 'Async function declaration',
                source: SnippetSource.Builtin
            },
            {
                id: 'try-catch',
                name: 'Try Catch',
                prefix: ['try', 'tc'],
                body: [
                    'try {',
                    '\t$1',
                    '} catch (${2:error}) {',
                    '\t$0',
                    '}'
                ],
                description: 'Try-catch block',
                source: SnippetSource.Builtin
            },
            {
                id: 'import',
                name: 'Import',
                prefix: 'imp',
                body: "import { $2 } from '$1';",
                description: 'Import statement',
                source: SnippetSource.Builtin
            },
            {
                id: 'import-default',
                name: 'Import Default',
                prefix: 'impd',
                body: "import $2 from '$1';",
                description: 'Import default',
                source: SnippetSource.Builtin
            },
            {
                id: 'export-default',
                name: 'Export Default',
                prefix: 'expd',
                body: 'export default $1;',
                description: 'Export default',
                source: SnippetSource.Builtin
            },
            {
                id: 'class',
                name: 'Class',
                prefix: 'class',
                body: [
                    'class ${1:ClassName} {',
                    '\tconstructor(${2:params}) {',
                    '\t\t$0',
                    '\t}',
                    '}'
                ],
                description: 'Class declaration',
                source: SnippetSource.Builtin
            },
            {
                id: 'interface',
                name: 'Interface',
                prefix: 'int',
                body: [
                    'interface ${1:InterfaceName} {',
                    '\t$0',
                    '}'
                ],
                description: 'Interface declaration',
                languages: ['typescript', 'typescriptreact'],
                source: SnippetSource.Builtin
            },
            {
                id: 'type',
                name: 'Type Alias',
                prefix: 'type',
                body: 'type ${1:TypeName} = $0;',
                description: 'Type alias',
                languages: ['typescript', 'typescriptreact'],
                source: SnippetSource.Builtin
            },
            {
                id: 'foreach',
                name: 'For Each',
                prefix: 'foreach',
                body: '${1:array}.forEach((${2:item}) => {\n\t$0\n});',
                description: 'Array forEach',
                source: SnippetSource.Builtin
            },
            {
                id: 'map',
                name: 'Array Map',
                prefix: 'map',
                body: '${1:array}.map((${2:item}) => $0)',
                description: 'Array map',
                source: SnippetSource.Builtin
            },
            {
                id: 'filter',
                name: 'Array Filter',
                prefix: 'filter',
                body: '${1:array}.filter((${2:item}) => $0)',
                description: 'Array filter',
                source: SnippetSource.Builtin
            },
            {
                id: 'reduce',
                name: 'Array Reduce',
                prefix: 'reduce',
                body: '${1:array}.reduce((${2:acc}, ${3:item}) => {\n\t$0\n\treturn ${2:acc};\n}, ${4:initialValue})',
                description: 'Array reduce',
                source: SnippetSource.Builtin
            }
        ]);

        // React snippets
        this.registerSnippetsForLanguage(['typescriptreact', 'javascriptreact'], [
            {
                id: 'react-component',
                name: 'React Functional Component',
                prefix: ['rfc', 'comp'],
                body: [
                    "import React from 'react';",
                    '',
                    'interface ${1:${TM_FILENAME_BASE}}Props {',
                    '\t$2',
                    '}',
                    '',
                    'export const ${1:${TM_FILENAME_BASE}}: React.FC<${1:${TM_FILENAME_BASE}}Props> = ({ $3 }) => {',
                    '\treturn (',
                    '\t\t<div>',
                    '\t\t\t$0',
                    '\t\t</div>',
                    '\t);',
                    '};'
                ],
                description: 'React functional component with TypeScript',
                source: SnippetSource.Builtin
            },
            {
                id: 'use-state',
                name: 'useState Hook',
                prefix: 'ust',
                body: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initialValue});',
                description: 'React useState hook',
                source: SnippetSource.Builtin
            },
            {
                id: 'use-effect',
                name: 'useEffect Hook',
                prefix: 'uef',
                body: [
                    'useEffect(() => {',
                    '\t$0',
                    '}, [${1:dependencies}]);'
                ],
                description: 'React useEffect hook',
                source: SnippetSource.Builtin
            },
            {
                id: 'use-memo',
                name: 'useMemo Hook',
                prefix: 'umm',
                body: 'const ${1:memoized} = useMemo(() => $2, [$3]);',
                description: 'React useMemo hook',
                source: SnippetSource.Builtin
            },
            {
                id: 'use-callback',
                name: 'useCallback Hook',
                prefix: 'ucb',
                body: [
                    'const ${1:callback} = useCallback(($2) => {',
                    '\t$0',
                    '}, [$3]);'
                ],
                description: 'React useCallback hook',
                source: SnippetSource.Builtin
            },
            {
                id: 'use-ref',
                name: 'useRef Hook',
                prefix: 'urf',
                body: 'const ${1:ref} = useRef<${2:HTMLDivElement}>(${3:null});',
                description: 'React useRef hook',
                source: SnippetSource.Builtin
            },
            {
                id: 'use-context',
                name: 'useContext Hook',
                prefix: 'ucx',
                body: 'const ${1:context} = useContext(${2:Context});',
                description: 'React useContext hook',
                source: SnippetSource.Builtin
            }
        ]);

        // Python snippets
        this.registerSnippetsForLanguage(['python'], [
            {
                id: 'def',
                name: 'Function Definition',
                prefix: 'def',
                body: [
                    'def ${1:function_name}(${2:params})${3: -> ${4:return_type}}:',
                    '\t"""${5:Docstring}"""',
                    '\t${0:pass}'
                ],
                description: 'Python function definition',
                source: SnippetSource.Builtin
            },
            {
                id: 'async-def',
                name: 'Async Function',
                prefix: 'adef',
                body: [
                    'async def ${1:function_name}(${2:params})${3: -> ${4:return_type}}:',
                    '\t"""${5:Docstring}"""',
                    '\t${0:pass}'
                ],
                description: 'Python async function',
                source: SnippetSource.Builtin
            },
            {
                id: 'class-python',
                name: 'Class',
                prefix: 'class',
                body: [
                    'class ${1:ClassName}:',
                    '\t"""${2:Docstring}"""',
                    '\t',
                    '\tdef __init__(self${3:, params})${4: -> None}:',
                    '\t\t${0:pass}'
                ],
                description: 'Python class',
                source: SnippetSource.Builtin
            },
            {
                id: 'dataclass',
                name: 'Dataclass',
                prefix: 'dataclass',
                body: [
                    'from dataclasses import dataclass',
                    '',
                    '@dataclass',
                    'class ${1:ClassName}:',
                    '\t${2:field}: ${3:type}',
                    '\t$0'
                ],
                description: 'Python dataclass',
                source: SnippetSource.Builtin
            },
            {
                id: 'try-except',
                name: 'Try Except',
                prefix: 'try',
                body: [
                    'try:',
                    '\t${1:pass}',
                    'except ${2:Exception} as ${3:e}:',
                    '\t${0:pass}'
                ],
                description: 'Python try-except',
                source: SnippetSource.Builtin
            },
            {
                id: 'with',
                name: 'With Statement',
                prefix: 'with',
                body: [
                    'with ${1:expression} as ${2:target}:',
                    '\t${0:pass}'
                ],
                description: 'Python with statement',
                source: SnippetSource.Builtin
            },
            {
                id: 'list-comprehension',
                name: 'List Comprehension',
                prefix: 'lc',
                body: '[${1:expression} for ${2:item} in ${3:iterable}${4: if ${5:condition}}]',
                description: 'Python list comprehension',
                source: SnippetSource.Builtin
            },
            {
                id: 'dict-comprehension',
                name: 'Dict Comprehension',
                prefix: 'dc',
                body: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}${5: if ${6:condition}}}',
                description: 'Python dict comprehension',
                source: SnippetSource.Builtin
            },
            {
                id: 'if-main',
                name: 'If Main',
                prefix: 'ifmain',
                body: [
                    'if __name__ == "__main__":',
                    '\t${0:main()}'
                ],
                description: 'Python if __name__ == "__main__"',
                source: SnippetSource.Builtin
            }
        ]);

        // C# snippets
        this.registerSnippetsForLanguage(['csharp'], [
            {
                id: 'class-csharp',
                name: 'Class',
                prefix: 'class',
                body: [
                    '${1|public,private,protected,internal|} class ${2:ClassName}',
                    '{',
                    '\t$0',
                    '}'
                ],
                description: 'C# class',
                source: SnippetSource.Builtin
            },
            {
                id: 'interface-csharp',
                name: 'Interface',
                prefix: 'interface',
                body: [
                    'public interface I${1:InterfaceName}',
                    '{',
                    '\t$0',
                    '}'
                ],
                description: 'C# interface',
                source: SnippetSource.Builtin
            },
            {
                id: 'prop',
                name: 'Property',
                prefix: 'prop',
                body: 'public ${1:int} ${2:PropertyName} { get; set; }',
                description: 'C# auto property',
                source: SnippetSource.Builtin
            },
            {
                id: 'propfull',
                name: 'Full Property',
                prefix: 'propfull',
                body: [
                    'private ${1:int} _${2:propertyName};',
                    'public ${1:int} ${2/(.*)/${1:/capitalize}/}',
                    '{',
                    '\tget { return _${2:propertyName}; }',
                    '\tset { _${2:propertyName} = value; }',
                    '}'
                ],
                description: 'C# full property',
                source: SnippetSource.Builtin
            },
            {
                id: 'ctor',
                name: 'Constructor',
                prefix: 'ctor',
                body: [
                    'public ${1:ClassName}(${2:parameters})',
                    '{',
                    '\t$0',
                    '}'
                ],
                description: 'C# constructor',
                source: SnippetSource.Builtin
            },
            {
                id: 'async-method',
                name: 'Async Method',
                prefix: 'asyncm',
                body: [
                    'public async Task${1:<${2:T}>} ${3:MethodName}Async(${4:parameters})',
                    '{',
                    '\t$0',
                    '}'
                ],
                description: 'C# async method',
                source: SnippetSource.Builtin
            },
            {
                id: 'unity-start',
                name: 'Unity Start',
                prefix: 'start',
                body: [
                    'void Start()',
                    '{',
                    '\t$0',
                    '}'
                ],
                description: 'Unity Start method',
                source: SnippetSource.Builtin
            },
            {
                id: 'unity-update',
                name: 'Unity Update',
                prefix: 'update',
                body: [
                    'void Update()',
                    '{',
                    '\t$0',
                    '}'
                ],
                description: 'Unity Update method',
                source: SnippetSource.Builtin
            },
            {
                id: 'unity-awake',
                name: 'Unity Awake',
                prefix: 'awake',
                body: [
                    'void Awake()',
                    '{',
                    '\t$0',
                    '}'
                ],
                description: 'Unity Awake method',
                source: SnippetSource.Builtin
            }
        ]);

        // C++ snippets
        this.registerSnippetsForLanguage(['cpp', 'c'], [
            {
                id: 'include',
                name: 'Include',
                prefix: 'inc',
                body: '#include <${1:iostream}>',
                description: 'Include directive',
                source: SnippetSource.Builtin
            },
            {
                id: 'include-local',
                name: 'Include Local',
                prefix: 'incl',
                body: '#include "${1:header.h}"',
                description: 'Include local header',
                source: SnippetSource.Builtin
            },
            {
                id: 'class-cpp',
                name: 'Class',
                prefix: 'class',
                body: [
                    'class ${1:ClassName} {',
                    'public:',
                    '\t${1:ClassName}();',
                    '\t~${1:ClassName}();',
                    '',
                    'private:',
                    '\t$0',
                    '};'
                ],
                description: 'C++ class',
                source: SnippetSource.Builtin
            },
            {
                id: 'struct',
                name: 'Struct',
                prefix: 'struct',
                body: [
                    'struct ${1:StructName} {',
                    '\t$0',
                    '};'
                ],
                description: 'C++ struct',
                source: SnippetSource.Builtin
            },
            {
                id: 'main',
                name: 'Main Function',
                prefix: 'main',
                body: [
                    'int main(int argc, char* argv[]) {',
                    '\t$0',
                    '\treturn 0;',
                    '}'
                ],
                description: 'C++ main function',
                source: SnippetSource.Builtin
            },
            {
                id: 'for-cpp',
                name: 'For Loop',
                prefix: 'for',
                body: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n\t$0\n}',
                description: 'C++ for loop',
                source: SnippetSource.Builtin
            },
            {
                id: 'foreach-cpp',
                name: 'Range For Loop',
                prefix: 'foreach',
                body: 'for (auto& ${1:item} : ${2:container}) {\n\t$0\n}',
                description: 'C++ range-based for loop',
                source: SnippetSource.Builtin
            },
            {
                id: 'template',
                name: 'Template',
                prefix: 'template',
                body: [
                    'template <typename ${1:T}>',
                    '$0'
                ],
                description: 'C++ template',
                source: SnippetSource.Builtin
            }
        ]);

        // GLSL/HLSL snippets
        this.registerSnippetsForLanguage(['glsl', 'hlsl'], [
            {
                id: 'vertex-shader',
                name: 'Vertex Shader',
                prefix: 'vert',
                body: [
                    '#version ${1:450}',
                    '',
                    'layout(location = 0) in vec3 aPosition;',
                    'layout(location = 1) in vec2 aTexCoord;',
                    '',
                    'uniform mat4 uModelViewProjection;',
                    '',
                    'out vec2 vTexCoord;',
                    '',
                    'void main() {',
                    '\tvTexCoord = aTexCoord;',
                    '\tgl_Position = uModelViewProjection * vec4(aPosition, 1.0);',
                    '}'
                ],
                description: 'Basic vertex shader',
                source: SnippetSource.Builtin
            },
            {
                id: 'fragment-shader',
                name: 'Fragment Shader',
                prefix: 'frag',
                body: [
                    '#version ${1:450}',
                    '',
                    'in vec2 vTexCoord;',
                    '',
                    'uniform sampler2D uTexture;',
                    '',
                    'out vec4 FragColor;',
                    '',
                    'void main() {',
                    '\tFragColor = texture(uTexture, vTexCoord);',
                    '}'
                ],
                description: 'Basic fragment shader',
                source: SnippetSource.Builtin
            }
        ]);

        // GDScript snippets
        this.registerSnippetsForLanguage(['gdscript'], [
            {
                id: 'extends',
                name: 'Extends',
                prefix: 'ext',
                body: 'extends ${1:Node}',
                description: 'Godot extends statement',
                source: SnippetSource.Builtin
            },
            {
                id: 'func',
                name: 'Function',
                prefix: 'func',
                body: [
                    'func ${1:function_name}(${2:params})${3: -> ${4:void}}:',
                    '\t${0:pass}'
                ],
                description: 'GDScript function',
                source: SnippetSource.Builtin
            },
            {
                id: 'ready',
                name: 'Ready',
                prefix: 'ready',
                body: [
                    'func _ready() -> void:',
                    '\t$0'
                ],
                description: 'Godot _ready function',
                source: SnippetSource.Builtin
            },
            {
                id: 'process',
                name: 'Process',
                prefix: 'process',
                body: [
                    'func _process(delta: float) -> void:',
                    '\t$0'
                ],
                description: 'Godot _process function',
                source: SnippetSource.Builtin
            },
            {
                id: 'physics-process',
                name: 'Physics Process',
                prefix: 'physics',
                body: [
                    'func _physics_process(delta: float) -> void:',
                    '\t$0'
                ],
                description: 'Godot _physics_process function',
                source: SnippetSource.Builtin
            },
            {
                id: 'signal',
                name: 'Signal',
                prefix: 'signal',
                body: 'signal ${1:signal_name}(${2:params})',
                description: 'Godot signal declaration',
                source: SnippetSource.Builtin
            },
            {
                id: 'export',
                name: 'Export Variable',
                prefix: 'export',
                body: '@export var ${1:variable_name}: ${2:type} = ${3:value}',
                description: 'Godot export variable',
                source: SnippetSource.Builtin
            },
            {
                id: 'onready',
                name: 'Onready Variable',
                prefix: 'onready',
                body: '@onready var ${1:variable_name}: ${2:Node} = $${3:NodePath}',
                description: 'Godot onready variable',
                source: SnippetSource.Builtin
            }
        ]);
    }

    /**
     * Register snippets for languages
     */
    private registerSnippetsForLanguage(languages: string[], snippets: (Omit<SnippetDefinition, 'languages'> & { languages?: string[] })[]): void {
        for (const snippet of snippets) {
            const fullSnippet: SnippetDefinition = {
                ...snippet,
                languages: snippet.languages || languages
            };
            
            this.addSnippet(fullSnippet);
        }
    }

    // ==================== Snippet Management ====================

    /**
     * Add snippet
     */
    addSnippet(snippet: SnippetDefinition): void {
        this.snippets.set(snippet.id, snippet);
        
        // Index by language
        const languages = snippet.languages || ['*'];
        for (const lang of languages) {
            let langSnippets = this.snippetsByLanguage.get(lang);
            if (!langSnippets) {
                langSnippets = new Set();
                this.snippetsByLanguage.set(lang, langSnippets);
            }
            langSnippets.add(snippet.id);
        }
        
        // Index by prefix
        const prefixes = Array.isArray(snippet.prefix) ? snippet.prefix : [snippet.prefix];
        for (const prefix of prefixes) {
            let prefixSnippets = this.snippetsByPrefix.get(prefix);
            if (!prefixSnippets) {
                prefixSnippets = new Set();
                this.snippetsByPrefix.set(prefix, prefixSnippets);
            }
            prefixSnippets.add(snippet.id);
        }
    }

    /**
     * Remove snippet
     */
    removeSnippet(snippetId: string): boolean {
        const snippet = this.snippets.get(snippetId);
        if (!snippet) return false;
        
        // Remove from language index
        const languages = snippet.languages || ['*'];
        for (const lang of languages) {
            this.snippetsByLanguage.get(lang)?.delete(snippetId);
        }
        
        // Remove from prefix index
        const prefixes = Array.isArray(snippet.prefix) ? snippet.prefix : [snippet.prefix];
        for (const prefix of prefixes) {
            this.snippetsByPrefix.get(prefix)?.delete(snippetId);
        }
        
        return this.snippets.delete(snippetId);
    }

    /**
     * Get snippet by ID
     */
    getSnippet(snippetId: string): SnippetDefinition | undefined {
        return this.snippets.get(snippetId);
    }

    /**
     * Get all snippets
     */
    getAllSnippets(): SnippetDefinition[] {
        return Array.from(this.snippets.values());
    }

    /**
     * Get snippets for language
     */
    getSnippetsForLanguage(languageId: string): SnippetDefinition[] {
        const result: SnippetDefinition[] = [];
        
        // Language-specific snippets
        const langSnippets = this.snippetsByLanguage.get(languageId);
        if (langSnippets) {
            for (const id of langSnippets) {
                const snippet = this.snippets.get(id);
                if (snippet) result.push(snippet);
            }
        }
        
        // Global snippets
        const globalSnippets = this.snippetsByLanguage.get('*');
        if (globalSnippets) {
            for (const id of globalSnippets) {
                const snippet = this.snippets.get(id);
                if (snippet) result.push(snippet);
            }
        }
        
        return result;
    }

    // ==================== Completion ====================

    /**
     * Get snippet completions
     */
    getCompletions(prefix: string, languageId: string): SnippetCompletion[] {
        const completions: SnippetCompletion[] = [];
        const lowerPrefix = prefix.toLowerCase();
        
        // Get snippets for language
        const snippets = this.getSnippetsForLanguage(languageId);
        
        for (const snippet of snippets) {
            const prefixes = Array.isArray(snippet.prefix) ? snippet.prefix : [snippet.prefix];
            
            for (const snippetPrefix of prefixes) {
                if (snippetPrefix.toLowerCase().startsWith(lowerPrefix)) {
                    // Calculate score
                    const score = this.calculateScore(snippetPrefix, prefix, snippet);
                    
                    completions.push({
                        snippet,
                        prefix: snippetPrefix,
                        score
                    });
                    break; // Only add once per snippet
                }
            }
        }
        
        // Sort by score
        return completions.sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate completion score
     */
    private calculateScore(snippetPrefix: string, inputPrefix: string, snippet: SnippetDefinition): number {
        let score = 100;
        
        // Exact match bonus
        if (snippetPrefix.toLowerCase() === inputPrefix.toLowerCase()) {
            score += 50;
        }
        
        // Case match bonus
        if (snippetPrefix.startsWith(inputPrefix)) {
            score += 20;
        }
        
        // Usage bonus
        if (snippet.usageCount) {
            score += Math.min(snippet.usageCount * 2, 30);
        }
        
        // Recent usage bonus
        if (snippet.lastUsed) {
            const recency = Date.now() - snippet.lastUsed;
            const hoursSinceUse = recency / (1000 * 60 * 60);
            if (hoursSinceUse < 1) score += 20;
            else if (hoursSinceUse < 24) score += 10;
            else if (hoursSinceUse < 168) score += 5; // 1 week
        }
        
        // Shorter prefix bonus
        score -= snippetPrefix.length;
        
        return score;
    }

    // ==================== Parsing ====================

    /**
     * Parse snippet body
     */
    parseSnippet(snippet: SnippetDefinition, context: InsertionContext): ParsedSnippet {
        const body = Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body;
        
        const tabStops: TabStop[] = [];
        const variables = new Map<string, VariableReference>();
        let text = body;
        
        // Parse tab stops: $1, ${1}, ${1:placeholder}, ${1|choice1,choice2|}
        const tabStopRegex = /\$(\d+)|\$\{(\d+)(?::([^}|]+))?\}|\$\{(\d+)\|([^}]+)\|\}/g;
        let match;
        let tabStopIndex = 0;
        
        while ((match = tabStopRegex.exec(body)) !== null) {
            const index = parseInt(match[1] || match[2] || match[4], 10);
            const placeholder = match[3];
            const choices = match[5]?.split(',');
            
            tabStops.push({
                index,
                placeholder,
                choices
            });
            
            if (index > tabStopIndex) {
                tabStopIndex = index;
            }
        }
        
        // Parse variables: $VAR, ${VAR}, ${VAR:default}, ${VAR/regex/replacement/}
        const varRegex = /\$([A-Z_]+)|\$\{([A-Z_]+)(?::([^}\/]+))?\}|\$\{([A-Z_]+)\/([^\/]+)\/([^\/]*)\/([gimsuvy]*)?\}/g;
        
        while ((match = varRegex.exec(body)) !== null) {
            const name = match[1] || match[2] || match[4];
            const defaultValue = match[3];
            const regex = match[5];
            const replacement = match[6];
            const options = match[7];
            
            variables.set(name, {
                name,
                default: defaultValue,
                transform: regex ? { regex, replacement, options } : undefined
            });
        }
        
        // Resolve variables
        text = this.resolveVariables(body, context);
        
        return {
            definition: snippet,
            tabStops: tabStops.sort((a, b) => a.index - b.index),
            variables,
            finalCursorPosition: tabStops.find(ts => ts.index === 0) ? 0 : undefined,
            text
        };
    }

    /**
     * Resolve snippet variables
     */
    private resolveVariables(body: string, context: InsertionContext): string {
        let result = body;
        
        // File variables
        result = result.replace(/\$TM_FILENAME|\$\{TM_FILENAME\}/g, context.fileName || '');
        result = result.replace(/\$TM_FILENAME_BASE|\$\{TM_FILENAME_BASE\}/g, 
            context.fileName?.replace(/\.[^.]+$/, '') || '');
        result = result.replace(/\$TM_DIRECTORY|\$\{TM_DIRECTORY\}/g, context.directory || '');
        result = result.replace(/\$TM_FILEPATH|\$\{TM_FILEPATH\}/g, context.filePath || '');
        result = result.replace(/\$RELATIVE_FILEPATH|\$\{RELATIVE_FILEPATH\}/g, context.relativePath || '');
        
        // Selection variables
        result = result.replace(/\$TM_SELECTED_TEXT|\$\{TM_SELECTED_TEXT\}/g, context.selectedText || '');
        result = result.replace(/\$TM_CURRENT_LINE|\$\{TM_CURRENT_LINE\}/g, context.currentLine || '');
        result = result.replace(/\$TM_CURRENT_WORD|\$\{TM_CURRENT_WORD\}/g, context.currentWord || '');
        
        // Line variables
        result = result.replace(/\$TM_LINE_INDEX|\$\{TM_LINE_INDEX\}/g, String(context.lineIndex ?? 0));
        result = result.replace(/\$TM_LINE_NUMBER|\$\{TM_LINE_NUMBER\}/g, String(context.lineNumber ?? 1));
        
        // Date/Time variables
        const now = new Date();
        result = result.replace(/\$CURRENT_YEAR|\$\{CURRENT_YEAR\}/g, String(now.getFullYear()));
        result = result.replace(/\$CURRENT_YEAR_SHORT|\$\{CURRENT_YEAR_SHORT\}/g, 
            String(now.getFullYear()).slice(-2));
        result = result.replace(/\$CURRENT_MONTH|\$\{CURRENT_MONTH\}/g, 
            String(now.getMonth() + 1).padStart(2, '0'));
        result = result.replace(/\$CURRENT_DATE|\$\{CURRENT_DATE\}/g, 
            String(now.getDate()).padStart(2, '0'));
        result = result.replace(/\$CURRENT_HOUR|\$\{CURRENT_HOUR\}/g, 
            String(now.getHours()).padStart(2, '0'));
        result = result.replace(/\$CURRENT_MINUTE|\$\{CURRENT_MINUTE\}/g, 
            String(now.getMinutes()).padStart(2, '0'));
        result = result.replace(/\$CURRENT_SECOND|\$\{CURRENT_SECOND\}/g, 
            String(now.getSeconds()).padStart(2, '0'));
        result = result.replace(/\$CURRENT_SECONDS_UNIX|\$\{CURRENT_SECONDS_UNIX\}/g, 
            String(Math.floor(now.getTime() / 1000)));
        
        // Random variables
        result = result.replace(/\$RANDOM|\$\{RANDOM\}/g, 
            String(Math.floor(Math.random() * 1000000)).padStart(6, '0'));
        result = result.replace(/\$RANDOM_HEX|\$\{RANDOM_HEX\}/g, 
            Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'));
        result = result.replace(/\$UUID|\$\{UUID\}/g, this.generateUUID());
        
        // Comment variables
        result = result.replace(/\$BLOCK_COMMENT_START|\$\{BLOCK_COMMENT_START\}/g, 
            context.blockCommentStart || '/*');
        result = result.replace(/\$BLOCK_COMMENT_END|\$\{BLOCK_COMMENT_END\}/g, 
            context.blockCommentEnd || '*/');
        result = result.replace(/\$LINE_COMMENT|\$\{LINE_COMMENT\}/g, context.lineComment || '//');
        
        // Clipboard
        result = result.replace(/\$CLIPBOARD|\$\{CLIPBOARD\}/g, context.clipboard || '');
        
        // Workspace
        result = result.replace(/\$WORKSPACE_NAME|\$\{WORKSPACE_NAME\}/g, context.workspaceName || '');
        result = result.replace(/\$WORKSPACE_FOLDER|\$\{WORKSPACE_FOLDER\}/g, context.workspaceFolder || '');
        
        // Custom variables
        if (context.customVariables) {
            for (const [key, value] of Object.entries(context.customVariables)) {
                const regex = new RegExp(`\\$${key}|\\$\\{${key}\\}`, 'g');
                result = result.replace(regex, value);
            }
        }
        
        // Process transforms
        result = this.processTransforms(result);
        
        return result;
    }

    /**
     * Process text transforms
     */
    private processTransforms(text: string): string {
        // Transform: ${VAR/regex/replacement/options}
        // Also: ${1/regex/replacement/options}
        const transformRegex = /\$\{(?:\d+|[A-Z_]+)\/([^\/]+)\/([^\/]*)\/([gimsuvy]*)?\}/g;
        
        return text.replace(transformRegex, (match, regex, replacement, options) => {
            try {
                const re = new RegExp(regex, options || 'g');
                // The actual replacement would happen during snippet insertion
                // For now, return empty as we're just parsing
                return '';
            } catch {
                return match;
            }
        });
    }

    /**
     * Generate UUID
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ==================== Session Management ====================

    /**
     * Create snippet session
     */
    createSession(parsedSnippet: ParsedSnippet, startPosition: Position): SnippetSession {
        const sessionId = `snippet_${++this.sessionIdCounter}`;
        
        const session: SnippetSession = {
            id: sessionId,
            snippet: parsedSnippet,
            startPosition,
            endPosition: this.calculateEndPosition(startPosition, parsedSnippet.text),
            currentTabStop: parsedSnippet.tabStops.length > 0 ? 1 : 0,
            tabStopPositions: [],
            isActive: true
        };
        
        this.activeSessions.set(sessionId, session);
        
        // Update usage statistics
        parsedSnippet.definition.usageCount = (parsedSnippet.definition.usageCount || 0) + 1;
        parsedSnippet.definition.lastUsed = Date.now();
        
        this.onInsertedEmitter.fire({ snippet: parsedSnippet.definition, session });
        
        return session;
    }

    /**
     * Get active session
     */
    getActiveSession(): SnippetSession | undefined {
        for (const session of this.activeSessions.values()) {
            if (session.isActive) {
                return session;
            }
        }
        return undefined;
    }

    /**
     * Next tab stop
     */
    nextTabStop(sessionId: string): TabStopPosition | null {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.isActive) return null;
        
        const nextIndex = session.currentTabStop + 1;
        const tabStop = session.snippet.tabStops.find(ts => ts.index === nextIndex);
        
        if (!tabStop) {
            // No more tab stops, end session
            this.endSession(sessionId, true);
            return null;
        }
        
        session.currentTabStop = nextIndex;
        return session.tabStopPositions.find(tsp => tsp.index === nextIndex) || null;
    }

    /**
     * Previous tab stop
     */
    previousTabStop(sessionId: string): TabStopPosition | null {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.isActive) return null;
        
        const prevIndex = session.currentTabStop - 1;
        if (prevIndex < 1) return null;
        
        session.currentTabStop = prevIndex;
        return session.tabStopPositions.find(tsp => tsp.index === prevIndex) || null;
    }

    /**
     * End snippet session
     */
    endSession(sessionId: string, completed: boolean = true): void {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;
        
        session.isActive = false;
        this.activeSessions.delete(sessionId);
        
        this.onSessionEndedEmitter.fire({ session, completed });
    }

    /**
     * Calculate end position
     */
    private calculateEndPosition(start: Position, text: string): Position {
        const lines = text.split('\n');
        
        if (lines.length === 1) {
            return {
                line: start.line,
                character: start.character + lines[0].length
            };
        }
        
        return {
            line: start.line + lines.length - 1,
            character: lines[lines.length - 1].length
        };
    }

    // ==================== File Management ====================

    /**
     * Load user snippets
     */
    private async loadUserSnippets(): Promise<void> {
        // TODO: Load snippets from userSnippetsPath
    }

    /**
     * Load workspace snippets
     */
    private async loadWorkspaceSnippets(): Promise<void> {
        // TODO: Load snippets from workspaceSnippetsPath
    }

    /**
     * Save user snippet file
     */
    async saveUserSnippets(languageId: string, snippets: SnippetDefinition[]): Promise<void> {
        const filePath = `${this.userSnippetsPath}/${languageId}.json`;
        
        const snippetObj: Record<string, unknown> = {};
        for (const snippet of snippets) {
            snippetObj[snippet.name] = {
                prefix: snippet.prefix,
                body: snippet.body,
                description: snippet.description
            };
        }
        
        // TODO: Write file
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.snippets.clear();
        this.snippetsByLanguage.clear();
        this.snippetsByPrefix.clear();
        this.snippetFiles.clear();
        this.activeSessions.clear();
        
        this.onInsertedEmitter.dispose();
        this.onSessionEndedEmitter.dispose();
        this.onFileChangedEmitter.dispose();
    }
}

// ==================== Export ====================

export default SnippetSystem;
