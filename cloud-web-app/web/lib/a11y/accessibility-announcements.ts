function createLiveRegion(id: string, ariaLive: 'polite' | 'assertive'): HTMLDivElement {
  let region = document.getElementById(id) as HTMLDivElement;

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', ariaLive);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(region);
  }

  return region;
}

let politeRegion: HTMLDivElement | null = null;
let assertiveRegion: HTMLDivElement | null = null;

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;

  // Initialize regions
  if (!politeRegion) {
    politeRegion = createLiveRegion('a11y-announcer-polite', 'polite');
  }
  if (!assertiveRegion) {
    assertiveRegion = createLiveRegion('a11y-announcer-assertive', 'assertive');
  }

  const region = priority === 'assertive' ? assertiveRegion : politeRegion;

  // Clear and set new message
  region.textContent = '';

  // Use setTimeout to ensure the change is detected
  setTimeout(() => {
    region.textContent = message;
  }, 50);
}

/**
 * Clear all announcements
 */
export function clearAnnouncements(): void {
  if (politeRegion) politeRegion.textContent = '';
  if (assertiveRegion) assertiveRegion.textContent = '';
}

// ============================================================================
// Accessibility Hooks
// ============================================================================

/**
 * Hook to detect user preferences
 */
