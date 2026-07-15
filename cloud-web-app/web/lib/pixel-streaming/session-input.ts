import type { InputMessage, PixelStreamingConfig, StreamingStats } from './types';

export interface PixelStreamingInputHandlers {
  keyboard(event: KeyboardEvent, type: 'down' | 'up'): void;
  mouse(event: MouseEvent, type: 'move' | 'down' | 'up' | 'wheel'): void;
  touch(event: TouchEvent, type: 'start' | 'move' | 'end' | 'cancel'): void;
}

export function createMouseInput(
  event: MouseEvent,
  type: 'move' | 'down' | 'up' | 'wheel',
  videoElement: HTMLVideoElement | null,
  stats: StreamingStats
): InputMessage | null {
  if (!videoElement) return null;

  const rect = videoElement.getBoundingClientRect();
  const scaleX = stats.resolution.width / rect.width;
  const scaleY = stats.resolution.height / rect.height;

  return {
    type: 'mouse',
    data: {
      event: type,
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      button: event.button,
      deltaX: type === 'wheel' ? (event as WheelEvent).deltaX : undefined,
      deltaY: type === 'wheel' ? (event as WheelEvent).deltaY : undefined,
    },
    timestamp: performance.now(),
  };
}

export function createKeyboardInput(event: KeyboardEvent, type: 'down' | 'up'): InputMessage {
  return {
    type: 'keyboard',
    data: {
      event: type,
      code: event.code,
      key: event.key,
      repeat: event.repeat,
      modifiers: {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      },
    },
    timestamp: performance.now(),
  };
}

export function createTouchInput(
  event: TouchEvent,
  type: 'start' | 'move' | 'end' | 'cancel',
  videoElement: HTMLVideoElement | null,
  stats: StreamingStats
): InputMessage | null {
  if (!videoElement) return null;

  const rect = videoElement.getBoundingClientRect();
  const scaleX = stats.resolution.width / rect.width;
  const scaleY = stats.resolution.height / rect.height;
  const touches = Array.from(event.touches).map((touch) => ({
    id: touch.identifier,
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
    force: touch.force,
  }));

  return {
    type: 'touch',
    data: { event: type, touches },
    timestamp: performance.now(),
  };
}

export function createGamepadInput(gamepad: Gamepad): InputMessage {
  return {
    type: 'gamepad',
    data: {
      index: gamepad.index,
      buttons: gamepad.buttons.map((button) => button.value),
      axes: Array.from(gamepad.axes),
    },
    timestamp: performance.now(),
  };
}

export function encodeInputBatch(inputs: InputMessage[]): ArrayBuffer {
  const buffer = new ArrayBuffer(2 + inputs.length * 64);
  const view = new DataView(buffer);
  let offset = 0;

  view.setUint16(offset, inputs.length, true);
  offset += 2;

  for (const input of inputs) {
    const typeCode = { mouse: 0, keyboard: 1, touch: 2, gamepad: 3 }[input.type];
    view.setUint8(offset, typeCode);
    offset += 1;

    view.setFloat64(offset, input.timestamp, true);
    offset += 8;

    const dataBytes = new TextEncoder().encode(JSON.stringify(input.data));
    view.setUint16(offset, dataBytes.length, true);
    offset += 2;

    new Uint8Array(buffer, offset, dataBytes.length).set(dataBytes);
    offset += dataBytes.length;
  }

  return buffer.slice(0, offset);
}

export function attachPixelStreamingInputHandlers(
  container: HTMLElement,
  config: PixelStreamingConfig,
  handlers: PixelStreamingInputHandlers
): () => void {
  const onMouseMove = (event: MouseEvent) => handlers.mouse(event, 'move');
  const onMouseDown = (event: MouseEvent) => handlers.mouse(event, 'down');
  const onMouseUp = (event: MouseEvent) => handlers.mouse(event, 'up');
  const onWheel = (event: WheelEvent) => handlers.mouse(event, 'wheel');
  const onKeyDown = (event: KeyboardEvent) => handlers.keyboard(event, 'down');
  const onKeyUp = (event: KeyboardEvent) => handlers.keyboard(event, 'up');
  const onTouchStart = (event: TouchEvent) => handlers.touch(event, 'start');
  const onTouchMove = (event: TouchEvent) => handlers.touch(event, 'move');
  const onTouchEnd = (event: TouchEvent) => handlers.touch(event, 'end');
  const onTouchCancel = (event: TouchEvent) => handlers.touch(event, 'cancel');

  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mousedown', onMouseDown);
  container.addEventListener('mouseup', onMouseUp);
  container.addEventListener('wheel', onWheel);
  container.addEventListener('keydown', onKeyDown);
  container.addEventListener('keyup', onKeyUp);
  container.addEventListener('touchstart', onTouchStart);
  container.addEventListener('touchmove', onTouchMove);
  container.addEventListener('touchend', onTouchEnd);
  container.addEventListener('touchcancel', onTouchCancel);
  container.tabIndex = 0;

  const previousCursor = container.style.cursor;
  if (config.cursorMode === 'hidden') container.style.cursor = 'none';

  return () => {
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('mousedown', onMouseDown);
    container.removeEventListener('mouseup', onMouseUp);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('keydown', onKeyDown);
    container.removeEventListener('keyup', onKeyUp);
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchmove', onTouchMove);
    container.removeEventListener('touchend', onTouchEnd);
    container.removeEventListener('touchcancel', onTouchCancel);
    container.style.cursor = previousCursor;
  };
}
