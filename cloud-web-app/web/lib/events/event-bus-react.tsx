/** React bindings for the Aethel event bus. */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { EventBus, Signal } from './event-bus-system';
import type { EventBusConfig, EventData, EventHandler } from './event-bus-contracts';

// ============================================================================
// REACT HOOKS
// ============================================================================

const EventBusContext = createContext<EventBus | null>(null);

export function EventBusProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: Partial<EventBusConfig>;
}) {
  const busRef = useRef<EventBus>(new EventBus(config));

  useEffect(() => {
    const bus = busRef.current;
    return () => {
      bus.dispose();
    };
  }, []);

  return (
    <EventBusContext.Provider value={busRef.current}>
      {children}
    </EventBusContext.Provider>
  );
}

export function useEventBus() {
  const bus = useContext(EventBusContext);
  if (!bus) {
    // Return global instance if not in provider
    return EventBus.getInstance();
  }
  return bus;
}

export function useEvent<T = unknown>(
  eventType: string,
  handler: EventHandler<T>,
  deps: unknown[] = []
): void {
  const bus = useEventBus();

  useEffect(() => {
    const id = bus.subscribe<T>(eventType, handler);
    return () => {
      bus.unsubscribe(id);
    };
  }, [bus, eventType, handler, deps]);
}

export function useEventDispatch() {
  const bus = useEventBus();

  const dispatch = useCallback(
    <T = unknown>(eventType: string, payload: T) => {
      bus.dispatch(eventType, payload);
    },
    [bus]
  );

  const dispatchAsync = useCallback(
    async <T = unknown>(eventType: string, payload: T) => {
      await bus.dispatchAsync(eventType, payload);
    },
    [bus]
  );

  return { dispatch, dispatchAsync };
}

export function useSignal<T>(initialValue: T, name?: string): [T, (value: T) => void, Signal<T>] {
  const signalRef = useRef<Signal<T>>(new Signal(initialValue, name));
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const signal = signalRef.current;
    const unsub = signal.subscribe((newValue) => {
      setValue(newValue);
    });

    return () => {
      unsub();
      signal.dispose();
    };
  }, []);

  const setSignalValue = useCallback((newValue: T) => {
    signalRef.current.set(newValue);
  }, []);

  return [value, setSignalValue, signalRef.current];
}

export function useChannel(channelName: string) {
  const bus = useEventBus();
  const channel = useMemo(() => bus.createChannel(channelName), [bus, channelName]);

  useEffect(() => {
    return () => {
      // Don't destroy channel on unmount - it may be used by other components
    };
  }, []);

  const subscribe = useCallback(
    <T = unknown>(eventType: string, handler: EventHandler<T>) => {
      return channel.subscribe(eventType, handler);
    },
    [channel]
  );

  const dispatch = useCallback(
    <T = unknown>(eventType: string, payload: T) => {
      channel.dispatch(eventType, payload);
    },
    [channel]
  );

  return { channel, subscribe, dispatch };
}

export function useEventHistory(options?: { type?: string; limit?: number }) {
  const bus = useEventBus();
  const [history, setHistory] = useState<EventData[]>([]);

  useEffect(() => {
    const updateHistory = () => {
      setHistory(bus.getHistory(options));
    };

    updateHistory();

    const id = bus.subscribe('*', updateHistory);

    return () => {
      bus.unsubscribe(id);
    };
  }, [bus, options]);

  const clearHistory = useCallback(() => {
    bus.clearHistory();
    setHistory([]);
  }, [bus]);

  return { history, clearHistory };
}
