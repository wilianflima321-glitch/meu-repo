import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import { TooltipManager } from './tooltip-system';
import type { Tooltip, TooltipConfig, TooltipOptions } from './tooltip-system';

interface TooltipContextValue {
  manager: TooltipManager;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<TooltipConfig>;
}) {
  const value = useMemo(() => ({
    manager: new TooltipManager(config),
  }), [config]);

  useEffect(() => {
    return () => {
      value.manager.dispose();
    };
  }, [value]);

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltipManager() {
  const context = useContext(TooltipContext);
  if (!context) {
    return TooltipManager.getInstance();
  }
  return context.manager;
}

export function useTooltip(options: TooltipOptions): {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  update: (newOptions: Partial<TooltipOptions>) => void;
} {
  const manager = useTooltipManager();
  const ref = useRef<HTMLElement>(null);
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const id = manager.register(ref.current, options);
    setTooltipId(id);

    const onShow = (t: Tooltip) => {
      if (t.id === id) setIsVisible(true);
    };
    const onHide = (t: Tooltip) => {
      if (t.id === id) setIsVisible(false);
    };

    manager.on('show', onShow);
    manager.on('hide', onHide);

    return () => {
      manager.unregister(id);
      manager.off('show', onShow);
      manager.off('hide', onHide);
    };
  }, [manager, options]);

  const show = useCallback(() => {
    if (tooltipId) manager.show(tooltipId);
  }, [manager, tooltipId]);

  const hide = useCallback(() => {
    if (tooltipId) manager.hide(tooltipId);
  }, [manager, tooltipId]);

  const toggle = useCallback(() => {
    if (tooltipId) manager.toggle(tooltipId);
  }, [manager, tooltipId]);

  const update = useCallback((newOptions: Partial<TooltipOptions>) => {
    if (tooltipId) manager.update(tooltipId, newOptions);
  }, [manager, tooltipId]);

  return { ref: ref as React.RefObject<HTMLElement>, isVisible, show, hide, toggle, update };
}

export function useActiveTooltip() {
  const manager = useTooltipManager();
  const [active, setActive] = useState<Tooltip | undefined>(manager.getActive());

  useEffect(() => {
    const onShow = (t: Tooltip) => setActive(t);
    const onHide = () => setActive(undefined);

    manager.on('show', onShow);
    manager.on('hide', onHide);

    return () => {
      manager.off('show', onShow);
      manager.off('hide', onHide);
    };
  }, [manager]);

  return active;
}

export function useVisibleTooltips() {
  const manager = useTooltipManager();
  const [visible, setVisible] = useState<Tooltip[]>(manager.getVisible());

  useEffect(() => {
    const update = () => setVisible(manager.getVisible());

    manager.on('show', update);
    manager.on('hide', update);

    return () => {
      manager.off('show', update);
      manager.off('hide', update);
    };
  }, [manager]);

  return visible;
}

export function useTooltipHideAll() {
  const manager = useTooltipManager();

  return useCallback(() => {
    manager.hideAll();
  }, [manager]);
}
