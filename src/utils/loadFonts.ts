import { Fonts } from '@/ui/fonts';

/**
 * Wait for display + UI faces before Boot finishes so Phaser Text renders correctly.
 */
export async function loadGameFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(`700 42px ${Fonts.display.split(',')[0]!.trim()}`),
      document.fonts.load(`600 18px ${Fonts.ui.split(',')[0]!.trim()}`),
      document.fonts.ready,
    ]);
  } catch {
    // Offline / blocked CDN — fall back to CSS stack
  }
}

export function markGameReady(): void {
  document.getElementById('game')?.classList.add('ph-ready');
}
