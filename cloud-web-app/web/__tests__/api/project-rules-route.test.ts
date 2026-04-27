import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  verifyProjectOwnership: vi.fn(),
}))

const projectRulesMocks = vi.hoisted(() => ({
  loadProjectRulesDescriptor: vi.fn(),
  writeProjectRulesContent: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/server/project-rules', () => projectRulesMocks)

import { GET, PUT } from '@/app/api/project-rules/route'

describe('api/project-rules route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1' })
    authMocks.verifyProjectOwnership.mockResolvedValue(true)
    projectRulesMocks.loadProjectRulesDescriptor.mockResolvedValue({
      exists: true,
      content: '- keep previews honest',
      context: 'Project rules (...)',
      scope: 'workspace',
      sourcePath: '.aethel/workspaces/user-1/demo/.aethelrules',
      writablePath: 'C:/tmp/.aethelrules',
    })
    projectRulesMocks.writeProjectRulesContent.mockResolvedValue({
      exists: true,
      content: '- keep previews honest\n- preserve diff truth',
      context: 'Project rules (...)',
      scope: 'workspace',
      sourcePath: '.aethel/workspaces/user-1/demo/.aethelrules',
      writablePath: 'C:/tmp/.aethelrules',
    })
  })

  it('returns the current project rules for an authenticated owner', async () => {
    const req = new NextRequest('http://localhost:3000/api/project-rules?projectId=demo')

    const response = await GET(req)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(authMocks.verifyProjectOwnership).toHaveBeenCalledWith('demo', 'user-1')
    expect(projectRulesMocks.loadProjectRulesDescriptor).toHaveBeenCalledWith({
      userId: 'user-1',
      projectId: 'demo',
    })
    expect(payload.rules).toEqual({
      hasRules: true,
      scope: 'workspace',
      sourcePath: '.aethel/workspaces/user-1/demo/.aethelrules',
      content: '- keep previews honest',
    })
  })

  it('returns 403 when the authenticated user does not own the target project', async () => {
    authMocks.verifyProjectOwnership.mockResolvedValue(false)
    const req = new NextRequest('http://localhost:3000/api/project-rules?projectId=demo')

    const response = await GET(req)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({
      error: 'FORBIDDEN',
      message: 'Forbidden',
    })
    expect(projectRulesMocks.loadProjectRulesDescriptor).not.toHaveBeenCalled()
  })

  it('persists project rules updates for an authenticated owner', async () => {
    const req = new NextRequest('http://localhost:3000/api/project-rules', {
      method: 'PUT',
      body: JSON.stringify({
        projectId: 'demo',
        content: '- keep previews honest\n- preserve diff truth',
      }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await PUT(req)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(projectRulesMocks.writeProjectRulesContent).toHaveBeenCalledWith({
      userId: 'user-1',
      projectId: 'demo',
      content: '- keep previews honest\n- preserve diff truth',
    })
    expect(payload.rules.hasRules).toBe(true)
    expect(payload.rules.content).toContain('preserve diff truth')
  })
})
