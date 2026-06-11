import type { Tooltip, TooltipPosition } from './tooltip-system.types';

export function calculateTooltipPosition(tooltip: Tooltip): {
  coords: { x: number; y: number };
  placement: TooltipPosition;
} {
  const { element, options } = tooltip;
  const rect = element.getBoundingClientRect();
  const boundary = getTooltipBoundary(element, options.boundary);
  const estimatedWidth = options.maxWidth;
  const estimatedHeight = 80;

  let placement = options.position;
  let { x, y } = getTooltipPositionCoords(
    rect,
    estimatedWidth,
    estimatedHeight,
    placement,
    options.offset
  );

  if (options.flipOnOverflow) {
    const flipped = flipTooltipIfNeeded({
      x,
      y,
      width: estimatedWidth,
      height: estimatedHeight,
      boundary,
      position: placement,
      rect,
      offset: options.offset,
    });

    x = flipped.x;
    y = flipped.y;
    placement = flipped.placement;
  }

  return { coords: { x, y }, placement };
}

function getTooltipBoundary(element: HTMLElement, boundaryConfig: Required<Tooltip['options']>['boundary']): DOMRect {
  if (boundaryConfig === 'viewport') {
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  }

  if (boundaryConfig === 'parent' && element.parentElement) {
    return element.parentElement.getBoundingClientRect();
  }

  if (boundaryConfig instanceof DOMRect) {
    return boundaryConfig;
  }

  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

function getTooltipPositionCoords(
  rect: DOMRect,
  width: number,
  height: number,
  position: TooltipPosition,
  offset: { x: number; y: number }
): { x: number; y: number } {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  switch (position) {
    case 'top':
      return { x: centerX - width / 2, y: rect.top - height - offset.y };
    case 'top-start':
      return { x: rect.left, y: rect.top - height - offset.y };
    case 'top-end':
      return { x: rect.right - width, y: rect.top - height - offset.y };
    case 'bottom':
      return { x: centerX - width / 2, y: rect.bottom + offset.y };
    case 'bottom-start':
      return { x: rect.left, y: rect.bottom + offset.y };
    case 'bottom-end':
      return { x: rect.right - width, y: rect.bottom + offset.y };
    case 'left':
      return { x: rect.left - width - offset.x, y: centerY - height / 2 };
    case 'left-start':
      return { x: rect.left - width - offset.x, y: rect.top };
    case 'left-end':
      return { x: rect.left - width - offset.x, y: rect.bottom - height };
    case 'right':
      return { x: rect.right + offset.x, y: centerY - height / 2 };
    case 'right-start':
      return { x: rect.right + offset.x, y: rect.top };
    case 'right-end':
      return { x: rect.right + offset.x, y: rect.bottom - height };
  }
}

function flipTooltipIfNeeded(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  boundary: DOMRect;
  position: TooltipPosition;
  rect: DOMRect;
  offset: { x: number; y: number };
}): { x: number; y: number; placement: TooltipPosition } {
  const flipMap: Record<TooltipPosition, TooltipPosition> = {
    top: 'bottom',
    'top-start': 'bottom-start',
    'top-end': 'bottom-end',
    bottom: 'top',
    'bottom-start': 'top-start',
    'bottom-end': 'top-end',
    left: 'right',
    'left-start': 'right-start',
    'left-end': 'right-end',
    right: 'left',
    'right-start': 'left-start',
    'right-end': 'left-end',
  };

  let flipped = false;
  let newPosition = input.position;

  if (input.position.startsWith('top') && input.y < input.boundary.top) {
    newPosition = flipMap[input.position];
    flipped = true;
  } else if (input.position.startsWith('bottom') && input.y + input.height > input.boundary.bottom) {
    newPosition = flipMap[input.position];
    flipped = true;
  }

  if (input.position.startsWith('left') && input.x < input.boundary.left) {
    newPosition = flipMap[input.position];
    flipped = true;
  } else if (input.position.startsWith('right') && input.x + input.width > input.boundary.right) {
    newPosition = flipMap[input.position];
    flipped = true;
  }

  if (!flipped) {
    return { x: input.x, y: input.y, placement: input.position };
  }

  const newCoords = getTooltipPositionCoords(input.rect, input.width, input.height, newPosition, input.offset);
  return { x: newCoords.x, y: newCoords.y, placement: newPosition };
}
