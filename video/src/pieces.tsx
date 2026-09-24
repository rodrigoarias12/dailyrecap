import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Focus } from './script';
import { T, text, type Palette } from './style';

/**
 * Rethink Sans from public/fonts, declared with @font-face. The render is held until the
 * four faces loaded: otherwise the first frames would come out in the system font.
 */
const FACES: Array<[number, string]> = [
  [400, 'RethinkSans-Regular.ttf'],
  [500, 'RethinkSans-Medium.ttf'],
  [600, 'RethinkSans-SemiBold.ttf'],
  [700, 'RethinkSans-Bold.ttf'],
];
export function Fonts() {
  const [handle] = useState(() => delayRender('Loading Rethink Sans'));
  useEffect(() => {
    Promise.all(
      FACES.map(async ([weight, file]) => {
        const f = new FontFace('Rethink Sans', `url(${staticFile(`fonts/${file}`)})`, { weight: String(weight) });
        await f.load();
        (document.fonts as unknown as { add(face: FontFace): void }).add(f);
      }),
    )
      .catch((e) => console.error('fonts', e))
      .finally(() => continueRender(handle));
  }, [handle]);
  return null;
}

/**
 * The same pieces serve 1920×1080 and 1080×1920. Type sizes are designed for a 1080 px
 * short side, so they hold in both; what changes is the gutter and how wide a line may run.
 */
function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const pad = Math.round(width * (portrait ? 0.08 : 0.073));
  return { width, height, portrait, pad, textMax: width - 2 * pad };
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
export const enter = (f: number, from = 0, len = 9) => interpolate(f, [from, from + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
export const leave = (f: number, total: number, len = 8) => interpolate(f, [total - len, total], [1, 0], clamp);

/** Reveal: 30px of travel, ease-out. `from` is the frame within the scene where it starts. */
export function Appear({ from = 0, children, style, travel = 30, length = 22 }: { from?: number; children: ReactNode; style?: CSSProperties; travel?: number; length?: number }) {
  const f = useCurrentFrame();
  const p = interpolate(f, [from, from + length], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * travel}px)`, ...style }}>{children}</div>;
}

/**
 * Words arriving one by one, each from a slight blur: the eye follows the sentence being
 * built instead of reading a block that was already there. `from` is the first word's frame.
 */
export function Words({ children, from = 0, gap = 3, style }: { children: string; from?: number; gap?: number; style: CSSProperties }) {
  const f = useCurrentFrame();
  return (
    <p style={style}>
      {children.split(' ').map((w, i) => {
        const p = interpolate(f, [from + i * gap, from + i * gap + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        return (
          <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 22}px)`, filter: `blur(${(1 - p) * 6}px)`, marginRight: '0.28em' }}>{w}</span>
        );
      })}
    </p>
  );
}

/**
 * What sits behind a dark scene: two soft accent-colored lights drifting slowly, and a thin
 * progress line at the top that fills over the scene. Nothing on it is content; it is there
 * so the frame is never static, which is the difference between a video and a slide.
 */
