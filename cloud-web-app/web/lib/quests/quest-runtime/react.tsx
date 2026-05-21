/**
 * Quest System - split gameplay runtime.
 *
 * Quest authoring, runtime state, and React bindings are separated so Studio
 * can lazy-load gameplay systems without pulling the whole subsystem at once.
 */

import { useState, useRef, useEffect, useContext, createContext, useCallback, type ReactNode } from 'react';
import { QuestManager } from './manager';
import type { QuestInstance, QuestJournalEntry } from './types';

const QuestContext = createContext<QuestManager | null>(null);

export function QuestProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<QuestManager>(new QuestManager());
  
  useEffect(() => {
    const manager = managerRef.current;
    manager.startTimerChecks();
    
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <QuestContext.Provider value={managerRef.current}>
      {children}
    </QuestContext.Provider>
  );
}

export function useQuests() {
  const manager = useContext(QuestContext);
  if (!manager) {
    throw new Error('useQuests must be used within a QuestProvider');
  }
  
  const [journal, setJournal] = useState<QuestJournalEntry[]>([]);
  const [trackedQuest, setTrackedQuest] = useState<QuestInstance | null>(null);
  
  useEffect(() => {
    const updateJournal = () => setJournal(manager.getJournal());
    const updateTracked = () => setTrackedQuest(manager.getTrackedQuest());
    
    const events = [
      'questStarted',
      'questCompleted',
      'questFailed',
      'questAbandoned',
      'questTurnedIn',
      'objectiveProgress',
      'questTracked',
      'questUntracked',
    ];
    
    for (const event of events) {
      manager.on(event, updateJournal);
      manager.on(event, updateTracked);
    }
    
    updateJournal();
    updateTracked();
    
    return () => {
      for (const event of events) {
        manager.off(event, updateJournal);
        manager.off(event, updateTracked);
      }
    };
  }, [manager]);
  
  const startQuest = useCallback((questId: string) => {
    return manager.startQuest(questId);
  }, [manager]);
  
  const abandonQuest = useCallback((questId: string) => {
    return manager.abandonQuest(questId);
  }, [manager]);
  
  const turnInQuest = useCallback((questId: string) => {
    return manager.turnInQuest(questId);
  }, [manager]);
  
  const trackQuest = useCallback((questId: string) => {
    return manager.trackQuest(questId);
  }, [manager]);
  
  return {
    manager,
    journal,
    trackedQuest,
    activeQuests: manager.getActiveQuests(),
    availableQuests: manager.getAvailableQuests(),
    startQuest,
    abandonQuest,
    turnInQuest,
    trackQuest,
    untrackQuest: manager.untrackQuest.bind(manager),
    registerQuest: manager.registerQuest.bind(manager),
    registerQuests: manager.registerQuests.bind(manager),
  };
}

export function useQuestProgress(questId: string) {
  const { manager } = useQuests();
  const [quest, setQuest] = useState<QuestInstance | undefined>(manager.getQuest(questId));
  
  useEffect(() => {
    const update = ({ questId: id }: { questId: string }) => {
      if (id === questId) {
        setQuest(manager.getQuest(questId));
      }
    };
    
    manager.on('objectiveProgress', update);
    manager.on('questStarted', update);
    manager.on('questCompleted', update);
    
    return () => {
      manager.off('objectiveProgress', update);
      manager.off('questStarted', update);
      manager.off('questCompleted', update);
    };
  }, [manager, questId]);
  
  return quest;
}
