import type { Prisma } from '@prisma/client'
import type { TaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import { writeTaskEvidenceLedgerToSettings } from '@/lib/production/task-evidence-ledger-store'

/**
 * Persists a governed task evidence ledger into `project.settings`. Best-effort:
 * any failure (missing project, DB error) returns false and never throws, so it
 * can never break an apply that already succeeded on disk.
 */
export async function persistGovernedTaskEvidence(params: {
  userId: string
  projectId: string
  ledger: TaskEvidenceLedger
}): Promise<boolean> {
  const { userId, projectId, ledger } = params
  if (!projectId) return false

  try {
    const { prisma } = await import('@/lib/db')
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      select: { settings: true },
    })
    if (!project) return false

    const settings = writeTaskEvidenceLedgerToSettings(project.settings, ledger)
    await prisma.project.update({
      where: { id: projectId },
      data: { settings: settings as Prisma.InputJsonValue },
    })
    return true
  } catch {
    return false
  }
}
