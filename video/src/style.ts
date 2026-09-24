import type { CSSProperties } from 'react';
import type { Brand } from './script';

export const FONT = "'Rethink Sans', system-ui, -apple-system, sans-serif";

/** Type scale for 1920×1080. One family, the scale does the hierarchy. */
export const T = {
  displayXl: { fontSize: 104, lineHeight: 1.08, fontWeight: 500, letterSpacing: '-0.02em' },
  displayLg: { fontSize: 84, lineHeight: 1.12, fontWeight: 500, letterSpacing: '-0.02em' },
  displayMd: { fontSize: 64, lineHeight: 1.15, fontWeight: 500, letterSpacing: '-0.02em' },
  headline: { fontSize: 48, lineHeight: 1.2, fontWeight: 500, letterSpacing: '-0.02em' },
  title: { fontSize: 34, lineHeight: 1.25, fontWeight: 600, letterSpacing: '-0.014em' },
  body: { fontSize: 30, lineHeight: 1.4, fontWeight: 400, letterSpacing: 0 },
  bodySm: { fontSize: 24, lineHeight: 1.4, fontWeight: 400, letterSpacing: 0 },
  label: { fontSize: 24, lineHeight: 1.2, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const },
} satisfies Record<string, CSSProperties>;

export const text = (t: CSSProperties, extra?: CSSProperties): CSSProperties => ({ fontFamily: FONT, margin: 0, ...t, ...extra });

/** Colors derived from the brand. Light text is off-white so it never glares on a dark scene. */
export function palette(b: Brand) {
  return {
    ...b,
    light: '#fdfffc',
    lightMid: 'rgba(253,255,252,0.7)',
    lightLow: 'rgba(253,255,252,0.14)',
    shadowText: '0 2px 6px rgba(0,0,0,.6), 0 10px 44px rgba(0,0,0,.45)',
    shadowCard: '0 40px 90px -40px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.08)',
  };
}
export type Palette = ReturnType<typeof palette>;
