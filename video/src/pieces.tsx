import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
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
/**
 * The look of the whole video. `tiktok` is the short-form cut: vertical, content kept inside
 * the zone TikTok's interface leaves clear, hook on frame 0, hard cuts, big captions. Set once
 * by Video from `script.style`; every scene reads it through useLayout.
 */
export const Look = createContext<{ tiktok: boolean }>({ tiktok: false });
/** Whether this is the video's first scene. In the short-form cut the first scene is the hook and is whole on frame 0. */
export const SceneInfo = createContext<{ first: boolean }>({ first: false });

export function useLayout() {
  const { width, height } = useVideoConfig();
  const { tiktok } = useContext(Look);
  if (tiktok) {
    // TikTok on 1080×1920 covers the top ~130 px (tabs), the right ~140 px (the action rail)
    // and the bottom ~480 px (handle, caption, sound). Content lives in the box that is left.
    // There are no burned-in captions by default, so nothing else is reserved.
    const pad = Math.round(width * 0.067), padR = Math.round(width * 0.139);
    const top = Math.round(height * 0.13), bottom = Math.round(height * 0.26);
    return { width, height, portrait: true, tiktok, pad, padR, top, bottom, textMax: width - pad - padR,
      frame: `${top}px ${padR}px ${bottom}px ${pad}px`, frameBottom: `0 ${padR}px ${bottom}px ${pad}px` as string | undefined };
  }
  const portrait = height > width;
  const pad = Math.round(width * (portrait ? 0.08 : 0.073));
  // Portrait leaves the right quarter free: that is where a feed puts its rail of actions.
  return { width, height, portrait, tiktok, pad, padR: pad, top: 0, bottom: 0, textMax: portrait ? Math.round(width * 0.72) - pad : width - 2 * pad,
    frame: `0 ${pad}px`, frameBottom: undefined as string | undefined };
}


/** The line under a number: where it comes from, and whether DailyRecap could open that source. */
export function sourceLine(source: string, verified?: boolean) {
  return verified === true ? `✓ verified · ${source}` : verified === false ? `reported, not verified · ${source}` : source;
}

/**
 * Short-form: whether DailyRecap could open the source is the point of the product, so it is
 * a chip, not a footnote. Verified: accent background, ink text (the accent is never text).
 * Reported: an outline, dimmer. Undefined: no chip.
 */
