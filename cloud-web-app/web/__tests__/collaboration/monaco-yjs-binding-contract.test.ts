import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('native Monaco Yjs binding contract', () => {
  const bindingHook = read('cloud-web-app/packages/ide-ui/fullscreen/useNativeMonacoYjsBinding.ts')
  const canvas = read('cloud-web-app/packages/ide-ui/fullscreen/WorkbenchEditorCanvas.tsx')
  const realtimeHook = read('cloud-web-app/packages/ide-ui/fullscreen/useWorkbenchRealtimeCollaboration.ts')
  const yjsModule = read('cloud-web-app/web/lib/yjs-collaboration.ts')

  it('uses y-monaco as the primary document binding for production editor surfaces', () => {
    expect(bindingHook).toContain("import('y-monaco')")
    expect(bindingHook).toContain('new module.MonacoBinding')
    expect(bindingHook).toContain('session.getAwareness()')
    expect(bindingHook).toContain('getWorkbenchYTextName')
  })

  it('attaches the native binding inside the workbench editor canvas without removing cursor evidence', () => {
    expect(canvas).toContain('useNativeMonacoYjsBinding')
    expect(canvas).toContain('collaborationNativeBindingEnabled')
    expect(canvas).toContain('collaborationSession')
    expect(canvas).toContain('<RemoteCursorLayer')
  })

  it('exposes the collaboration session and only enables native binding after sync is live', () => {
    expect(realtimeHook).toContain('collaborationSession: session')
    expect(realtimeHook).toContain('collaborationNativeBindingEnabled')
    expect(realtimeHook).toContain('collaborationEnabled && isConnected && isSynced && session')
    expect(yjsModule).toContain('getAwareness(): Awareness | null')
  })
})
