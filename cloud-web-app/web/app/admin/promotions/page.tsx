'use client'

import { PromotionCreateForm } from './_components/PromotionCreateForm'
import { PromotionsHeader } from './_components/PromotionsHeader'
import { PromotionsList } from './_components/PromotionsList'
import { PromotionsSummary } from './_components/PromotionsSummary'
import { usePromotionsPageState } from './_components/use-promotions-page-state'

export default function PromotionsPage() {
  const promotions = usePromotionsPageState()

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PromotionsHeader lastUpdated={promotions.lastUpdated} onRefresh={promotions.fetchPromotions} />
      <PromotionsSummary summary={promotions.summary} />
      <PromotionCreateForm creating={promotions.creating} formError={promotions.formError} newPromotion={promotions.newPromotion} onChange={promotions.setNewPromotion} onCreate={promotions.handleCreate} />
      <PromotionsList error={promotions.error} loading={promotions.loading} promotions={promotions.filteredPromotions} search={promotions.search} statusFilter={promotions.statusFilter} onSearchChange={promotions.setSearch} onStatusChange={promotions.setStatusFilter} onToggle={promotions.handleToggle} />
    </div>
  )
}