export function Mark({ p, verified, dark = true, size = 24 }: { p: Palette; verified?: boolean; dark?: boolean; size?: number }) {
  if (verified === undefined) return null;
  const on = verified === true;
  const fg = dark ? p.light : p.ink;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: `${Math.round(size * 0.28)}px ${Math.round(size * 0.6)}px`, borderRadius: 999, whiteSpace: 'nowrap', flex: '0 0 auto',
      background: on ? p.accent : 'transparent', border: on ? 'none' : `2px solid ${dark ? 'rgba(253,255,252,0.35)' : 'rgba(0,0,0,0.25)'}`,
      ...text(T.label, { fontSize: size * 0.78, letterSpacing: '0.08em', color: on ? p.ink : fg, opacity: on ? 1 : 0.8 }) }}>
      {on ? '✓ verified' : 'reported'}
    </span>
  );
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
export const enter = (f: number, from = 0, len = 9) => interpolate(f, [from, from + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
export const leave = (f: number, total: number, len = 8) => interpolate(f, [total - len, total], [1, 0], clamp);

/** Reveal: 30px of travel, ease-out. `from` is the frame within the scene where it starts. */
export function Appear({ from = 0, children, style, travel = 30, length = 22 }: { from?: number; children: ReactNode; style?: CSSProperties; travel?: number; length?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Short-form: a spring with a small overshoot. It reads as physical; a curve reads as a slide.
  const p = useLayout().tiktok ? pop(f, from, fps) : interpolate(f, [from, from + length], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <div style={{ opacity: Math.min(1, p), transform: `translateY(${(1 - p) * travel}px)`, ...style }}>{children}</div>;
}

/** The short-form entrance: 0 → 1 with a small overshoot, settled in about a third of a second. */
export const pop = (f: number, from: number, fps: number) => spring({ frame: f - from, fps, config: { damping: 13, stiffness: 190, mass: 0.8 } });

/**
 * Words arriving one by one, each from a slight blur: the eye follows the sentence being
 * built instead of reading a block that was already there. `from` is the first word's frame.
 */
export function Words({ children, from = 0, gap = 3, style }: { children: string; from?: number; gap?: number; style: CSSProperties }) {
  const f = useCurrentFrame();
  const { tiktok } = useLayout();
  if (tiktok) {
    // Short-form: each word rises from behind an invisible edge, the way title sequences do it.
    // Faster than the blur and sharper on a phone; nothing is ever half-transparent.
    return (
      <p style={style}>
        {children.split(' ').map((w, i) => {
          const k = interpolate(f, [from + i * 2, from + i * 2 + 10], [0, 1], { ...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1) });
          return (
            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em', marginBottom: '-0.08em', marginRight: '0.26em' }}>
              <span style={{ display: 'inline-block', transform: `translateY(${(1 - k) * 110}%)` }}>{w}</span>
            </span>
          );
        })}
      </p>
    );
  }
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
export function Backdrop({ p, total, dark = true }: { p: Palette; total: number; dark?: boolean }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = f / 30;
  const x1 = 0.7 + 0.08 * Math.sin(t * 0.35), y1 = 0.25 + 0.1 * Math.cos(t * 0.3);
  const x2 = 0.15 + 0.06 * Math.cos(t * 0.27), y2 = 0.85 + 0.06 * Math.sin(t * 0.22);
  const r = Math.max(width, height);
  const breathe = 1 + 0.04 * Math.sin(t * 0.5);
  return (
    <>
      {/* Two accent-tinted glows, breathing slowly. Never a full-screen linear gradient: it bands under H.264. */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(${r * 0.55 * breathe}px at ${x1 * 100}% ${y1 * 100}%, ${p.accent}${dark ? '30' : '55'}, transparent 70%), radial-gradient(${r * 0.45}px at ${x2 * 100}% ${y2 * 100}%, ${p.accent}${dark ? '16' : '33'}, transparent 70%)` }} />
      {/* Ghost text: the company name, huge, at 4%, drifting. Depth without content. */}
      <div style={{ position: 'absolute', left: -width * 0.05, bottom: -height * 0.12, ...text(T.displayXl, { fontSize: height * 0.42, fontWeight: 700, letterSpacing: '-0.05em', color: dark ? p.light : p.ink, opacity: 0.045, whiteSpace: 'nowrap', lineHeight: 1 }), transform: `translateX(${-t * 6}px)` }}>{p.name}</div>
      {/* Hairline at the edge, 2px in video scale. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: p.accent, opacity: 0.35 }} />
      {/* Film grain, tiled at 200%, so the flat color never reads as "nothing loaded". */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${staticFile('fx/grain.png')})`, backgroundSize: '512px 512px', opacity: dark ? 0.13 : 0.07, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
      {!useLayout().tiktok && <Progress p={p} total={total} />}
    </>
  );
}

function Progress({ p, total }: { p: Palette; total: number }) {
  const f = useCurrentFrame();
  return <div style={{ position: 'absolute', top: 0, left: 0, height: 6, width: `${interpolate(f, [0, total], [0, 100], clamp)}%`, background: p.accent, opacity: 0.9 }} />;
}

export function Label({ p, children, dark = true, from = 4, style }: { p: Palette; children: ReactNode; dark?: boolean; from?: number; style?: CSSProperties }) {
  const f = useCurrentFrame();
  // Short-form: the label is part of the hook, on screen from the first frame.
  if (useLayout().tiktok) from = Math.min(from, -9);
  return <div style={{ ...text(T.label, { color: dark ? p.accent : p.ink, opacity: dark ? 1 : 0.6 }), opacity: enter(f, from), ...style }}>{children}</div>;
}

/** Big statement on a dark, moving background. */
export function Title({ p, label, phrase, total }: { p: Palette; label?: string; phrase: string; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax, portrait, height } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'flex-end', opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <Audio src={staticFile('sfx/whoosh-fast.mp3')} volume={0.18} />
      <div style={{ padding: useLayout().frameBottom ?? `0 ${pad}px ${portrait ? Math.round(height * 0.36) : 150}px`, position: 'relative' }}>
        {label && <Label p={p} from={useLayout().tiktok ? -9 : 6} style={{ marginBottom: 22 }}>{label}</Label>}
        <Words from={useLayout().tiktok ? (useContext(SceneInfo).first ? -40 : 0) : 10} style={text(portrait ? T.displayLg : T.displayXl, { color: p.light, maxWidth: Math.min(1500, textMax), ...(useLayout().tiktok ? { fontSize: fit(phrase.length), fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.03em' } : {}) })}>{phrase}</Words>
      </div>
    </AbsoluteFill>
  );
}

/** Headline size for a line of `n` characters in the short-form content box (858 px wide). */
export const fit = (n: number) => (n <= 18 ? 160 : n <= 30 ? 136 : n <= 48 ? 112 : n <= 70 ? 92 : 76);

/**
 * A full-bleed image with the statement over it: a slow push in, a gradient from the bottom
 * so the words read, and the words arriving one by one. A screenshot or a photo of the
 * real thing, never an illustration of it.
 */
export function Cover({ p, image, label, phrase, total }: { p: Palette; image: string; label?: string; phrase: string; total: number }) {
  const f = useCurrentFrame();
  const { pad, padR, top, textMax, portrait, height, width, tiktok } = useLayout();
  const scale = interpolate(f, [0, total], [1.0, 1.08], clamp);
  if (tiktok) {
    // Short-form: a landscape screenshot does not fill a vertical frame without its own text
    // colliding with ours. Show it whole, as a card at the top, and the headline under it.
    const w = width - pad - padR;
    return (
      <AbsoluteFill style={{ background: p.ink, opacity: leave(f, total) }}>
        <Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.16} />
        <Backdrop p={p} total={total} />
        <div style={{ position: 'absolute', left: pad, top, width: w, borderRadius: 18, overflow: 'hidden', boxShadow: p.shadowCard, transform: `scale(${1 + 0.03 * interpolate(f, [0, total], [0, 1], clamp)})`, transformOrigin: 'top center' }}>
          <Img src={staticFile(image)} style={{ display: 'block', width: '100%', height: 'auto' }} />
        </div>
        <div style={{ position: 'absolute', left: pad, right: padR, top: top + Math.round(w * 0.625) + 56 }}>
          {label && <Label p={p} style={{ marginBottom: 18 }}>{label}</Label>}
          <p style={text(T.displayLg, { color: p.light, maxWidth: textMax, fontSize: 64, lineHeight: 1.08 })}>{phrase}</p>
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'flex-end', opacity: enter(f, 0, 10) * leave(f, total) }}>
      <Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.16} />
      <Img src={staticFile(image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', transform: `scale(${scale})` }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${p.ink}33 0%, ${p.ink}66 45%, ${p.ink}f2 100%)` }} />
      <Progress p={p} total={total} />
      <div style={{ padding: useLayout().frameBottom ?? `0 ${pad}px ${portrait ? Math.round(height * 0.36) : 130}px`, position: 'relative' }}>
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
      <Backdrop p={p} total={total} dark={false} />
      {/* Never a flat image: a little perspective, a slow push in, a deep shadow. */}
      <div style={{ width: w, height: h, borderRadius: 18, overflow: 'hidden', boxShadow: '0 60px 120px -40px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.08)', opacity: enter(f, 0, 8), transform: `perspective(1600px) rotateY(${-6 + 6 * interpolate(f, [0, total], [0, 1], clamp)}deg) scale(${interpolate(f, [0, total], [0.98, 1.03], clamp)})` }}>
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
  const { fps } = useVideoConfig();
  const { pad, textMax, tiktok } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'center', padding: useLayout().frame, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <Label p={p} style={{ marginBottom: 40 }}>{label}</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, maxWidth: Math.min(1500, textMax) }}>
        {items.map((it, i) => {
          const d = 10 + i * 11;
          return (
            <div key={it}>
              <Sequence from={d} layout="none"><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.2} /></Sequence>
              <Appear from={d} travel={10} length={12} style={tiktok ? { transform: `scale(${0.6 + 0.4 * pop(f, d, fps)})`, transformOrigin: 'left center' } : undefined}>
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
    <AbsoluteFill style={{ background: p.bg, justifyContent: 'center', padding: useLayout().frame, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} dark={false} />
      <Label p={p} dark={false} style={{ marginBottom: 40 }}>{label}</Label>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 28, position: 'relative' }}>
        {items.slice(0, 4).map((it, i) => {
          const e = enter(f, 10 + i * 8, 14);
          return (
            <div key={it.value + it.claim} style={{ padding: '38px 34px 40px', background: '#ffffff', borderTop: `6px solid ${p.accent}`, borderRadius: 12, minHeight: 360, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.08)', opacity: e, transform: `translateY(${(1 - e) * 28}px)` }}>
              <p style={text(T.displayXl, { color: p.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: 600 })}>{useLayout().tiktok ? it.value : countUp(it.value, f, 10 + i * 8, 30)}</p>
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
export function Events({ p, label, items, total }: { p: Palette; label: string; items: { tag: string; text: string; who?: string; verified?: boolean }[]; total: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pad, textMax, tiktok } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'center', padding: useLayout().frame, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <Label p={p} style={{ marginBottom: 36, position: 'relative' }}>{label}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: Math.min(1500, textMax), position: 'relative' }}>
        {items.slice(0, 6).map((it, i) => {
          const d = 6 + i * 6;
          const e = enter(f, d, 14);
          if (tiktok) {
            const k = pop(f, d, fps);
            return (
              <div key={it.tag + it.text}>
                <Sequence from={d} layout="none"><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.22} /></Sequence>
                {it.verified === true && <Sequence from={d + 5} layout="none"><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.16} /></Sequence>}
                <div style={{ padding: '16px 0 16px 22px', borderBottom: `1px solid ${p.lightLow}`, borderLeft: `4px solid ${p.accent}`, opacity: Math.min(1, k), transform: `translateX(${(1 - k) * -40}px)` }}>
                  <span style={text(T.body, { color: p.light, fontSize: 44, fontWeight: 500, lineHeight: 1.2 })}>{it.text}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                    <Mark p={p} verified={it.verified} size={26} />
                    <span style={text(T.bodySm, { color: p.lightMid, fontSize: 26 })}>{[it.tag, it.who].filter(Boolean).join(' · ')}</span>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={it.tag + it.text}>
              <Sequence from={d} layout="none"><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.22} /></Sequence>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 26, padding: '18px 0 18px 22px', borderBottom: `1px solid ${p.lightLow}`, borderLeft: `4px solid ${p.accent}`, opacity: e, transform: `translateX(${(1 - e) * -24}px)` }}>
                <span style={text(T.label, { color: p.accent, fontSize: 18, whiteSpace: 'nowrap', minWidth: 130 })}>{it.tag}</span>
                <span style={text(T.body, { color: p.light, fontSize: 36, fontWeight: 500, flex: 1 })}>{it.text}</span>
                {(it.who || it.verified !== undefined) && <span style={text(T.bodySm, { color: p.lightMid, whiteSpace: 'nowrap' })}>{it.verified === true ? '✓ ' : ''}{it.who}{it.verified === false ? ' · reported' : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** "1,842" → counts up from zero keeping the thousands separator; "3x" keeps its suffix; anything else is shown as is. */
export function countUp(value: string, f: number, from = 8, len = 34): string {
  const m = value.match(/^([^\d]*)([\d][\d,.]*)(.*)$/);
  if (!m) return value;
  const [, pre, num, post] = m;
  const sep = num.includes(',');
  const n = Number(num.replace(/,/g, ''));
  if (!Number.isFinite(n)) return value;
  // From half the value, not from zero: a count from 0 reads as a loading bar; from 50% it reads as arrival.
  const k = interpolate(f, [from, from + len], [0.5, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cur = Math.round(n * k);
  return `${pre}${sep ? cur.toLocaleString('en-US') : String(cur)}${post}`;
}

/** One number that moved, counted up, with its source. The delta is a chip: accent for up, error red text for down. */
export function Metric({ p, label, value, delta, up, source, verified, total }: { p: Palette; label: string; value: string; delta?: string; up?: boolean; source: string; verified?: boolean; total: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pad, tiktok, textMax } = useLayout();
  // Short-form: the number lands in a third of a second and never runs past the safe zone.
  const t0 = tiktok ? 0 : 6, t1 = tiktok ? 10 : 51, cLen = tiktok ? 16 : 45, dAt = tiktok ? 12 : 54, sAt = tiktok ? 16 : 62;
  const heroSize = tiktok ? Math.min(330, Math.floor(textMax / (Math.max(3, value.length) * 0.62))) : 240;
  return (
    <AbsoluteFill style={{ background: p.bg, justifyContent: 'center', padding: useLayout().frame, opacity: leave(f, total) }}>
      <Audio src={staticFile('sfx/transition-soft.mp3')} volume={0.2} />
      <Backdrop p={p} total={total} dark={false} />
      <Label p={p} dark={false} style={{ marginBottom: 30, fontSize: 30, position: 'relative' }}>{label}</Label>
      <Appear from={tiktok ? -20 : 6} travel={24} style={{ position: 'relative' }}>
        <p style={{ ...text(T.displayXl, { color: p.ink, fontSize: heroSize, lineHeight: 1, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }), transform: `scale(${0.5 + 0.5 * (tiktok ? pop(f, t0, fps) : interpolate(f, [t0, t1], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }))})`, transformOrigin: 'left center' }}>{tiktok ? value : countUp(value, f, t0, cLen)}</p>
      </Appear>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 40, flexWrap: 'wrap', position: 'relative' }}>
        {delta && (
          <Appear from={dAt} travel={10}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderRadius: 999, background: up === false ? '#ffffff' : p.accent, border: up === false ? '1px solid rgba(0,0,0,0.1)' : 'none', ...text(T.title, { color: up === false ? '#da3d28' : p.ink, fontSize: 32 }) }}>
              {up === undefined ? '' : up ? '▲' : '▼'} {delta}
            </span>
          </Appear>
        )}
        <Appear from={sAt} travel={8}>
          {tiktok
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}><Mark p={p} verified={verified} dark={false} /><span style={text(T.bodySm, { color: p.ink, opacity: 0.6 })}>{source}</span></span>
            : <span style={text(T.bodySm, { color: p.ink, opacity: 0.55 })}>{sourceLine(source, verified)}</span>}
        </Appear>
      </div>
    </AbsoluteFill>
  );
}

/** A teammate's words arriving one by one, with their name. */
export function Quote({ p, quote, who, total }: { p: Palette; quote: string; who: string; total: number }) {
  const f = useCurrentFrame();
  const { pad, textMax, portrait } = useLayout();
  return (
    <AbsoluteFill style={{ background: p.ink, justifyContent: 'center', padding: useLayout().frame, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} />
      <div style={{ position: 'relative' }}>
        <Appear from={2} travel={0}><span style={text(T.displayXl, { color: p.accent, fontSize: 160, lineHeight: 0.6, display: 'block', marginBottom: 30 })}>“</span></Appear>
        <Words from={8} gap={2} style={text(portrait ? T.displayMd : T.displayLg, { color: p.light, maxWidth: Math.min(1500, textMax), ...(useLayout().tiktok ? { fontSize: Math.min(96, fit(quote.length)), fontWeight: 600, lineHeight: 1.08 } : {}) })}>{quote}</Words>
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
    <AbsoluteFill style={{ background: p.bg, justifyContent: 'center', padding: useLayout().frame, opacity: leave(f, total) }}>
      <Backdrop p={p} total={total} dark={false} />
      <Label p={p} dark={false} style={{ marginBottom: 36, position: 'relative' }}>{label}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: Math.min(1400, textMax), position: 'relative' }}>
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
  const { pad, padR, portrait, height, tiktok } = useLayout();
  const t = f / fps;
  const line = lines.find((l) => t >= l.at - 0.2 && t <= l.at + (l.words[l.words.length - 1]?.e ?? 0) + 0.4);
  if (!line) return null;
  // Groups of 2–4 words, cut at a silence of 0.18 s or at punctuation: how short-form captions read.
  const groups: { w: string; s: number; e: number }[][] = [];
  for (const w of line.words) {
    const g = groups[groups.length - 1];
    const prev = g?.[g.length - 1];
    if (!g || g.length >= (tiktok ? 3 : 4) || (prev && (w.s - prev.e > 0.18 || /[.?!,;:]$/.test(prev.w)))) groups.push([w]);
    else g.push(w);
  }
  const group = groups.find((g) => t < line.at + g[g.length - 1].e + 0.12) ?? groups[groups.length - 1];
  const cur = group.findIndex((w) => t < line.at + w.e);
  const alpha = interpolate(t, [line.at + group[0].s - 0.12, line.at + group[0].s], [0, 1], clamp);
  const size = portrait ? 66 : 44;
  if (tiktok) {
    // The short-form caption: 1–3 words, all caps, white with an ink outline, the spoken word
    // on an accent pill (the accent is a background, never text). Centered at ~66% height.
    const ring = [[-5,0],[5,0],[0,-5],[0,5],[-4,-4],[4,4],[-4,4],[4,-4]].map(([x, y]) => `${x}px ${y}px 0 ${p.ink}`).join(', ');
    return (
      <div style={{ position: 'absolute', left: pad, right: padR, top: Math.round(height * 0.625), height: Math.round(height * 0.085), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: alpha, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 14px' }}>
          {group.map((w, i) => {
            const active = i === cur || (cur === -1 && i === group.length - 1);
            return <span key={i} style={text(T.title, { fontSize: 88, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'uppercase', color: active ? p.ink : '#ffffff', background: active ? p.accent : 'transparent', padding: active ? '2px 14px' : '2px 0', borderRadius: 14, textShadow: active ? 'none' : ring, transform: active ? 'scale(1.04)' : 'none' })}>{w.w.replace(/[.,;:]$/, '')}</span>;
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', left: pad, right: pad, bottom: portrait ? Math.round(height * 0.27) : 48, display: 'flex', justifyContent: 'center', opacity: alpha, pointerEvents: 'none' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 12px', padding: '10px 18px', borderRadius: 18, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(8px)', maxWidth: '100%' }}>
        {group.map((w, i) => {
          const active = i === cur || (cur === -1 && i === group.length - 1), past = cur !== -1 && i < cur;
          return (
            <span key={i} style={text(T.title, { color: active ? p.ink : past ? p.light : p.lightMid, fontSize: size, fontWeight: 700, letterSpacing: '-0.02em', padding: '4px 14px', borderRadius: 12, background: active ? p.accent : 'transparent', transform: active ? 'scale(1.05)' : 'none', textShadow: active ? 'none' : '0 2px 8px rgba(0,0,0,.5)' })}>{w.w}</span>
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
  const { pad, textMax, tiktok } = useLayout();
  const k = spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  return (
    <AbsoluteFill style={{ background: p.accent, alignItems: 'center', justifyContent: 'center', padding: useLayout().frame, opacity: interpolate(f, [0, 8], [0, 1], clamp) * leave(f, total, 12) }}>
      <Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.22} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {p.logo && <Appear from={4}><Img src={staticFile(p.logo)} style={{ height: 120, display: 'block' }} /></Appear>}
        <p style={{ ...text(T.displayLg, { color: p.ink, textAlign: 'center', fontWeight: 600 }), transform: `scale(${0.7 + 0.3 * k})`, opacity: k }}>{p.name}</p>
        <Appear from={16}><p style={text(T.headline, { color: p.ink, textAlign: 'center', maxWidth: Math.min(1400, textMax) })}>{cta}</p></Appear>
        {tiktok && p.url ? (
          <div style={{ marginTop: 10, padding: '20px 38px', borderRadius: 999, background: p.ink, transform: `scale(${pop(f, 22, fps)})`, boxShadow: '0 30px 60px -30px rgba(0,0,0,.5)' }}>
            <p style={text(T.title, { color: p.light, fontSize: 40, whiteSpace: 'nowrap' })}>{p.url.slice(0, Math.max(0, Math.min(p.url.length, Math.floor((f - 26) * 1.6))))}</p>
          </div>
        ) : (
          <Appear from={24}><p style={text(T.body, { color: p.ink, opacity: 0.75, textAlign: 'center' })}>{p.url}</p></Appear>
        )}
      </div>
      {credit && (
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: enter(f, 30) * 0.7 }}>
          <span style={text(T.label, { color: p.ink, fontSize: 16 })}>made with DailyRecap</span>
        </div>
      )}
    </AbsoluteFill>
  );
}
