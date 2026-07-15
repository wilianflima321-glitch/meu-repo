type Cleanup = () => void;

export interface InputRuntimeEventHandlers {
  keyDown: (event: KeyboardEvent) => void;
  keyUp: (event: KeyboardEvent) => void;
  mouseDown: (event: MouseEvent) => void;
  mouseUp: (event: MouseEvent) => void;
  mouseMove: (event: MouseEvent) => void;
  wheel: (event: WheelEvent) => void;
  contextMenu: (event: MouseEvent) => void;
  touchStart: (event: TouchEvent) => void;
  touchMove: (event: TouchEvent) => void;
  touchEnd: (event: TouchEvent) => void;
  touchCancel: (event: TouchEvent) => void;
  gamepadConnected: (event: GamepadEvent) => void;
  gamepadDisconnected: (event: GamepadEvent) => void;
}

export function bindInputRuntimeEvents(
  element: HTMLElement | Window,
  handlers: InputRuntimeEventHandlers
): Cleanup {
  const cleanups: Cleanup[] = [
    listen(element, 'keydown', handlers.keyDown as EventListener),
    listen(element, 'keyup', handlers.keyUp as EventListener),
    listen(element, 'mousedown', handlers.mouseDown as EventListener),
    listen(element, 'mouseup', handlers.mouseUp as EventListener),
    listen(element, 'mousemove', handlers.mouseMove as EventListener),
    listen(element, 'wheel', handlers.wheel as EventListener, { passive: false }),
    listen(element, 'contextmenu', handlers.contextMenu as EventListener),
    listen(element, 'touchstart', handlers.touchStart as EventListener),
    listen(element, 'touchmove', handlers.touchMove as EventListener),
    listen(element, 'touchend', handlers.touchEnd as EventListener),
    listen(element, 'touchcancel', handlers.touchCancel as EventListener),
    listen(window, 'gamepadconnected', handlers.gamepadConnected as EventListener),
    listen(window, 'gamepaddisconnected', handlers.gamepadDisconnected as EventListener),
  ];

  return () => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  };
}

function listen(
  target: HTMLElement | Window,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): Cleanup {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}
