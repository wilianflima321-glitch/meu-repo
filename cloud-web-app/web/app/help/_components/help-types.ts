export type HelpIconKey = 'book' | 'credit-card' | 'message' | 'settings' | 'shield' | 'users' | 'zap'

export interface HelpFaq {
  question: string
  answer: string
}

export interface HelpCategory {
  name: string
  icon: HelpIconKey
  faqs: HelpFaq[]
}

export interface HelpQuickLink {
  href: string
  title: string
  description: string
  icon: HelpIconKey
  tone: 'primary' | 'success' | 'warning' | 'info'
  external?: boolean
}
