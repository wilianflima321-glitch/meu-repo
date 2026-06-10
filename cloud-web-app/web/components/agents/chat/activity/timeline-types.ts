export type AIChatTimelineTone = 'user' | 'assistant' | 'system' | 'live'

export interface AIChatTimelineItem {
  id: string
  tone: AIChatTimelineTone
  title: string
  summary: string
  meta: string
}
