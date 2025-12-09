# Editor Features & Configuration

Complete guide to editing, LSP, debugging, and file operations in AI IDE.

## Monaco Editor Integration

### LSP Features (All Enabled)

✅ **Hover Information** - Hover over symbols for documentation  
✅ **Code Completion** - IntelliSense with `Ctrl+Space`  
✅ **Go to Definition** - `F12` to navigate to definitions  
✅ **Find References** - `Shift+F12` to find all references  
✅ **Rename Symbol** - `F2` to rename across workspace  
✅ **Format Document** - `Shift+Alt+F` to format code  
✅ **Real-time Diagnostics** - Errors/warnings as you type  
✅ **Code Actions** - `Ctrl+.` for quick fixes  
✅ **Signature Help** - `Ctrl+Shift+Space` for parameter info  
✅ **Document Symbols** - `Ctrl+Shift+O` to navigate symbols  
✅ **Workspace Symbols** - `Ctrl+T` to search all symbols  
✅ **Code Lens** - Inline references and implementations  
✅ **Inlay Hints** - Type hints and parameter names  

### Configuration

File: `src/browser/editor/editor-configuration.ts`

```typescript
const config = {
  formatOnSave: true,
  formatOnPaste: false,
  autoSave: 'afterDelay',
  autoSaveDelay: 1000,
  minimap: true,
  lineNumbers: 'on',
  wordWrap: 'off'
};
```

## Code Snippets

### Supported Languages

- **TypeScript/JavaScript**: Classes, functions, async, tests
- **Python**: Classes, functions, loops, try-except
- **HTML**: HTML5 boilerplate, elements
- **CSS**: Flexbox, grid, media queries

### Usage

Type snippet prefix and press `Tab`:
- `class` → Class definition
- `fn` → Function
- `async` → Async function
- `test` → Test case
- `log` → Console.log

File: `src/browser/editor/snippets.ts`

## Search & Replace

### In File

- **Find**: `Ctrl+F`
- **Replace**: `Ctrl+H`
- **Find Next**: `F3`
- **Find Previous**: `Shift+F3`

### In Workspace

- **Find in Files**: `Ctrl+Shift+F`
- **Replace in Files**: `Ctrl+Shift+H`

### Options

- **Case Sensitive**: `Alt+C`
- **Whole Word**: `Alt+W`
- **Regex**: `Alt+R`
- **Preserve Case**: Enabled in replace

File: `src/browser/editor/search-service.ts`

## File Operations

### Create File

```typescript
await fileOps.createFile('/path/to/file.ts', '// content');
```

### Open File

```typescript
const { content } = await fileOps.openFile('/path/to/file.ts');
```

### Rename File

```typescript
await fileOps.renameFile('/old/path.ts', '/new/path.ts');
// Shows confirmation dialog
```

### Delete File

```typescript
await fileOps.deleteFile('/path/to/file.ts');
// Shows destructive confirmation dialog
```

### Recent Files

- Automatically tracked
- Pin important files
- Max 20 recent files
- Sorted by last opened

File: `src/browser/editor/file-operations-service.ts`

## Tasks & Launch

### Tasks (tasks.json)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: build",
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "npm: test",
      "type": "npm",
      "script": "test",
      "group": {
        "kind": "test",
        "isDefault": true
      }
    }
  ]
}
```

### Launch (launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Program",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "preLaunchTask": "npm: build"
    }
  ]
}
```

### Running Tasks

```typescript
// Run specific task
await tasks.runTask('npm: build');

// Run default build task
const buildTask = tasks.getDefaultBuildTask();
await tasks.runTask(buildTask.label);

// Run launch configuration
await tasks.runLaunch('Launch Program');
```

### Task Feedback

- ✅ **Start Toast**: "Running task: {name}"
- ✅ **Success Toast**: "Task completed: {name}"
- ❌ **Error Toast**: "Task failed: {name} (exit code X)"
- ⚠️ **Timeout Toast**: "Task timed out: {name}"
- ⚠️ **Truncation Toast**: "Task output was truncated"

File: `src/browser/editor/tasks-service.ts`

## Debugging

### Breakpoints

- **Toggle**: `F9`
- **Conditional**: `Shift+F9`
- **Logpoints**: Right-click gutter

### Debug Controls

