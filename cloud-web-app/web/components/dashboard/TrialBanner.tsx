type TrialBannerProps = {
  trialDaysLeft: number
  onDismiss: () => void
  onUpgrade?: () => void
}

export function TrialBanner({ trialDaysLeft, onDismiss, onUpgrade }: TrialBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-[var(--aethel-text-primary)] px-6 py-3 text-sm flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Teste Pro: {trialDaysLeft} dias restantes - faça upgrade para acesso completo</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUpgrade}
          className="text-[var(--aethel-text-primary)] underline text-xs hover:text-[var(--aethel-text-secondary)]"
        >
          Fazer upgrade
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[var(--aethel-text-primary)] hover:text-[var(--aethel-text-secondary)] ml-2"
          aria-label="Dismiss trial banner"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
