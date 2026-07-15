'use client'

/**
 * Letter cb — Honesty badge: native pager vs BYOK clay path.
 */

import {
  selectGameReadyCharacterRoute,
  type NativeGenIdeHonestyBadge,
} from '@/lib/native-gen/native-gen-ide-route'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'

export interface NativeGenPathHonestyBadgeProps {
  className?: string
  compact?: boolean
  /** Override path for live session status after generate. */
  activeBadge?: NativeGenIdeHonestyBadge
}

export function NativeGenPathHonestyBadge({
  className,
  compact = false,
  activeBadge,
}: NativeGenPathHonestyBadgeProps) {
  const route = selectGameReadyCharacterRoute({ nativeOnnxReady: NATIVE_ONNX_READY })
  const badge = activeBadge ?? route.honestyBadge

  return (
    <div
      className={
        className ??
        'inline-flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface)_80%,transparent)] px-2 py-1'
      }
      role="status"
      data-aethel-cb="native-gen-path-honesty"
      data-path={badge}
      data-native-onnx={String(NATIVE_ONNX_READY)}
      title={
        badge === 'native'
          ? 'Native pager path — local $0; FusionTx viewport'
          : 'BYOK clay path — CreativeBridge + CostGuard; native ONNX HELD'
      }
    >
      {badge === 'native' ? (
        <span
          className="rounded border border-[var(--aethel-success)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-success-light)]"
          title="Native ONNX pager preferred"
        >
          Native
        </span>
      ) : (
        <span
          className="rounded border border-[var(--aethel-info)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-info)]"
          title="BYOK MoA clay via CreativeBridge"
        >
          BYOK clay
        </span>
      )}
      <span
        className="rounded border border-[var(--aethel-warning)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-warning-light)]"
        title="nativeOnnxReady false until ORT+weights soak"
      >
        ONNX [HELD]
      </span>
      {!compact && (
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
          {badge === 'native' ? 'Local $0 + FusionTx' : 'CreativeBridge choke · Zero-UI'}
        </span>
      )}
    </div>
  )
}
