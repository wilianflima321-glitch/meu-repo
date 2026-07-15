'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, CheckCircle2, Clock3, DollarSign, Power, ShieldCheck } from 'lucide-react'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'
import { buildRuntimeModeViewModels, findRuntimeModeById } from '@aethel/runtime/runtime-mode-view-model'
import { STUDIO_LOCAL_RELEASE_MANIFEST } from '@/lib/studio-local/release-manifest'
import { estimatePixelStreamingCost } from '@/lib/pixel-streaming/cost'
import {
  CLOUD_STREAM_REQUIRED_EVIDENCE,
  buildCloudStreamSafetyPlan,
} from '@/lib/pixel-streaming/cloud-stream-safety'

const PixelStreamView = dynamic(() => import('@/components/streaming/pixel-stream-view'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Cloud Stream client" />,
})

function cardClass(state: 'available' | 'held' | 'neutral') {
  if (state === 'available') {
    return 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)]'
  }
  if (state === 'held') {
    return 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_9%,transparent)]'
  }
  return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)]'
}

export default function CloudStreamStudioClient({ embedded = false }: { embedded?: boolean } = {}) {
  const pixelStreamUrl = process.env.NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL
  const cloudSafety = useMemo(() => buildCloudStreamSafetyPlan({
    signalingUrl: pixelStreamUrl,
    sessionManagerConfigured: false,
    teardownConfigured: false,
    idleTimeoutSeconds: 300,
    maxSessionMinutes: 30,
    costPerMinuteUsd: 0.03,
    costCapUsd: 0.9,
    humanReviewRequired: true,
    recordingEvidenceEnabled: false,
  }), [pixelStreamUrl])
  const runtimeModes = useMemo(
    () => buildRuntimeModeViewModels({ pixelStreamUrl: cloudSafety.streamConnectAllowed ? pixelStreamUrl : null }),
    [cloudSafety.streamConnectAllowed, pixelStreamUrl],
  )
  const cloudMode = findRuntimeModeById(runtimeModes, 'cloud')
  const configured = cloudSafety.streamConnectAllowed
  const hasSignalingUrl = Boolean(pixelStreamUrl)
  const costEstimate = estimatePixelStreamingCost({ qualityScore: 80 }, { target: 'cloud-stream', costPerMinuteUsd: 0.03 })
  const cloudReadiness = STUDIO_LOCAL_RELEASE_MANIFEST.releaseReadiness.find((item) => item.id === 'cloud-stream-handoff')

  const content = (
    <div className="grid h-full min-h-0 overflow-auto bg-[var(--aethel-surface-primary)] p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-4 lg:p-5">
      <section className="min-h-[520px] overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        {configured ? (
          <PixelStreamView
            serverUrl={pixelStreamUrl}
            autoConnect={false}
            showControls
            showStats
            allowFullscreen
            className="h-full min-h-[520px]"
            config={{
              width: 1920,
              height: 1080,
              targetFps: 60,
              initialBitrate: 15000,
              minBitrate: 5000,
              maxBitrate: 25000,
              codec: 'h264',
              adaptiveBitrate: true,
              dynamicResolution: true,
              lowLatencyMode: true,
              audioEnabled: true,
              cursorMode: 'remote',
            }}
          />
        ) : (
          <div className="flex h-full min-h-[520px] items-center justify-center p-6">
            <div className="max-w-xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]">
                <AlertTriangle className="h-8 w-8 text-[var(--aethel-warning-light)]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-warning-light)]">
                Cloud Stream held
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--aethel-text-primary)]">
                Pixel Streaming is not configured for this environment.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                This surface is intentionally visible so teams can see the exact blockers. It will not simulate a cloud render,
                hide GPU cost, or claim final cinematic output without runtime evidence.
              </p>
            </div>
          </div>
        )}
      </section>

      <aside className="mt-4 space-y-4 lg:mt-0">
        <section className={`rounded-[24px] border p-4 ${cardClass(configured ? 'available' : 'held')}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Runtime status
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">{cloudMode.label}</h2>
            </div>
            <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
              {configured ? 'Beta' : 'Held'}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{cloudMode.detail}</p>
          {cloudMode.fallbackReason ? (
            <p className="mt-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] p-3 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
              {cloudMode.fallbackReason}
            </p>
          ) : null}
        </section>

        <section className={`rounded-[24px] border p-4 ${cardClass('neutral')}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Cost and teardown
          </p>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
              <DollarSign className="h-4 w-4 text-[var(--aethel-info-light)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                  ${costEstimate.costPerMinuteUsd.toFixed(2)}/min estimated
                </p>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">
                  Cap: ${cloudSafety.costCapUsd.toFixed(2)} / {cloudSafety.maxSessionMinutes} min. Cloud Stream cost applies before any session starts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
              <Power className="h-4 w-4 text-[var(--aethel-warning-light)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Idle teardown mandatory</p>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">No launch without visible stop, timeout, and rollback evidence.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-[24px] border p-4 ${cardClass('neutral')}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Required evidence
          </p>
          <div className="mt-4 space-y-2">
            {CLOUD_STREAM_REQUIRED_EVIDENCE.map((item, index) => {
              const satisfied = index === 0 ? hasSignalingUrl : false
              return (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
                  {satisfied ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--aethel-success-light)]" />
                  ) : (
                    <Clock3 className="mt-0.5 h-4 w-4 text-[var(--aethel-warning-light)]" />
                  )}
                  <span className="text-xs leading-5 text-[var(--aethel-text-secondary)]">{item}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className={`rounded-[24px] border p-4 ${cardClass('neutral')}`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--aethel-info-light)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Release hold remains honest</p>
              <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
                {cloudReadiness?.blocker ?? 'Cloud Stream requires a governed session manager before public use.'}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--aethel-warning-light)]">
                Safety plan: {cloudSafety.blockers[0] ?? cloudSafety.warnings[0]}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
                Next action: {cloudSafety.nextAction}
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  )

  if (embedded) return content

  return (
    <CreativeStudioShell
      title="Cinematic Cloud Stream"
      subtitle="Governed cloud GPU review for scenes that outgrow browser preview and local hardware."
      activeHref="/studio/cinematic"
    >
      {content}
    </CreativeStudioShell>
  )
}
