import {
  fuzzyMatch,
  type CommandItem,
  type FileItem,
  type PaletteMode,
  type ScriptingNodeItem,
} from './CommandPalette.parts'

export type FilteredCommandItem = CommandItem & {
  labelMatch: ReturnType<typeof fuzzyMatch>
  descriptionMatch: ReturnType<typeof fuzzyMatch>
  match: boolean
  score: number
}

export type FilteredFileItem = FileItem & {
  nameMatch: ReturnType<typeof fuzzyMatch>
  pathMatch: ReturnType<typeof fuzzyMatch>
  match: boolean
  score: number
}

export type FilteredNodeItem = ScriptingNodeItem & {
  labelMatch: ReturnType<typeof fuzzyMatch>
  descriptionMatch: ReturnType<typeof fuzzyMatch>
  match: boolean
  score: number
}

export type FilteredPaletteItem = FilteredCommandItem | FilteredFileItem | FilteredNodeItem

/** Hierarchical grouping for Universal Search (FASE 3.5) — one visual group header per source, results sorted by score within each. */
export type ResultGroup = { label: string; items: FilteredPaletteItem[] }

export const MODE_CONFIG: Record<PaletteMode, { placeholder: string; prefix: string }> = {
  commands: { placeholder: 'Type a command...', prefix: '>' },
  files: { placeholder: 'Search files...', prefix: '' },
  symbols: { placeholder: 'Go to symbol...', prefix: '@' },
  lines: { placeholder: 'Go to line...', prefix: ':' },
  all: { placeholder: 'Search commands, files, and scripting nodes...', prefix: '' },
}

export function buildCommandResults(query: string, commands: CommandItem[]): FilteredCommandItem[] {
  return commands
    .filter((command) => !command.when || command.when())
    .map((command) => {
      const labelMatch = fuzzyMatch(query, command.label)
      const descriptionMatch = command.description
        ? fuzzyMatch(query, command.description)
        : { match: false, score: 0, indices: [] }
      const keywordMatch = (command.keywords || []).some((keyword) => fuzzyMatch(query, keyword).match)
      return {
        ...command,
        labelMatch,
        descriptionMatch,
        match: labelMatch.match || descriptionMatch.match || keywordMatch,
        score: Math.max(labelMatch.score, descriptionMatch.score * 0.75),
      }
    })
    .filter((item) => item.match)
    .sort((a, b) => b.score - a.score)
}

export function buildFileResults(query: string, files: FileItem[]): FilteredFileItem[] {
  return files
    .map((file) => {
      const nameMatch = fuzzyMatch(query, file.name)
      const pathMatch = fuzzyMatch(query, file.path)
      return {
        ...file,
        nameMatch,
        pathMatch,
        match: nameMatch.match || pathMatch.match,
        score: Math.max(nameMatch.score * 1.5, pathMatch.score),
      }
    })
    .filter((item) => item.match)
    .sort((a, b) => b.score - a.score)
    .slice(0, 80)
}

export function buildNodeResults(query: string, nodes: ScriptingNodeItem[]): FilteredNodeItem[] {
  return nodes
    .map((node) => {
      const labelMatch = fuzzyMatch(query, node.label)
      const descriptionMatch = node.description ? fuzzyMatch(query, node.description) : { match: false, score: 0, indices: [] }
      const categoryMatch = fuzzyMatch(query, node.category)
      return {
        ...node,
        labelMatch,
        descriptionMatch,
        match: labelMatch.match || descriptionMatch.match || categoryMatch.match,
        score: Math.max(labelMatch.score, descriptionMatch.score * 0.6, categoryMatch.score * 0.4),
      }
    })
    .filter((item) => item.match)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
}

/**
 * Hierarchical Universal Search (FASE 3.5): groups results by source
 * (Commands, Scripting Nodes, Files) so the palette reads as a hierarchy
 * rather than one flat undifferentiated list, while each group stays
 * internally sorted by fuzzy-match score. Empty queries only show commands
 * and nodes (the "tools" a keyboard-first user reaches for) — file search
 * still requires typing, same as `files` mode, to avoid dumping the whole
 * workspace tree by default.
 */
export function buildGroupedAllResults(
  query: string,
  commands: CommandItem[],
  files: FileItem[],
  scriptingNodes: ScriptingNodeItem[]
): ResultGroup[] {
  const commandResults = buildCommandResults(query, commands)
  const nodeResults = buildNodeResults(query, scriptingNodes)
  const fileResults = query ? buildFileResults(query, files) : []

  const groups: ResultGroup[] = []
  if (commandResults.length) groups.push({ label: 'Commands', items: commandResults })
  if (nodeResults.length) groups.push({ label: 'Scripting nodes', items: nodeResults })
  if (fileResults.length) groups.push({ label: 'Files', items: fileResults })
  return groups
}
