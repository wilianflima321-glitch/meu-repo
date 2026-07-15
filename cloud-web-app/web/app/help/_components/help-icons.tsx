import { Book, CreditCard, MessageSquare, Settings, Shield, Users, Zap } from 'lucide-react'
import type { HelpIconKey } from './help-types'

export const helpIcons = {
  book: Book,
  'credit-card': CreditCard,
  message: MessageSquare,
  settings: Settings,
  shield: Shield,
  users: Users,
  zap: Zap,
} satisfies Record<HelpIconKey, typeof Book>
