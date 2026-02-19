#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const ROUTE_EXPECTATIONS = [
  { file: 'app/api/auth/login/route.ts', scope: 'auth-login' },
  { file: 'app/api/auth/register/route.ts', scope: 'auth-register' },
  { file: 'app/api/auth/2fa/setup/route.ts', scope: 'auth-2fa-setup' },
  { file: 'app/api/auth/2fa/verify/route.ts', scope: 'auth-2fa-verify' },
  { file: 'app/api/auth/2fa/validate/route.ts', scope: 'auth-2fa-validate' },
  { file: 'app/api/auth/2fa/disable/route.ts', scope: 'auth-2fa-disable' },
  { file: 'app/api/auth/2fa/backup-codes/route.ts', scope: 'auth-2fa-backup-codes' },
  { file: 'app/api/auth/2fa/status/route.ts', scope: 'auth-2fa-status' },
  { file: 'app/api/auth/me/route.ts', scope: 'auth-me' },
  { file: 'app/api/auth/profile/route.ts', scope: 'auth-profile-read' },
  { file: 'app/api/auth/profile/route.ts', scope: 'auth-profile-update' },
  { file: 'app/api/auth/delete-account/route.ts', scope: 'auth-delete-account' },
  { file: 'app/api/web/search/route.ts', scope: 'web-search-post' },
  { file: 'app/api/web/fetch/route.ts', scope: 'web-fetch-post' },
  { file: 'app/api/files/route.ts', scope: 'files-legacy-get' },
  { file: 'app/api/files/route.ts', scope: 'files-legacy-post' },
  { file: 'app/api/files/tree/route.ts', scope: 'files-tree' },
  { file: 'app/api/files/fs/route.ts', scope: 'files-fs' },
  { file: 'app/api/files/raw/route.ts', scope: 'files-raw' },
  { file: 'app/api/files/read/route.ts', scope: 'files-read' },
  { file: 'app/api/files/write/route.ts', scope: 'files-write' },
  { file: 'app/api/files/list/route.ts', scope: 'files-list-get' },
  { file: 'app/api/files/list/route.ts', scope: 'files-list-post' },
  { file: 'app/api/files/create/route.ts', scope: 'files-create' },
  { file: 'app/api/files/delete/route.ts', scope: 'files-delete-post' },
  { file: 'app/api/files/delete/route.ts', scope: 'files-delete-delete' },
  { file: 'app/api/files/copy/route.ts', scope: 'files-copy' },
  { file: 'app/api/files/move/route.ts', scope: 'files-move' },
  { file: 'app/api/files/rename/route.ts', scope: 'files-rename' },
  { file: 'app/api/projects/route.ts', scope: 'projects-get' },
  { file: 'app/api/projects/route.ts', scope: 'projects-post' },
  { file: 'app/api/projects/[id]/route.ts', scope: 'projects-detail-get' },
  { file: 'app/api/projects/[id]/route.ts', scope: 'projects-detail-patch' },
  { file: 'app/api/projects/[id]/route.ts', scope: 'projects-detail-delete' },
  { file: 'app/api/projects/[id]/assets/route.ts', scope: 'projects-assets-get' },
  { file: 'app/api/projects/[id]/commits/route.ts', scope: 'projects-commits-get' },
  { file: 'app/api/projects/[id]/duplicate/route.ts', scope: 'projects-duplicate-post' },
  { file: 'app/api/projects/[id]/export/route.ts', scope: 'projects-export-post' },
  { file: 'app/api/projects/[id]/export/route.ts', scope: 'projects-export-list-get' },
  { file: 'app/api/projects/[id]/folders/route.ts', scope: 'projects-folders-get' },
  { file: 'app/api/projects/[id]/folders/route.ts', scope: 'projects-folders-post' },
  { file: 'app/api/projects/[id]/folders/route.ts', scope: 'projects-folders-delete' },
  { file: 'app/api/projects/[id]/invite-links/route.ts', scope: 'projects-invite-links-get' },
  { file: 'app/api/projects/[id]/invite-links/route.ts', scope: 'projects-invite-links-post' },
  { file: 'app/api/projects/[id]/invite-links/[linkId]/route.ts', scope: 'projects-invite-link-delete' },
  { file: 'app/api/projects/[id]/members/route.ts', scope: 'projects-members-get' },
  { file: 'app/api/projects/[id]/members/route.ts', scope: 'projects-members-post' },
  { file: 'app/api/projects/[id]/members/[memberId]/route.ts', scope: 'projects-member-detail-patch' },
  { file: 'app/api/projects/[id]/members/[memberId]/route.ts', scope: 'projects-member-detail-delete' },
  { file: 'app/api/projects/[id]/share/route.ts', scope: 'projects-share-post' },
  { file: 'app/api/projects/[id]/share/route.ts', scope: 'projects-share-get' },
  { file: 'app/api/projects/[id]/export/[exportId]/route.ts', scope: 'projects-export-status-get' },
  { file: 'app/api/projects/[id]/export/[exportId]/retry/route.ts', scope: 'projects-export-retry-post' },
  { file: 'app/api/assets/presign/route.ts', scope: 'assets-presign-post' },
  { file: 'app/api/assets/presign/route.ts', scope: 'assets-presign-get' },
  { file: 'app/api/assets/upload/route.ts', scope: 'assets-upload-post' },
  { file: 'app/api/assets/[id]/route.ts', scope: 'assets-detail-get' },
  { file: 'app/api/assets/[id]/route.ts', scope: 'assets-detail-patch' },
  { file: 'app/api/assets/[id]/route.ts', scope: 'assets-detail-delete' },
  { file: 'app/api/assets/[id]/confirm/route.ts', scope: 'assets-confirm-post' },
  { file: 'app/api/assets/[id]/download/route.ts', scope: 'assets-download-get' },
  { file: 'app/api/assets/[id]/download/route.ts', scope: 'assets-download-post' },
  { file: 'app/api/assets/[id]/duplicate/route.ts', scope: 'assets-duplicate-post' },
  { file: 'app/api/assets/[id]/favorite/route.ts', scope: 'assets-favorite-post' },
  { file: 'app/api/ai/chat/route.ts', scope: 'ai-chat' },
  { file: 'app/api/ai/query/route.ts', scope: 'ai-query' },
  { file: 'app/api/ai/stream/route.ts', scope: 'ai-stream' },
  { file: 'app/api/ai/complete/route.ts', scope: 'ai-complete' },
  { file: 'app/api/ai/chat-advanced/route.ts', scope: 'ai-chat-advanced' },
  { file: 'app/api/ai/action/route.ts', scope: 'ai-action' },
  { file: 'app/api/ai/inline-edit/route.ts', scope: 'ai-inline-edit' },
  { file: 'app/api/ai/inline-completion/route.ts', scope: 'ai-inline-completion' },
  { file: 'app/api/ai/agent/route.ts', scope: 'ai-agent-post' },
  { file: 'app/api/ai/agent/route.ts', scope: 'ai-agent-get' },
  { file: 'app/api/ai/change/validate/route.ts', scope: 'ai-change-validate-post' },
  { file: 'app/api/ai/change/apply/route.ts', scope: 'ai-change-apply-post' },
  { file: 'app/api/ai/change/rollback/route.ts', scope: 'ai-change-rollback-post' },
  { file: 'app/api/ai/suggestions/route.ts', scope: 'ai-suggestions-get' },
  { file: 'app/api/ai/suggestions/feedback/route.ts', scope: 'ai-suggestions-feedback-post' },
  { file: 'app/api/ai/suggestions/feedback/route.ts', scope: 'ai-suggestions-feedback-get' },
  { file: 'app/api/ai/thinking/[sessionId]/route.ts', scope: 'ai-thinking-get' },
  { file: 'app/api/ai/thinking/[sessionId]/route.ts', scope: 'ai-thinking-post' },
  { file: 'app/api/ai/trace/[traceId]/route.ts', scope: 'ai-trace-get' },
  { file: 'app/api/ai/director/[projectId]/route.ts', scope: 'ai-director-get' },
  { file: 'app/api/ai/director/[projectId]/action/route.ts', scope: 'ai-director-action-post' },
  { file: 'app/api/ai/image/generate/route.ts', scope: 'ai-image-generate-post' },
  { file: 'app/api/ai/image/generate/route.ts', scope: 'ai-image-generate-get' },
  { file: 'app/api/ai/voice/generate/route.ts', scope: 'ai-voice-generate-post' },
  { file: 'app/api/ai/voice/generate/route.ts', scope: 'ai-voice-generate-get' },
  { file: 'app/api/ai/music/generate/route.ts', scope: 'ai-music-generate-post' },
  { file: 'app/api/ai/music/generate/route.ts', scope: 'ai-music-generate-get' },
  { file: 'app/api/ai/3d/generate/route.ts', scope: 'ai-3d-generate-post' },
  { file: 'app/api/ai/3d/generate/route.ts', scope: 'ai-3d-generate-get' },
  { file: 'app/api/billing/checkout/route.ts', scope: 'billing-checkout' },
  { file: 'app/api/billing/checkout-link/route.ts', scope: 'billing-checkout-link' },
  { file: 'app/api/billing/plans/route.ts', scope: 'billing-plans-get' },
  { file: 'app/api/billing/portal/route.ts', scope: 'billing-portal-get' },
  { file: 'app/api/billing/portal/route.ts', scope: 'billing-portal-post' },
  { file: 'app/api/billing/subscription/route.ts', scope: 'billing-subscription-get' },
  { file: 'app/api/billing/usage/route.ts', scope: 'billing-usage-get' },
  { file: 'app/api/billing/credits/route.ts', scope: 'billing-credits-get' },
  { file: 'app/api/billing/credits/route.ts', scope: 'billing-credits-post' },
  { file: 'app/api/billing/webhook/route.ts', scope: 'billing-webhook-post' },
  { file: 'app/api/wallet/summary/route.ts', scope: 'wallet-summary-get' },
  { file: 'app/api/wallet/transactions/route.ts', scope: 'wallet-transactions-get' },
  { file: 'app/api/wallet/purchase-intent/route.ts', scope: 'wallet-purchase-intent-post' },
  { file: 'app/api/usage/status/route.ts', scope: 'usage-status-get' },
  { file: 'app/api/admin/payments/route.ts', scope: 'admin-payments-get' },
  { file: 'app/api/admin/payments/gateway/route.ts', scope: 'admin-payments-gateway-get' },
  { file: 'app/api/admin/payments/gateway/route.ts', scope: 'admin-payments-gateway-put' },
  { file: 'app/api/admin/security/overview/route.ts', scope: 'admin-security-overview-get' },
  { file: 'app/api/studio/session/start/route.ts', scope: 'studio-session-start' },
  { file: 'app/api/studio/session/[id]/route.ts', scope: 'studio-session-read' },
  { file: 'app/api/studio/session/[id]/stop/route.ts', scope: 'studio-session-stop' },
  { file: 'app/api/studio/cost/live/route.ts', scope: 'studio-cost-live' },
  { file: 'app/api/studio/tasks/plan/route.ts', scope: 'studio-task-plan' },
  { file: 'app/api/studio/tasks/[id]/run/route.ts', scope: 'studio-task-run' },
  { file: 'app/api/studio/tasks/[id]/validate/route.ts', scope: 'studio-task-validate' },
  { file: 'app/api/studio/tasks/[id]/apply/route.ts', scope: 'studio-task-apply' },
  { file: 'app/api/studio/tasks/[id]/rollback/route.ts', scope: 'studio-task-rollback' },
  { file: 'app/api/studio/access/full/route.ts', scope: 'studio-full-access-grant' },
  { file: 'app/api/studio/access/full/[id]/route.ts', scope: 'studio-full-access-revoke' },
  { file: 'app/api/render/jobs/[jobId]/cancel/route.ts', scope: 'render-job-cancel-post' },
]

const failures = []

for (const target of ROUTE_EXPECTATIONS) {
  const abs = path.join(ROOT, target.file)
  if (!fs.existsSync(abs)) {
    failures.push(`${target.file}: file not found`)
    continue
  }

  const content = fs.readFileSync(abs, 'utf8')
  if (!content.includes('await enforceRateLimit(')) {
    failures.push(`${target.file}: missing awaited enforceRateLimit`)
    continue
  }

  const scopePattern = new RegExp(`scope\\s*:\\s*['"\`]${target.scope}['"\`]`)
  if (!scopePattern.test(content)) {
    failures.push(`${target.file}: scope ${target.scope} not found`)
  }
}

if (failures.length > 0) {
  console.error('[critical-rate-limit] FAIL')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`[critical-rate-limit] PASS files=${ROUTE_EXPECTATIONS.length}`)