function Backdrop({ p, total }: { p: Palette; total: number }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = f / 30;
  const x1 = 0.7 + 0.08 * Math.sin(t * 0.35), y1 = 0.25 + 0.1 * Math.cos(t * 0.3);
  const x2 = 0.15 + 0.06 * Math.cos(t * 0.27), y2 = 0.85 + 0.06 * Math.sin(t * 0.22);
  const r = Math.max(width, height);
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(${r * 0.55}px at ${x1 * 100}% ${y1 * 100}%, ${p.accent}2e, transparent 70%), radial-gradient(${r * 0.45}px at ${x2 * 100}% ${y2 * 100}%, ${p.accent}14, transparent 70%)` }} />
      <Progress p={p} total={total} />
    </>
  );
}

function Progress({ p, total }: { p: Palette; total: number }) {
  const f = useCurrentFrame();
  return <div style={{ position: 'absolute', top: 0, left: 0, height: 6, width: `${interpolate(f, [0, total], [0, 100], clamp)}%`, background: p.accent, opacity: 0.9 }} />;
}

function Label({ p, children, dark = true, from = 4, style }: { p: Palette; children: ReactNode; dark?: boolean; from?: number; style?: CSSProperties }) {
  const f = useCurrentFrame();
  return <div style={{ ...text(T.label, { color: dark ? p.accent : p.ink, opacity: dark ? 1 : 0.6 }), opacity: enter(f, from), ...style }}>{children}</div>;
}

/** Big statement on a dark, moving background. */
export function Title({ p, label, phrase, total }: { p: Palette; label?: string; phrase: string; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax, portrait } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'flex-end', opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <Audio src={staticFile('sfx/whoosh-fast.mp3')} volume={0.18} />
      <div style={{ padding: `0 ${pad}px ${portrait ? pad * 2.2 : 150}px`, position: 'relative' }}>
        {label && <Label p={p} from={6} style={{ marginBottom: 22 }}>{label}</Label>}
        <Words from={10} style={text(portrait ? T.displayLg : T.displayXl, { color: p.light, maxWidth: Math.min(1500, textMax) })}>{phrase}</Words>
      </div>
    </AbsoluteFill>
  );
}

/**
 * A full-bleed image with the statement over it: a slow push in, a gradient from the bottom
 * so the words read, and the words arriving one by one. A screenshot or a photo of the
 * real thing, never an illustration of it.
 */
export function Cover({ p, image, label, phrase, total }: { p: Palette; image: string; label?: string; phrase: string; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax, portrait } = useLayout();
  const scale = interpolate(f, [0, total], [1.0, 1.08], clamp);
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'flex-end', opacity: enter(f, 0, 10) * leave(f, total) }}>
      <Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.16} />
      <Img src={staticFile(image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', transform: `scale(${scale})` }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${p.ink}33 0%, ${p.ink}66 45%, ${p.ink}f2 100%)` }} />
      <Progress p={p} total={total} />
      <div style={{ padding: `0 ${pad}px ${portrait ? pad * 2.2 : 130}px`, position: 'relative' }}>
        {label && <Label p={p} from={6} style={{ marginBottom: 22, textShadow: p.shadowText }}>{label}</Label>}
        <Words from={10} style={text(portrait ? T.displayLg : T.displayXl, { color: p.light, maxWidth: Math.min(1500, textMax), textShadow: p.shadowText })}>{phrase}</Words>
      </div>
    </AbsoluteFill>
  );
}

/**
 * A real screenshot with the camera going to the part that matters. `focus` is in
 * fractions of the image. The zoom is a spring and the rest of the screen dims: in a
 * four-second cut nobody reads a whole screen, and showing it whole is what makes a
 * launch video look amateur.
 */
export function Screen({ p, image, focus, zoom = 1.85, label, phrase, total }: { p: Palette; image: string; focus: Focus; zoom?: number; label: string; phrase: string; total: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, textMax, pad } = useLayout();
  const w = portrait ? textMax : 1504, h = Math.round(w / 1.6);
  const k = spring({ frame: f - 16, fps, config: { damping: 22, stiffness: 70, mass: 1 } });
  const cx = focus.x + focus.w / 2, cy = focus.y + focus.h / 2;
  const s = 1 + (zoom - 1) * k;
  const tx = (0.5 - cx) * w * k * 0.9, ty = (0.5 - cy) * h * k * 0.9;
  return (
    <AbsoluteFill style={{ background: p.bg, alignItems: 'center', justifyContent: 'center', opacity: leave(f, total) }}>
      <Audio src={staticFile('sfx/transition-soft.mp3')} volume={0.28} />
      <div style={{ width: w, height: h, borderRadius: 18, overflow: 'hidden', boxShadow: p.shadowCard, opacity: enter(f, 0, 6), transform: `scale(${interpolate(f, [0, 8], [0.975, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })})` }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', transformOrigin: `${cx * 100}% ${cy * 100}%`, transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
          <Img src={staticFile(image)} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }} />
          <div style={{ position: 'absolute', left: `${focus.x * 100}%`, top: `${focus.y * 100}%`, width: `${focus.w * 100}%`, height: `${focus.h * 100}%`, borderRadius: 8, border: `2px solid ${p.accent}`, opacity: k, boxShadow: `0 0 0 4000px rgba(0,0,0,${0.38 * k}), 0 0 24px ${p.accent}` }} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: portrait ? pad * 1.5 : 30, left: pad, right: pad, display: 'flex', justifyContent: 'center', opacity: enter(f, 14) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '15px 30px 15px 24px', borderRadius: 999, background: p.ink, boxShadow: '0 22px 50px -22px rgba(0,0,0,.7)', maxWidth: '100%' }}>
          <span style={{ width: 12, height: 12, borderRadius: 99, background: p.accent, boxShadow: `0 0 14px ${p.accent}`, flex: '0 0 auto' }} />
          <span style={text(T.label, { color: p.accent, fontSize: 17, whiteSpace: 'nowrap' })}>{label}</span>
          <span style={{ width: 1, height: 26, background: p.lightLow, flex: '0 0 auto' }} />
          <span style={text(T.bodySm, { color: p.light, fontSize: 27, fontWeight: 500 })}>{phrase}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Capabilities appearing one by one, with a small click each. */
