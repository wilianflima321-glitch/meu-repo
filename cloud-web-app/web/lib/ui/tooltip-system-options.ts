import type { TooltipConfig, TooltipOptions } from './tooltip-system.types';

export function normalizeTooltipOptions(
  options: TooltipOptions,
  config: TooltipConfig
): Required<TooltipOptions> {
  const delay = typeof options.delay === 'number'
    ? { show: options.delay, hide: options.delay / 2 }
    : options.delay || { show: config.defaultDelay, hide: config.defaultDelay / 2 };

  return {
    id: options.id || '',
    content: options.content,
    position: options.position || config.defaultPosition,
    trigger: options.trigger || 'hover',
    delay,
    duration: options.duration ?? 0,
    offset: options.offset || { x: 0, y: 8 },
    animation: options.animation || config.defaultAnimation,
    animationDuration: options.animationDuration ?? config.defaultAnimationDuration,
    interactive: options.interactive ?? false,
    arrow: options.arrow ?? true,
    arrowSize: options.arrowSize ?? 8,
    maxWidth: options.maxWidth ?? config.defaultMaxWidth,
    zIndex: options.zIndex ?? config.defaultZIndex,
    theme: options.theme || 'default',
    boundary: options.boundary || config.globalBoundary || 'viewport',
    flipOnOverflow: options.flipOnOverflow ?? true,
    hideOnScroll: options.hideOnScroll ?? true,
    hideOnClickOutside: options.hideOnClickOutside ?? true,
    touchDuration: options.touchDuration ?? config.touchLongPressDuration,
    group: options.group || '',
    singleton: options.singleton ?? false,
    disabled: options.disabled ?? false,
    appendTo: options.appendTo || 'body',
    onShow: options.onShow || (() => {}),
    onHide: options.onHide || (() => {}),
    onCreate: options.onCreate || (() => {}),
  };
}
