import type { ReactNode } from 'react';

import { NotificationManager } from './notification-system.manager';
import type { Notification, NotificationConfig, NotificationOptions, NotificationPosition } from './notification-system.types';

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface NotificationContextValue {
  manager: NotificationManager;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: Partial<NotificationConfig>;
}) {
  const value = useMemo(() => ({
    manager: new NotificationManager(config),
  }), [config]);

  useEffect(() => {
    return () => {
      value.manager.dispose();
    };
  }, [value]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    return NotificationManager.getInstance();
  }
  return context.manager;
}

export function useVisibleNotifications() {
  const manager = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>(manager.getVisible());

  useEffect(() => {
    const update = (n: Notification[]) => setNotifications([...n]);
    manager.on('change', update);

    return () => {
      manager.off('change', update);
    };
  }, [manager]);

  return notifications;
}

export function useNotificationsByPosition(position: NotificationPosition) {
  const manager = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>(
    manager.getByPosition(position)
  );

  useEffect(() => {
    const update = () => setNotifications(manager.getByPosition(position));
    manager.on('change', update);

    return () => {
      manager.off('change', update);
    };
  }, [manager, position]);

  return notifications;
}

export function useToast() {
  const manager = useNotifications();

  const toast = useCallback((options: NotificationOptions) => {
    return manager.show(options);
  }, [manager]);

  const success = useCallback((title: string, message?: string) => {
    return manager.success(title, message);
  }, [manager]);

  const error = useCallback((title: string, message?: string) => {
    return manager.error(title, message);
  }, [manager]);

  const warning = useCallback((title: string, message?: string) => {
    return manager.warning(title, message);
  }, [manager]);

  const info = useCallback((title: string, message?: string) => {
    return manager.info(title, message);
  }, [manager]);

  const close = useCallback((id: string) => {
    manager.close(id);
  }, [manager]);

  const promise = useCallback(<T,>(
    p: Promise<T>,
    options: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) => {
    return manager.promise(p, options);
  }, [manager]);

  return { toast, success, error, warning, info, close, promise };
}

export function useGameNotifications() {
  const manager = useNotifications();

  const achievement = useCallback((title: string, message?: string) => {
    return manager.achievement(title, message);
  }, [manager]);

  const objective = useCallback((title: string, message?: string) => {
    return manager.objective(title, message);
  }, [manager]);

  const item = useCallback((itemName: string) => {
    return manager.item(itemName);
  }, [manager]);

  const levelUp = useCallback((level: number) => {
    return manager.levelUp(level);
  }, [manager]);

  const message = useCallback((from: string, content: string) => {
    return manager.message(from, content);
  }, [manager]);

  return { achievement, objective, item, levelUp, message };
}

export function useNotificationProgress(id: string) {
  const manager = useNotifications();

  const setProgress = useCallback((progress: number) => {
    manager.setProgress(id, progress);
  }, [manager, id]);

  const complete = useCallback(() => {
    manager.setProgress(id, 100);
    setTimeout(() => manager.close(id), 500);
  }, [manager, id]);

  return { setProgress, complete };
}
