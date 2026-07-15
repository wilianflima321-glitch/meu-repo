'use client'

import { RecentCallsSection } from './ai-monitor-calls'
import {
  EmergencyBanner,
  MetricsOverviewSection,
  MonitorFiltersBar,
  MonitorHeroSection,
  MonitorHighlightsSection,
  OperatorNoticeBanner,
} from './ai-monitor-overview'
import {
  CoreLoopMetricsSection,
  DossierSection,
  FullAccessAuditSection,
  LedgerIntegritySection,
  ModelBreakdownSection,
  PromotionSection,
  ReadinessSection,
  RunLedgerSection,
} from './ai-monitor-sections'
import { useAiMonitorPageState } from './use-ai-monitor-page-state'

export function AiMonitorAdminPanel() {
  const monitor = useAiMonitorPageState()

  return (
    <section className="space-y-6">
      <MonitorHeroSection
        headerDescription={monitor.headerDescription}
        headerTitle={monitor.headerTitle}
        isPaused={monitor.isPaused}
        isRunningDrill={monitor.isRunningDrill}
        isRunningProductionProbe={monitor.isRunningProductionProbe}
        lastUpdated={monitor.lastUpdated}
        onRefresh={monitor.refreshCalls}
        onRunCoreLoopDrill={monitor.runCoreLoopDrill}
        onRunProductionProbe={monitor.runProductionProbe}
        onTogglePause={() => monitor.setIsPaused((previousValue) => !previousValue)}
        strategicGaps={monitor.strategicGaps}
      />

      {monitor.operatorNotice && <OperatorNoticeBanner notice={monitor.operatorNotice} />}
      <MonitorHighlightsSection coreLoopLatest={monitor.coreLoopLatest} operatorBlockersCount={monitor.operatorBlockers.length} />
      <EmergencyBanner emergencyState={monitor.emergencyState} />

      {monitor.metrics && <MetricsOverviewSection metrics={monitor.metrics} />}
      {monitor.readiness && <ReadinessSection readiness={monitor.readiness} />}
      {monitor.promotionData && <PromotionSection promotion={monitor.promotionData} />}
      {monitor.dossier && <DossierSection dossier={monitor.dossier} unmetCriteria={monitor.unmetDossierCriteria} />}
      {monitor.coreLoopLatest && (
        <CoreLoopMetricsSection
          capabilityStatus={monitor.coreLoopMetricsData?.capabilityStatus}
          latest={monitor.coreLoopLatest}
          reasonPlaybook={monitor.reasonPlaybook}
          samplePolicy={monitor.coreLoopMetricsData?.samplePolicy}
          trend={monitor.coreLoopTrend}
        />
      )}
      {monitor.ledgerIntegrity && <LedgerIntegritySection ledgerIntegrity={monitor.ledgerIntegrity} />}
      {monitor.fullAccessAuditData && <FullAccessAuditSection audit={monitor.fullAccessAuditData} />}
      {monitor.runSummary && (
        <RunLedgerSection
          capabilityStatus={monitor.runsData?.capabilityStatus}
          runGroups={monitor.runGroups}
          runSampleClass={monitor.runSampleClass}
          runSummary={monitor.runSummary}
          runSummaryAll={monitor.runSummaryAll}
          sampleClassLabel={monitor.runsData?.metadata?.sampleClass}
        />
      )}
      {monitor.metrics?.modelBreakdown && <ModelBreakdownSection metrics={monitor.metrics} />}

      <MonitorFiltersBar
        modelFilter={monitor.modelFilter}
        onModelFilterChange={monitor.setModelFilter}
        onRunSampleClassChange={monitor.setRunSampleClass}
        onStatusFilterChange={monitor.setStatusFilter}
        runSampleClass={monitor.runSampleClass}
        statusFilter={monitor.statusFilter}
      />

      <RecentCallsSection calls={monitor.calls} expandedId={monitor.expandedId} onToggleExpanded={monitor.handleToggleExpanded} />
    </section>
  )
}
