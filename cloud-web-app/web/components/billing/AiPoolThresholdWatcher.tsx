'use client'

/**
 * Block 6C.7 — Soft toast when Fast or Premium hits 80% (and PAYG 50%/100%).
 * Non-blocking; once per period key via sessionStorage. IDE never locks.
 */

import { useEffect } from 'react'
import useSWR from 'swr'
import { useToast } from '@/components/ui/Toast'
import {
  buildThresholdToastKey,
  isPoolAtWarnThreshold,
} from '@/lib/billing/usage-meter-math'
import { currentPaygPeriodKey } from '@/lib/billing/payg-constants'

type QuotasResponse = {
  success?: boolean
  period?: string
  dualPool?: {
    fast: { used: number; limit: number }
    premium: { used: number; limit: number }
  }
  payg?: {
    enabled: boolean
    spendCapUsdCents: number | null
    accruedUsdCents: number
  } | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (res.status === 401) return null
  return res.json()
}

function alreadyToasted(key: string): boolean {
  try {
    return sessionStorage.getItem(`aethel:usage-toast:${key}`) === '1'
  } catch {
    return false
  }
}

function markToasted(key: string): void {
  try {
    sessionStorage.setItem(`aethel:usage-toast:${key}`, '1')
  } catch {
    // ignore private mode
  }
}

export function AiPoolThresholdWatcher() {
  const toast = useToast()

  const { data } = useSWR<QuotasResponse | null>('/api/quotas', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  useEffect(() => {
    if (!data?.success || !data.dualPool) return

    const period = data.period || currentPaygPeriodKey()
    const { fast, premium } = data.dualPool

    if (isPoolAtWarnThreshold(fast.used, fast.limit)) {
      const key = buildThresholdToastKey('fast80', period)
      if (!alreadyToasted(key)) {
        markToasted(key)
        toast.warning(
          'Fast AI pool is at 80%+',
          'Buy credits or enable pay-as-you-go with a spend cap. Your IDE stays open.',
          8000,
        )
      }
    }

    if (isPoolAtWarnThreshold(premium.used, premium.limit)) {
      const key = buildThresholdToastKey('prem80', period)
      if (!alreadyToasted(key)) {
        markToasted(key)
        toast.warning(
          'Premium AI pool is at 80%+',
          'Pro may fall back to Fast when Premium is empty. Or top up wallet / PAYG.',
          8000,
        )
      }
    }

    const payg = data.payg
    if (payg?.enabled && payg.spendCapUsdCents && payg.spendCapUsdCents > 0) {
      const pct = (payg.accruedUsdCents / payg.spendCapUsdCents) * 100
      if (pct >= 100) {
        const key = buildThresholdToastKey('payg100', period)
        if (!alreadyToasted(key)) {
          markToasted(key)
          toast.error(
            'PAYG spend cap reached',
            'AI post-quota path is paused until next period, wallet top-up, or a higher cap.',
            10000,
          )
        }
      } else if (pct >= 50) {
        const key = buildThresholdToastKey('payg50', period)
        if (!alreadyToasted(key)) {
          markToasted(key)
          toast.info(
            'PAYG at 50% of spend cap',
            `Accrued $${(payg.accruedUsdCents / 100).toFixed(2)} of $${(payg.spendCapUsdCents / 100).toFixed(2)}.`,
            7000,
          )
        }
      }
    }
  }, [data, toast])

  return null
}
