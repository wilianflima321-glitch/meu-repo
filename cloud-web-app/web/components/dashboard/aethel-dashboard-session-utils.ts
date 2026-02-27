import type { ChatMessage } from '@/lib/api'

import type { DashboardSettings, SessionEntry, SessionFilter } from './aethel-dashboard-model'

function nextSessionId() {
  return Date.now().toString()
}

export function createInitialSessionEntry(prevLength: number, settings: DashboardSettings): SessionEntry {
  return {
    id: nextSessionId(),
    name: `Sessao ${prevLength + 1}`,
    timestamp: Date.now(),
    chatHistory: [],
    livePreviewSuggestions: [],
    favorite: false,
    scheduled: false,
    settings: { ...settings },
  }
}

export function createSavedSessionEntry(
  prevLength: number,
  chatHistory: ChatMessage[],
  livePreviewSuggestions: string[],
  settings: DashboardSettings
): SessionEntry {
  return {
    id: nextSessionId(),
    name: `Session ${prevLength + 1}`,
    timestamp: Date.now(),
    chatHistory: [...chatHistory],
    livePreviewSuggestions: [...livePreviewSuggestions],
    favorite: false,
    scheduled: false,
    settings: { ...settings },
  }
}

export function toggleSessionFavorite(sessions: SessionEntry[], sessionId: string): SessionEntry[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, favorite: !Boolean(session.favorite) } : session
  )
}

export function toggleSessionScheduled(sessions: SessionEntry[], sessionId: string): SessionEntry[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, scheduled: !Boolean(session.scheduled) } : session
  )
}

export function filterSessionHistory(sessions: SessionEntry[], filter: SessionFilter): SessionEntry[] {
  switch (filter) {
    case 'favorites':
      return sessions.filter((session) => Boolean(session.favorite))
    case 'scheduled':
      return sessions.filter((session) => Boolean(session.scheduled))
    default:
      return sessions
  }
}
