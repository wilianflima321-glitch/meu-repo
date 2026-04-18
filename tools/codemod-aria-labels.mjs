#!/usr/bin/env node
/**
 * Codemod: Add aria-label to icon-only buttons.
 *
 * Strategy: we look for `<button type="button"` tags (multi-line aware) that
 * already lack an accessible name (no aria-label / aria-labelledby /
 * aria-describedby / title / visible text). We then infer a reasonable aria
 * label from nearby context:
 *   1) the `onClick` handler name (e.g. `onClick={onDelete}` -> "Delete")
 *   2) the first icon child (e.g. `<Trash2 ... />` -> "Delete")
 *   3) arrow function arguments (`onClick={() => addNode('dialogue')}` -> "Add node dialogue")
 *
 * We never overwrite existing labels. We only touch buttons the gate flags.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const WEB_DIR = join(process.cwd(), 'cloud-web-app/web')

// Map of lucide-react / codicon icons -> human-readable action.
const ICON_LABELS = new Map([
  ['Trash', 'Delete'], ['Trash2', 'Delete'],
  ['X', 'Close'], ['XCircle', 'Close'],
  ['Check', 'Confirm'], ['CheckCircle', 'Confirm'],
  ['Plus', 'Add new'], ['PlusCircle', 'Add new'],
  ['Minus', 'Remove'], ['MinusCircle', 'Remove'],
  ['Edit', 'Edit'], ['Edit2', 'Edit'], ['Edit3', 'Edit'], ['Pencil', 'Edit'],
  ['Save', 'Save'],
  ['Download', 'Download'], ['Upload', 'Upload'],
  ['Play', 'Play'], ['Pause', 'Pause'], ['Stop', 'Stop'], ['Square', 'Stop'],
  ['SkipForward', 'Skip forward'], ['SkipBack', 'Skip back'],
  ['FastForward', 'Fast forward'], ['Rewind', 'Rewind'],
  ['Volume2', 'Audio'], ['VolumeX', 'Mute audio'], ['Volume', 'Audio'],
  ['Mic', 'Microphone'], ['MicOff', 'Mute microphone'],
  ['Video', 'Video'], ['VideoOff', 'Turn off video'],
  ['Camera', 'Camera'],
  ['Image', 'Image'],
  ['Settings', 'Open settings'], ['Settings2', 'Open settings'],
  ['Cog', 'Open settings'],
  ['MoreHorizontal', 'More options'], ['MoreVertical', 'More options'],
  ['Menu', 'Open menu'],
  ['ChevronUp', 'Collapse'], ['ChevronDown', 'Expand'],
  ['ChevronLeft', 'Previous'], ['ChevronRight', 'Next'],
  ['ArrowUp', 'Move up'], ['ArrowDown', 'Move down'],
  ['ArrowLeft', 'Go back'], ['ArrowRight', 'Go forward'],
  ['Search', 'Search'],
  ['Filter', 'Filter'],
  ['Globe', 'Localization'],
  ['Lock', 'Lock'], ['Unlock', 'Unlock'],
  ['Eye', 'Show'], ['EyeOff', 'Hide'],
  ['Copy', 'Copy'],
  ['Clipboard', 'Copy to clipboard'],
  ['Share', 'Share'], ['Share2', 'Share'],
  ['Link', 'Copy link'],
  ['RefreshCw', 'Refresh'], ['RefreshCcw', 'Refresh'],
  ['RotateCw', 'Rotate clockwise'], ['RotateCcw', 'Rotate counter-clockwise'],
  ['ZoomIn', 'Zoom in'], ['ZoomOut', 'Zoom out'],
  ['Maximize', 'Expand to fullscreen'], ['Minimize', 'Exit fullscreen'],
  ['Maximize2', 'Expand to fullscreen'], ['Minimize2', 'Exit fullscreen'],
  ['HelpCircle', 'Help'], ['Info', 'More information'],
  ['AlertCircle', 'Alert details'], ['AlertTriangle', 'Warning details'],
  ['Bell', 'Notifications'], ['BellOff', 'Disable notifications'],
  ['User', 'Account'], ['Users', 'Members'],
  ['Star', 'Favorite'],
  ['Heart', 'Like'],
  ['Bookmark', 'Bookmark'],
  ['Flag', 'Flag'],
  ['MessageSquare', 'Message'], ['MessageCircle', 'Message'],
  ['Send', 'Send'],
  ['Folder', 'Folder'], ['FolderOpen', 'Open folder'],
  ['File', 'File'], ['FileText', 'Document'],
  ['Home', 'Home'],
  ['LogIn', 'Sign in'], ['LogOut', 'Sign out'],
  ['Code', 'Code'], ['Terminal', 'Terminal'],
  ['Zap', 'Action'], ['Power', 'Power'],
  ['GitBranch', 'Git branch'], ['GitCommit', 'Git commit'], ['GitMerge', 'Git merge'],
  ['Download', 'Download'], ['Upload', 'Upload'],
  ['Layers', 'Layers'],
])

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (full.endsWith('.tsx')) out.push(full)
  }
  return out
}

function humanizeHandler(name) {
  // e.g. onDelete -> "Delete", handleSubmitForm -> "Submit form"
  let n = name.replace(/^(on|handle)/, '')
  n = n.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return n.charAt(0).toUpperCase() + n.slice(1)
}

function inferLabel(buttonText) {
  // 1) Try explicit icon components first, as they are the strongest signal.
  const iconMatch = buttonText.match(/<([A-Z][a-zA-Z0-9]+)\s/g)
  if (iconMatch) {
    for (const m of iconMatch) {
      const name = m.slice(1).trim()
      if (ICON_LABELS.has(name)) return ICON_LABELS.get(name)
    }
  }

  // 2) onClick={namedHandler}
  const namedHandler = buttonText.match(/onClick=\{([a-zA-Z][a-zA-Z0-9]*)\}/)
  if (namedHandler) {
    const n = namedHandler[1]
    if (!['onClick', 'onChange'].includes(n)) return humanizeHandler(n)
  }

  // 3) onClick={() => handler(...)}
  const arrowNamed = buttonText.match(/onClick=\{\(\)\s*=>\s*([a-zA-Z][a-zA-Z0-9]*)\s*\(/)
  if (arrowNamed) return humanizeHandler(arrowNamed[1])

  // 4) onClick={() => setFoo(...)}
  const setterMatch = buttonText.match(/onClick=\{\(\)\s*=>\s*set([A-Z][a-zA-Z0-9]*)/)
  if (setterMatch) return `Toggle ${setterMatch[1].toLowerCase()}`

  return null
}

function findButtonRanges(lines) {
  // Returns list of { startLine, endLine } for each `<button ...>` that needs fixing.
  const ranges = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes('<button') || !line.includes('type="button"')) continue
    const windowText = lines.slice(i, Math.min(lines.length, i + 20)).join('\n')
    const hasAccessibleAttr = /\b(aria-label|aria-labelledby|aria-describedby|title)\s*=/.test(windowText)
    const hasVisibleText = />[^<>{}]*?[A-Za-z\u00C0-\u024F][^<>{}]*?</.test(windowText)
    if (hasAccessibleAttr || hasVisibleText) continue

    // Find end of opening tag: a line whose content ends with `>` after stripping
    // arrow-function noise. We treat the opening tag as finished when we see a
    // line that ends in `>` without a trailing `/>` of an inner component.
    // Heuristic: search for a line that ends with `>` optionally preceded by `"`
    // or `}` or letters, and does not belong to an `=>` arrow function.
    let tagEnd = i
    for (let k = i; k < Math.min(lines.length, i + 20); k++) {
      const l = lines[k].replace(/=>/g, '==')
      if (/>\s*$/.test(l) && !/<[A-Z][a-zA-Z0-9]*[^>]*$/.test(lines.slice(i, k + 1).join('\n'))) {
        tagEnd = k
        break
      }
    }
    ranges.push({ startLine: i, endLine: tagEnd })
  }
  return ranges
}

function processFile(file) {
  const original = readFileSync(file, 'utf-8')
  const lines = original.split('\n')
  const ranges = findButtonRanges(lines)
  if (!ranges.length) return 0

  // Apply changes from bottom up to keep indices stable.
  let added = 0
  for (let r = ranges.length - 1; r >= 0; r--) {
    const { startLine, endLine } = ranges[r]
    const buttonText = lines.slice(startLine, Math.min(lines.length, endLine + 8)).join('\n')
    const label = inferLabel(buttonText)
    if (!label) continue

    // Insert aria-label attribute on the line right after `<button type="button"`.
    const openLine = lines[startLine]
    const indent = (openLine.match(/^(\s*)/) || ['', ''])[1]
    const attrIndent = indent + '  '
    const escapedLabel = label.replace(/"/g, '\\"')
    const ariaLine = `${attrIndent}aria-label="${escapedLabel}"`
    lines.splice(startLine + 1, 0, ariaLine)
    added++
  }

  if (added > 0) {
    writeFileSync(file, lines.join('\n'))
    return added
  }
  return 0
}

const files = walk(join(WEB_DIR, 'app')).concat(walk(join(WEB_DIR, 'components')))
let touched = 0
let totalAdded = 0
for (const file of files) {
  try {
    const n = processFile(file)
    if (n > 0) {
      touched++
      totalAdded += n
      console.log(`  ✓ ${relative(WEB_DIR, file)} (+${n})`)
    }
  } catch (err) {
    console.error(`  ✗ ${file}: ${err.message}`)
  }
}

console.log(`\nCodemod done. Touched ${touched} files, added ${totalAdded} aria-labels.`)
