import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { Achievement, AchievementProgress, Statistic } from './achievement-system.types';
import { AchievementManager, StatisticsManager } from './achievement-system';

const AchievementContext = createContext<AchievementManager | null>(null);

export function AchievementProvider({
  children,
  achievements = [],
  statistics = [],
}: {
  children: React.ReactNode;
  achievements?: Achievement[];
  statistics?: Statistic[];
}) {
  const statsManager = useRef<StatisticsManager>(new StatisticsManager());
  const managerRef = useRef<AchievementManager>(new AchievementManager(statsManager.current));

  useEffect(() => {
    statsManager.current.registerStats(statistics);
    managerRef.current.registerAchievements(achievements);
  }, [achievements, statistics]);

  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);

  return (
    <AchievementContext.Provider value={managerRef.current}>
      {children}
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const manager = useContext(AchievementContext);
  if (!manager) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }

  const [unlockedCount, setUnlockedCount] = useState(manager.getUnlockedAchievements().length);
  const [totalPoints, setTotalPoints] = useState(manager.getTotalPoints());
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);

  useEffect(() => {
    const updateStats = () => {
      setUnlockedCount(manager.getUnlockedAchievements().length);
      setTotalPoints(manager.getTotalPoints());
    };

    const handleUnlock = ({ achievement }: { achievement: Achievement }) => {
      updateStats();
      setRecentUnlock(achievement);
    };

    manager.on('achievementUnlocked', handleUnlock);
    manager.on('rewardsClaimed', updateStats);
    manager.on('dataRestored', updateStats);

    return () => {
      manager.off('achievementUnlocked', handleUnlock);
      manager.off('rewardsClaimed', updateStats);
      manager.off('dataRestored', updateStats);
    };
  }, [manager]);

  const clearRecentUnlock = useCallback(() => {
    setRecentUnlock(null);
  }, []);

  return {
    manager,
    unlockedCount,
    totalPoints,
    maxPoints: manager.getMaxPoints(),
    completionPercent: manager.getCompletionPercent(),
    recentUnlock,
    clearRecentUnlock,
    getAllAchievements: manager.getAllAchievements.bind(manager),
    getUnlocked: manager.getUnlockedAchievements.bind(manager),
    getLocked: manager.getLockedAchievements.bind(manager),
    getVisible: manager.getVisibleAchievements.bind(manager),
    getCategories: manager.getCategories.bind(manager),
    incrementStat: manager.incrementStat.bind(manager),
    setStat: manager.setStat.bind(manager),
    setFlag: manager.setFlag.bind(manager),
    claimRewards: manager.claimRewards.bind(manager),
  };
}

export function useAchievement(achievementId: string) {
  const { manager } = useAchievements();

  const [progress, setProgress] = useState<AchievementProgress | undefined>(
    manager.getProgress(achievementId)
  );

  useEffect(() => {
    const updateProgress = () => {
      setProgress(manager.getProgress(achievementId));
    };

    manager.on('progressUpdated', updateProgress);
    manager.on('achievementUnlocked', updateProgress);
    manager.on('dataRestored', updateProgress);

    return () => {
      manager.off('progressUpdated', updateProgress);
      manager.off('achievementUnlocked', updateProgress);
      manager.off('dataRestored', updateProgress);
    };
  }, [manager, achievementId]);

  const achievement = useMemo(() => manager.getAchievement(achievementId), [manager, achievementId]);

  return {
    achievement,
    progress,
    isUnlocked: progress?.isUnlocked ?? false,
    progressPercent: manager.getProgressPercent(achievementId),
    hasUnclaimedRewards: manager.hasUnclaimedRewards(achievementId),
  };
}

export function useStat(statId: string) {
  const { manager } = useAchievements();
  const stats = manager.getStatistics();

  const [value, setValue] = useState(stats.getStat(statId));

  useEffect(() => {
    const handleChange = ({ statId: changedId, newValue }: { statId: string; newValue: number }) => {
      if (changedId === statId) {
        setValue(newValue);
      }
    };

    stats.on('statChanged', handleChange);

    return () => {
      stats.off('statChanged', handleChange);
    };
  }, [stats, statId]);

  const increment = useCallback((amount = 1) => {
    stats.incrementStat(statId, amount);
  }, [stats, statId]);

  const set = useCallback((newValue: number) => {
    stats.setStat(statId, newValue);
  }, [stats, statId]);

  return { value, increment, set, formatted: stats.formatStat(statId) };
}
