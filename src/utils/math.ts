/** URL / query helpers. */
export function isDebugQuery(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

export function worldToScreen(
  cam: { scrollX: number; scrollY: number; zoom: number },
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: (worldX - cam.scrollX) * cam.zoom,
    y: (worldY - cam.scrollY) * cam.zoom,
  };
}

export function screenToWorld(
  cam: { scrollX: number; scrollY: number; zoom: number },
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: screenX / cam.zoom + cam.scrollX,
    y: screenY / cam.zoom + cam.scrollY,
  };
}

/** Clamp frame delta after tab blur (ms). */
export function clampDelta(deltaMs: number, max = 50): number {
  return Math.min(deltaMs, max);
}
