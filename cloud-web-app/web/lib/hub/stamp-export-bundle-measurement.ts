/**
 * Persist measured web-export / cook bundle bytes onto ExportJob rows
 * consumed by publish-listing-authority (platform: 'web').
 */

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import {
  buildMeasuredExportBundleEvidence,
  mergeExportJobCompressionOptions,
  type MeasuredExportBundleEvidence,
} from '@/lib/hub/export-bundle-measurement'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('stamp-export-bundle-measurement')

function asOptionsRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

export async function stampExistingExportJobMeasuredBundle(input: {
  exportJobId: string
  artifactByteLength: number
  cookPackByteLength?: number | null
  downloadUrl?: string | null
  downloadExpiresAt?: Date | null
}): Promise<
  | { ok: true; evidence: MeasuredExportBundleEvidence }
  | { ok: false; reason: string }
> {
  const measured = buildMeasuredExportBundleEvidence({
    artifactByteLength: input.artifactByteLength,
    cookPackByteLength: input.cookPackByteLength,
  })
  if (!measured.ok) return measured

  const existing = await prisma.exportJob.findUnique({
    where: { id: input.exportJobId },
    select: { options: true },
  })
  if (!existing) {
    return { ok: false, reason: `export_job_missing:${input.exportJobId}` }
  }

  const options = mergeExportJobCompressionOptions(
    asOptionsRecord(existing.options),
    measured.evidence,
  ) as Prisma.InputJsonValue

  await prisma.exportJob.update({
    where: { id: input.exportJobId },
    data: {
      status: 'completed',
      progress: 100,
      currentStep: 'Completed',
      completedAt: new Date(),
      fileSize: measured.evidence.fileSize,
      downloadUrl: input.downloadUrl ?? undefined,
      downloadExpiresAt: input.downloadExpiresAt ?? undefined,
      options,
      error: null,
    },
  })

  log.info('export_job_bundle_measured', {
    exportJobId: input.exportJobId,
    fileSize: measured.evidence.fileSize,
    compressionMandatePassed: measured.evidence.compressionMandatePassed,
    oversize: measured.evidence.oversize,
  })

  return { ok: true, evidence: measured.evidence }
}

/**
 * Mirror a completed cook/publish artifact onto a platform=web ExportJob so
 * Arcade publish / listing-authority can read measured fileSize + options.
 */
export async function stampWebExportJobFromCookArtifact(input: {
  projectId: string
  userId: string
  renderJobId: string
  downloadUrl: string
  artifactByteLength: number
  cookPackByteLength?: number | null
  bakeReceiptRef?: string | null
  lightmapBytes?: number | null
}): Promise<
  | { ok: true; exportJobId: string; evidence: MeasuredExportBundleEvidence }
  | { ok: false; reason: string }
> {
  const measured = buildMeasuredExportBundleEvidence({
    artifactByteLength: input.artifactByteLength,
    cookPackByteLength: input.cookPackByteLength,
  })
  if (!measured.ok) return measured

  const evidenceRef = `renderJob:${input.renderJobId}`
  const baseOptions: Record<string, unknown> = {
    sourceRenderJobId: input.renderJobId,
    evidenceRef,
  }
  if (input.bakeReceiptRef?.trim()) {
    baseOptions.bakeReceiptRef = input.bakeReceiptRef.trim()
  }
  if (typeof input.lightmapBytes === 'number' && input.lightmapBytes > 0) {
    baseOptions.lightmapBytes = Math.floor(input.lightmapBytes)
  }

  const options = mergeExportJobCompressionOptions(baseOptions, measured.evidence) as Prisma.InputJsonValue
  // Deterministic mirror id — listing authority reads platform=web ExportJob.fileSize.
  const exportJobId = `webexp_${input.renderJobId}`.slice(0, 64)

  await prisma.exportJob.upsert({
    where: { id: exportJobId },
    create: {
      id: exportJobId,
      projectId: input.projectId,
      userId: input.userId,
      platform: 'web',
      configuration: 'release',
      status: 'completed',
      progress: 100,
      currentStep: 'Completed (cook measured)',
      completedAt: new Date(),
      downloadUrl: input.downloadUrl,
      fileSize: measured.evidence.fileSize,
      options,
    },
    update: {
      status: 'completed',
      progress: 100,
      currentStep: 'Completed (cook measured)',
      completedAt: new Date(),
      downloadUrl: input.downloadUrl,
      fileSize: measured.evidence.fileSize,
      options,
      error: null,
      userId: input.userId,
    },
  })

  log.info('export_job_cook_bundle_stamped', {
    exportJobId,
    renderJobId: input.renderJobId,
    fileSize: measured.evidence.fileSize,
    cookPackByteLength: measured.evidence.cookPackByteLength,
    compressionMandatePassed: measured.evidence.compressionMandatePassed,
  })

  return { ok: true, exportJobId, evidence: measured.evidence }
}
