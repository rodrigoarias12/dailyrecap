import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Label, Mark, Words, fit, leave, pop, useLayout } from './pieces';
import { T, text, type Palette } from './style';

/**
 * The short-form scenes that list things (events, chips, agenda) and the closing, redrawn the
 * way the promo is drawn: one idea per screen, type that fills the frame, a hard cut on every
 * item. A list of six small rows is a slide; six rows one after the other, each the size of a
 * headline, is a video. The scene's seconds are split evenly among its items.
 */

function useItem(count: number, total: number) {
  const f = useCurrentFrame();
  const n = Math.max(1, count);
  const len = Math.max(1, Math.floor(total / n));
  const i = Math.min(n - 1, Math.floor(f / len));
  return { f, i, at: i * len, local: f - i * len, len };
}

function Counter({ p, i, n, dark = true }: { p: Palette; i: number; n: number; dark?: boolean }) {
  if (n < 2) return null;
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 36 }}>
      {Array.from({ length: n }, (_, k) => (
        <span key={k} style={{ width: k === i ? 44 : 14, height: 14, borderRadius: 99, background: k <= i ? p.accent : dark ? p.lightLow : 'rgba(0,0,0,0.12)' }} />
      ))}
    </div>
  );
}

/** What happened: one row per screen, the row as a headline, its verification as a big chip. */
export function ShortEvents({ p, label, items, total }: { p: Palette; label: string; items: { tag: string; text: string; who?: string; verified?: boolean }[]; total: number }) {
  const list = items.slice(0, 6);
  const { i, at, local } = useItem(list.length, total);
  const { fps } = useVideoConfig();
  const { frame, textMax } = useLayout();
  const it = list[i];
  const k = pop(local, 6, fps);
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'center', padding: frame, opacity: leave(useCurrentFrame(), total) }}>
      <Backdrop p={p} total={total} />
      {list.map((row, n) => (
        <Sequence key={n} from={Math.floor((n * total) / list.length)} durationInFrames={20} layout="none">
          <Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.26} />
          {row.verified === true && <Sequence from={6} layout="none"><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.2} /></Sequence>}
        </Sequence>
      ))}
      <div style={{ position: 'relative' }}>
        <Label p={p} style={{ marginBottom: 28, fontSize: 28 }}>{label}</Label>
        <Words key={i} from={at === 0 ? -20 : 0} style={text(T.displayLg, { color: p.light, fontSize: fit(it.text.length), fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.03em', maxWidth: textMax })}>{it.text}</Words>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 34, flexWrap: 'wrap', opacity: Math.min(1, k), transform: `scale(${0.7 + 0.3 * k})`, transformOrigin: 'left center' }}>
          <Mark p={p} verified={it.verified} size={40} />
          <span style={text(T.body, { color: p.lightMid, fontSize: 34 })}>{[it.who, it.tag].filter(Boolean).join(' · ')}</span>
        </div>
        <Counter p={p} i={i} n={list.length} />
      </div>
    </AbsoluteFill>
  );
}

/** Capabilities: one per screen, on the beat, the background alternating like the promo's three words. */
export function ShortChips({ p, label, items, total }: { p: Palette; label: string; items: string[]; total: number }) {
  const list = items.slice(0, 5);
  const { i, local } = useItem(list.length, total);
  const { fps } = useVideoConfig();
  const { frame, textMax } = useLayout();
  const looks = [
    { bg: p.accent, fg: p.ink, dark: false },
    { bg: p.ink, fg: p.light, dark: true },
    { bg: p.bg, fg: p.ink, dark: false },
  ];
  const look = looks[i % looks.length];
  const k = pop(local, 0, fps);
  const it = list[i];
  return (
    <AbsoluteFill style={{ background: look.bg, justifyContent: 'center', padding: frame, opacity: leave(useCurrentFrame(), total) }}>
      {list.map((_, n) => (
        <Sequence key={n} from={Math.floor((n * total) / list.length)} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.2} /></Sequence>
      ))}
      <Label p={p} dark={look.dark} style={{ marginBottom: 30, fontSize: 28, ...(look.bg === p.accent ? { color: p.ink, opacity: 0.7 } : {}) }}>{label}</Label>
      <div style={{ transform: `scale(${1.12 - 0.12 * Math.min(1, k)})`, transformOrigin: 'left center' }}>
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={look.bg === p.accent ? p.ink : p.accent === look.bg ? p.ink : look.dark ? p.accent : p.ink} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginBottom: 20 }}><path d="M4 12.5l5 5L20 6.5" /></svg>
        <p style={text(T.displayXl, { color: look.fg, fontSize: fit(it.length), fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.03em', maxWidth: textMax })}>{it}</p>
      </div>
      <Counter p={p} i={i} n={list.length} dark={look.dark} />
    </AbsoluteFill>
  );
}

/** What is next: one entry per screen, the time as big as a number scene. */
export function ShortAgenda({ p, label, items, total }: { p: Palette; label: string; items: { when: string; text: string }[]; total: number }) {
  const list = items.slice(0, 5);
  const { i, at, local } = useItem(list.length, total);
  const { fps } = useVideoConfig();
  const { frame, textMax } = useLayout();
  const it = list[i];
  const k = pop(local, 0, fps);
  return (
    <AbsoluteFill style={{ background: p.bg, justifyContent: 'center', padding: frame, opacity: leave(useCurrentFrame(), total) }}>
      <Backdrop p={p} total={total} dark={false} />
      {list.map((_, n) => (
        <Sequence key={n} from={Math.floor((n * total) / list.length)} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.22} /></Sequence>
      ))}
      <div style={{ position: 'relative' }}>
        <Label p={p} dark={false} style={{ marginBottom: 24, fontSize: 28 }}>{label}</Label>
        <p style={{ ...text(T.displayXl, { color: p.ink, fontSize: 200, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.045em', fontVariantNumeric: 'tabular-nums' }), transform: `scale(${0.6 + 0.4 * k})`, transformOrigin: 'left center', opacity: Math.min(1, k) }}>{it.when}</p>
        <Words key={i} from={at === 0 ? 2 : 4} style={text(T.displayMd, { color: p.ink, fontSize: Math.min(88, fit(it.text.length)), fontWeight: 500, lineHeight: 1.08, marginTop: 26, maxWidth: textMax })}>{it.text}</Words>
        <Counter p={p} i={i} n={list.length} dark={false} />
      </div>
    </AbsoluteFill>
  );
}

/** The closing, as the promo ends: the name big, the line under it, the address typed into an ink pill. */
export function ShortClosing({ p, cta, total, credit }: { p: Palette; cta: string; total: number; credit: boolean }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { frame, textMax } = useLayout();
  const k = pop(f, 0, fps);
  const pill = pop(f, 14, fps);
  const typed = p.url.slice(0, Math.max(0, Math.min(p.url.length, Math.floor((f - 18) * 1.8))));
  return (
    <AbsoluteFill style={{ background: p.accent, justifyContent: 'center', padding: frame, opacity: leave(f, total, 12) }}>
      <Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.22} />
      <p style={{ ...text(T.displayXl, { color: p.ink, fontSize: fit(p.name.length) + 16, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1 }), transform: `scale(${0.8 + 0.2 * k})`, transformOrigin: 'left center', opacity: Math.min(1, k) }}>{p.name}</p>
      <Words from={6} style={text(T.headline, { color: p.ink, fontSize: 58, lineHeight: 1.12, marginTop: 30, maxWidth: textMax })}>{cta}</Words>
      {p.url && (
        <div style={{ alignSelf: 'flex-start', marginTop: 44, padding: '24px 40px', borderRadius: 999, background: p.ink, transform: `scale(${pill})`, transformOrigin: 'left center', boxShadow: '0 30px 60px -30px rgba(0,0,0,.5)' }}>
          <p style={text(T.title, { color: p.light, fontSize: 44, whiteSpace: 'nowrap' })}>{typed || ' '}</p>
        </div>
      )}
      {credit && <p style={text(T.label, { color: p.ink, fontSize: 18, opacity: 0.6, marginTop: 44 })}>made with DailyRecap</p>}
    </AbsoluteFill>
  );
}
