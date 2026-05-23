export interface AITool {
  name: string
  description: string
  category: ToolCategory
  parameters: ToolParameter[]
  returns: string
  execute: (params: Record<string, unknown>) => Promise<ToolResult>
}

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  default?: unknown
  enum?: string[]
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  artifacts?: Artifact[]
}

export interface Artifact {
  type: 'file' | 'image' | 'audio' | 'video' | 'code' | '3d-model'
  name: string
  content: string | Blob
  mimeType: string
}

export type ToolCategory =
  | 'code'
  | 'image'
  | 'audio'
  | 'video'
  | 'game'
  | 'asset'
  | 'project'
  | 'ui'
  | 'analysis'