export function Chips({ p, label, items, total }: { p: Palette; label: string; items: string[]; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'center', padding: `0 ${pad}px`, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <Label p={p} style={{ marginBottom: 40 }}>{label}</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, maxWidth: Math.min(1500, textMax) }}>
        {items.map((it, i) => {
          const d = 10 + i * 11;
          return (
            <div key={it}>
              <Sequence from={d} layout="none"><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.2} /></Sequence>
              <Appear from={d} travel={10} length={12}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '20px 30px', borderRadius: 14, background: p.lightLow, color: p.light, fontFamily: "'Rethink Sans', system-ui, sans-serif", fontSize: 40, fontWeight: 500 }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={p.accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${p.accent})` }}><path d="M4 12.5l5 5L20 6.5" /></svg>
                  {it}
                </span>
              </Appear>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** Up to four numbers with their claim and source. */
export function Numbers({ p, label, items, total }: { p: Palette; label: string; items: { value: string; claim: string; source?: string }[]; total: number }) {
  const f = useCurrentFrame();
  const { pad, portrait } = useLayout();
  const cols = Math.min(portrait ? 2 : 4, Math.max(1, items.length));
  return (
    <AbsoluteFill style={{ background: p.bg, justifyContent: 'center', padding: `0 ${pad}px`, opacity: leave(f, total) }}>
      <Progress p={p} total={total} />
      <Label p={p} dark={false} style={{ marginBottom: 40 }}>{label}</Label>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 28 }}>
        {items.slice(0, 4).map((it, i) => {
          const e = enter(f, 10 + i * 8, 14);
          return (
            <div key={it.value + it.claim} style={{ padding: '38px 34px 40px', background: '#ffffff', borderTop: `6px solid ${p.accent}`, borderRadius: 12, minHeight: 360, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.08)', opacity: e, transform: `translateY(${(1 - e) * 28}px)` }}>
              <p style={text(T.displayXl, { color: p.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: 600 })}>{countUp(it.value, f, 10 + i * 8, 30)}</p>
              <p style={text(T.body, { color: p.ink, marginTop: 18, flex: 1, fontWeight: 500 })}>{it.claim}</p>
              {it.source && <p style={text(T.bodySm, { color: p.ink, opacity: 0.55, marginTop: 20 })}>{it.source}</p>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** What happened: up to six rows, each with its tag, sliding in one by one. */
export function Events({ p, label, items, total }: { p: Palette; label: string; items: { tag: string; text: string; who?: string }[]; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'center', padding: `0 ${pad}px`, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <Label p={p} style={{ marginBottom: 36 }}>{label}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: Math.min(1500, textMax), position: 'relative' }}>
        {items.slice(0, 6).map((it, i) => {
          const d = 8 + i * 10;
          const e = enter(f, d, 12);
          return (
            <div key={it.tag + it.text}>
              <Sequence from={d} layout="none"><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.22} /></Sequence>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 26, padding: '18px 0 18px 22px', borderBottom: `1px solid ${p.lightLow}`, borderLeft: `4px solid ${p.accent}`, opacity: e, transform: `translateX(${(1 - e) * -24}px)` }}>
                <span style={text(T.label, { color: p.accent, fontSize: 18, whiteSpace: 'nowrap', minWidth: 130 })}>{it.tag}</span>
                <span style={text(T.body, { color: p.light, fontSize: 36, fontWeight: 500, flex: 1 })}>{it.text}</span>
                {it.who && <span style={text(T.bodySm, { color: p.lightMid, whiteSpace: 'nowrap' })}>{it.who}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** "1,842" → counts up from zero keeping the thousands separator; "3x" keeps its suffix; anything else is shown as is. */
function countUp(value: string, f: number, from = 8, len = 34): string {
  const m = value.match(/^([^\d]*)([\d][\d,.]*)(.*)$/);
  if (!m) return value;
  const [, pre, num, post] = m;
  const sep = num.includes(',');
  const n = Number(num.replace(/,/g, ''));
  if (!Number.isFinite(n)) return value;
  const k = interpolate(f, [from, from + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cur = Math.round(n * k);
  return `${pre}${sep ? cur.toLocaleString('en-US') : String(cur)}${post}`;
}

/** One number that moved, counted up, with its source. The delta is a chip: accent for up, error red text for down. */
export function Metric({ p, label, value, delta, up, source, total }: { p: Palette; label: string; value: string; delta?: string; up?: boolean; source: string; total: number }) {
  const f = useCurrentFrame();
  const { pad } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.bg, justifyContent: 'center', padding: `0 ${pad}px`, opacity: leave(f, total) }}>
      <Audio src={staticFile('sfx/transition-soft.mp3')} volume={0.2} />
      <Progress p={p} total={total} />
      <Label p={p} dark={false} style={{ marginBottom: 30 }}>{label}</Label>
      <Appear from={6} travel={24}>
        <p style={text(T.displayXl, { color: p.ink, fontSize: 220, lineHeight: 1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' })}>{countUp(value, f)}</p>
      </Appear>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 40, flexWrap: 'wrap' }}>
        {delta && (
          <Appear from={30} travel={10}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderRadius: 999, background: up === false ? '#ffffff' : p.accent, border: up === false ? '1px solid rgba(0,0,0,0.1)' : 'none', ...text(T.title, { color: up === false ? '#da3d28' : p.ink, fontSize: 32 }) }}>
              {up === undefined ? '' : up ? '▲' : '▼'} {delta}
            </span>
          </Appear>
        )}
        <Appear from={38} travel={8}><span style={text(T.bodySm, { color: p.ink, opacity: 0.55 })}>{source}</span></Appear>
      </div>
    </AbsoluteFill>
  );
}

/** A teammate's words arriving one by one, with their name. */
export function Quote({ p, quote, who, total }: { p: Palette; quote: string; who: string; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax, portrait } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'center', padding: `0 ${pad}px`, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <div style={{ position: 'relative' }}>
        <Appear from={2} travel={0}><span style={text(T.displayXl, { color: p.accent, fontSize: 160, lineHeight: 0.6, display: 'block', marginBottom: 30 })}>“</span></Appear>
        <Words from={8} gap={2} style={text(portrait ? T.displayMd : T.displayLg, { color: p.light, maxWidth: Math.min(1500, textMax) })}>{quote}</Words>
        <Appear from={8 + quote.split(' ').length * 2 + 6} travel={10}>
          <p style={text(T.title, { color: p.lightMid, marginTop: 40, fontWeight: 500 })}>— {who}</p>
        </Appear>
      </div>
    </AbsoluteFill>
  );
}

/** What is next: up to five rows with a time and a line. */
export function Agenda({ p, label, items, total }: { p: Palette; label: string; items: { when: string; text: string }[]; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.bg, justifyContent: 'center', padding: `0 ${pad}px`, opacity: leave(f, total) }}>
      <Progress p={p} total={total} />
      <Label p={p} dark={false} style={{ marginBottom: 36 }}>{label}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: Math.min(1400, textMax) }}>
        {items.slice(0, 5).map((it, i) => {
          const d = 8 + i * 9;
          return (
            <Appear key={it.when + it.text} from={d} travel={12} length={12}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 30, padding: '22px 30px', background: '#ffffff', borderRadius: 12, boxShadow: '0 20px 40px -8px rgba(0,0,0,0.06)' }}>
                <span style={text(T.title, { color: p.ink, fontVariantNumeric: 'tabular-nums', minWidth: 120, opacity: 0.7 })}>{it.when}</span>
                <span style={text(T.body, { color: p.ink, fontSize: 36, fontWeight: 500 })}>{it.text}</span>
              </div>
            </Appear>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/**
 * Captions that light up with the voice, the way short-form video does it: the spoken
 * sentence at the bottom, the word being said on an accent chip, what was said in light,
 * what is coming dimmed. Word times come from the voice engine, so they are never guessed.
 */
export function Captions({ p, lines }: { p: Palette; lines: { at: number; words: { w: string; s: number; e: number }[] }[] }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pad, portrait } = useLayout();
  const t = f / fps;
  const line = lines.find((l) => t >= l.at - 0.2 && t <= l.at + (l.words[l.words.length - 1]?.e ?? 0) + 0.6);
  if (!line) return null;
  const idx = line.words.findIndex((w) => t < line.at + w.e);
  const cur = idx === -1 ? line.words.length - 1 : idx;
  // A window of words around the current one, so a long sentence never overflows two lines.
  const span = portrait ? 5 : 8;
  const from = Math.max(0, Math.min(cur - Math.floor(span / 2), line.words.length - span));
  const shown = line.words.slice(from, from + span);
  const alpha = interpolate(t, [line.at - 0.2, line.at], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: pad, right: pad, bottom: portrait ? pad * 1.2 : 44, display: 'flex', justifyContent: 'center', opacity: alpha, pointerEvents: 'none' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 10px', padding: '14px 22px', borderRadius: 16, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', maxWidth: '100%' }}>
        {shown.map((w, i) => {
          const k = from + i;
          const active = k === cur, past = k < cur;
          return (
            <span key={k} style={text(T.title, { color: active ? p.ink : past ? p.light : p.lightMid, fontSize: portrait ? 40 : 36, fontWeight: 600, padding: '4px 10px', borderRadius: 10, background: active ? p.accent : 'transparent', transform: active ? 'scale(1.06)' : 'none', transition: 'none' })}>{w.w}</span>
          );
        })}
      </div>
    </div>
  );
}

/** Brand, URL, CTA on the accent color. Ink text on accent: the accent is never text. */
export function Closing({ p, cta, total, credit }: { p: Palette; cta: string; total: number; credit: boolean }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pad, textMax } = useLayout();
  const pop = spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  return (
    <AbsoluteFill style={{ background: p.accent, alignItems: 'center', justifyContent: 'center', padding: `0 ${pad}px`, opacity: interpolate(f, [0, 8], [0, 1], clamp) * leave(f, total, 12) }}>
      <Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.22} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {p.logo && <Appear from={4}><Img src={staticFile(p.logo)} style={{ height: 120, display: 'block' }} /></Appear>}
        <p style={{ ...text(T.displayLg, { color: p.ink, textAlign: 'center', fontWeight: 600 }), transform: `scale(${0.7 + 0.3 * pop})`, opacity: pop }}>{p.name}</p>
        <Appear from={16}><p style={text(T.headline, { color: p.ink, textAlign: 'center', maxWidth: Math.min(1400, textMax) })}>{cta}</p></Appear>
        <Appear from={24}><p style={text(T.body, { color: p.ink, opacity: 0.75, textAlign: 'center' })}>{p.url}</p></Appear>
      </div>
      {credit && (
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: enter(f, 30) * 0.7 }}>
          <span style={text(T.label, { color: p.ink, fontSize: 16 })}>made with DailyRecap</span>
        </div>
      )}
    </AbsoluteFill>
  );
}