- **Start/Continue**: `F5`
- **Stop**: `Shift+F5`
- **Restart**: `Ctrl+Shift+F5`
- **Step Over**: `F10`
- **Step Into**: `F11`
- **Step Out**: `Shift+F11`

### Debug Configuration

```json
{
  "name": "Debug TypeScript",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/src/index.ts",
  "preLaunchTask": "npm: build",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "sourceMaps": true
}
```

### Limitations

⚠️ **Note**: Full debugging requires LSP server integration. Current implementation provides:
- Task execution with output
- Pre/post launch tasks
- Clear error feedback
- Execution history

For full debugging (breakpoints, stepping, variables), integrate with:
- Node.js debugger
- Chrome DevTools Protocol
- Language-specific debug adapters

## Keyboard Shortcuts

See [SHORTCUTS.md](./SHORTCUTS.md) for complete reference.

### Essential Shortcuts

**Editing**:
- Save: `Ctrl+S`
- Format: `Shift+Alt+F`
- Comment: `Ctrl+/`
- Rename: `F2`

**Navigation**:
- Go to Definition: `F12`
- Find References: `Shift+F12`
- Go to Line: `Ctrl+G`
- Quick Open: `Ctrl+P`

**Search**:
- Find: `Ctrl+F`
- Replace: `Ctrl+H`
- Find in Files: `Ctrl+Shift+F`

**Tasks**:
- Run Build Task: `Ctrl+Shift+B`
- Run Test Task: `Ctrl+Shift+T`

## Accessibility

### Keyboard Navigation

- All features accessible via keyboard
- Focus indicators on all interactive elements
- Screen reader support
- High contrast mode support

### Font Scaling

- Zoom In: `Ctrl+=`
- Zoom Out: `Ctrl+-`
- Reset: `Ctrl+0`

### Screen Reader

- Toggle: `Ctrl+E`
- Announces diagnostics
- Announces completions
- Announces navigation

## Offline Support

### Local Assets

✅ Fonts bundled locally (no CDN)  
✅ Codicons bundled locally  
✅ All editor features work offline  
✅ LSP features work offline (with local server)  

See [OFFLINE.md](./OFFLINE.md) for details.

## Performance

### Optimizations

- Smooth scrolling
- Cursor animation
- Lazy loading for large files
- Incremental syntax highlighting
- Debounced diagnostics

### Limits

- Max file size: 10MB (configurable)
- Max search results: 10,000
- Max recent files: 20
- Max task history: 50

## Integration with AI Features

### Non-Intrusive Design

✅ AI panel doesn't block editor  
✅ Executor output in dedicated channel  
✅ Voice input with discrete button  
✅ Preview in side panel  
✅ All features have keyboard shortcuts  

### Workflow

1. Edit code in Monaco editor
2. Use AI agents for assistance (`Ctrl+Shift+A`)
3. Execute tasks (`Ctrl+Shift+B`)
4. View output in executor channel
5. Debug with launch configurations
6. All without leaving keyboard

## Troubleshooting

### LSP Not Working

1. Check LSP server is running
2. Verify language server installed
3. Check output panel for errors
4. Restart LSP server

### Format Not Working

1. Check formatter is installed
2. Verify file type is supported
3. Check for syntax errors
4. Try format selection first

### Tasks Failing

1. Check task command is correct
2. Verify working directory
3. Check environment variables
4. View executor logs (`Ctrl+Shift+E`)

### Shortcuts Not Working

1. Check for OS conflicts
2. Check for browser conflicts
3. Use Command Palette as alternative
4. Customize shortcuts if needed

## Best Practices

### File Organization

- Use workspace folders
- Group related files
- Use meaningful names
- Keep files under 1000 lines

### Code Quality

- Enable format on save
- Use linting
- Fix diagnostics promptly
- Use code actions for refactoring

### Task Management

- Define clear task labels
- Use task groups (build/test)
- Set default tasks
- Use pre/post tasks for workflows

### Debugging

- Use source maps
- Set meaningful breakpoints
- Use conditional breakpoints
- Check variables in debug console

## See Also

- [SHORTCUTS.md](./SHORTCUTS.md) - Complete keyboard shortcuts
- [METRICS.md](./METRICS.md) - Performance metrics
- [CI.md](./CI.md) - Testing and CI/CD
- [OFFLINE.md](./OFFLINE.md) - Offline functionality
