export type SymbolKind =
  | 'file'
  | 'module'
  | 'namespace'
  | 'package'
  | 'class'
  | 'method'
  | 'property'
  | 'field'
  | 'constructor'
  | 'enum'
  | 'interface'
  | 'function'
  | 'variable'
  | 'constant'
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'key'
  | 'null'
  | 'enumMember'
  | 'struct'
  | 'event'
  | 'operator'
  | 'typeParameter'

export interface DocumentSymbol {
  name: string
  detail?: string
  kind: SymbolKind
  range: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
  selectionRange: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
  children?: DocumentSymbol[]
  deprecated?: boolean
}

export type SortMode = 'position' | 'name' | 'kind'

export interface OutlinePanelProps {
  symbols?: DocumentSymbol[]
  activeFilePath?: string
  onSymbolClick?: (symbol: DocumentSymbol) => void
  onRefresh?: () => void
  isLoading?: boolean
}
