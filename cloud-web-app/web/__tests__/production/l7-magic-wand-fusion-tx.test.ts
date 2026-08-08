/**
 * L.7 — MagicWand / AgenticUIStudio → CreativeFusionTransaction (Trava II).
 * Fail-closed when Fusion store unavailable; no ungoverned writes.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  applyMagicWandMutationViaFusionTx,
  isMutatingMagicWandCommand,
} from '@/lib/production/magic-wand-fusion-apply'
import {
  createMemoryUiMutationStore,
  __resetUiMutationTransactionsForTests,
} from '@/lib/production/ui-mutation-transaction'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'
import {
  bindFusionScopeStore,
  __resetFusionScopeRegistryForTests,
  getBoundFusionScopeStore,
} from '@/lib/production/fusion-scope-registry'
import { parseFusionTxClientHandoff } from '@/lib/production/fusion-tx-client-handoff'

beforeEach(() => {
  __resetUiMutationTransactionsForTests()
  __resetCreativeFusionTransactionsForTests()
  __resetFusionScopeRegistryForTests()
})

describe('L.7 MagicWand → FusionTx', () => {
  it('classifies Explain as non-mutating; Improve/Restyle/Apply as mutating', () => {
    expect(isMutatingMagicWandCommand('Explain this element:')).toBe(false)
    expect(isMutatingMagicWandCommand('Improve this element design:')).toBe(true)
    expect(isMutatingMagicWandCommand('Restyle this element:')).toBe(true)
    expect(isMutatingMagicWandCommand('Apply CSS variable --aethel-primary')).toBe(true)
  })

  it('fail-closed when FusionScopeStore is not bound (no ungoverned write)', async () => {
    const result = await applyMagicWandMutationViaFusionTx({
      projectId: 'proj-unbound',
      command: 'Restyle this element:',
      elementInfo: { tag: 'button', className: 'cta' },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.success).toBe(false)
      expect(result.reason).toBe('fusion_unavailable')
      expect(result.message).toMatch(/fail-closed|unavailable/i)
    }
    expect(getBoundFusionScopeStore('proj-unbound')).toBeUndefined()
  })

  it('fail-closed on empty mutation payload', async () => {
    const fusion = createMemoryFusionScopeStore()
    bindFusionScopeStore('proj-empty', fusion)
    const result = await applyMagicWandMutationViaFusionTx({
      projectId: 'proj-empty',
      command: 'Improve',
      mutation: { tsx: '', css: '', previewDom: '' },
      fusionStore: fusion,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('empty_mutation')
      expect(result.success).toBe(false)
    }
  })

  it('commits UI mutation under FusionTx and emits valid client handoff', async () => {
    const fusion = createMemoryFusionScopeStore()
    const ui = createMemoryUiMutationStore()
    bindFusionScopeStore('proj-l7', fusion)
    ui.applySnapshot('proj-l7', { tsx: 'BEFORE', css: '', previewDom: '' })

    const result = await applyMagicWandMutationViaFusionTx({
      projectId: 'proj-l7',
      command: 'Improve this element design: button',
      elementInfo: { tag: 'button', id: 'cta' },
      mutation: { tsx: 'export function Cta() { return <button id="cta" /> }' },
      fusionStore: fusion,
      uiStore: ui,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.success).toBe(true)
    expect(result.fusionTxId).toBeTruthy()
    expect(result.uiMutationTxId).toBeTruthy()
    expect(result.snapshotHashAfter).toBeTruthy()
    expect(result.snapshotHashAfter).not.toBe(result.snapshotHashBefore)

    const handoff = parseFusionTxClientHandoff(result.fusionHandoffJson)
    expect(handoff.schema).toBe('aethel.fusion-tx-handoff.v1')
    expect(handoff.projectId).toBe('proj-l7')
    expect(handoff.yDocScope).toBe('manifest')
    expect(handoff.afterPayload).toContain('Cta')
    expect(ui.getSnapshot('proj-l7').tsx).toContain('Cta')
  })

  it('missing projectId fails closed', async () => {
    const result = await applyMagicWandMutationViaFusionTx({
      projectId: '  ',
      command: 'Restyle',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_project')
  })
})
