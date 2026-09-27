import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fonts } from './pieces';
import { FONT } from './style';

/**
 * The promo: 35 seconds of motion graphics, music and sound effects, no voice. It is not a
 * recap and takes no script: it sells DailyRecap and ends on its URL. The cuts land on the
 * bars of the music bed (122 BPM, one bar ≈ 59 frames), which is generated, not committed:
 *   node scripts/music.mjs 37 public/audio/music-promo.mp3
 *   npx remotion render src/index.ts Promo out/promo.mp4 --scale=2 --crf=14
 */
export const PROMO_FRAMES = 1050;
export const URL = 'aiworthusing.com/agent-index/dailyrecap';

export const C = { accent: '#a0e099', ink: '#20291f', bg: '#f8faf7', light: '#fdfffc', mid: '#647063', line: '#dde5dc', blue: '#2f7bf6', ok: '#2c5227' };
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const t = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: ease });
export const type = (size: number, weight = 500, extra?: CSSProperties): CSSProperties => ({ fontFamily: FONT, fontSize: size, fontWeight: weight, letterSpacing: size > 60 ? '-0.035em' : '-0.01em', lineHeight: 1.02, margin: 0, ...extra });

/** Scene boundaries, in frames. */
const S = { logo: 0, question: 90, phone: 240, sources: 420, recap: 600, words: 800, end: 900 };

export function Promo() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />
      <Audio src={staticFile('audio/music-promo.mp3')} volume={(f) => interpolate(f, [0, 20, PROMO_FRAMES - 60, PROMO_FRAMES], [0, 0.9, 0.9, 0], clamp)} />
      <Sequence durationInFrames={S.question}><Logo /></Sequence>
      <Sequence from={S.question} durationInFrames={S.phone - S.question}><Question /></Sequence>
      <Sequence from={S.phone} durationInFrames={S.sources - S.phone}><Phone /></Sequence>
      <Sequence from={S.sources} durationInFrames={S.recap - S.sources}><Sources /></Sequence>
      <Sequence from={S.recap} durationInFrames={S.words - S.recap}><Recap /></Sequence>
      <Sequence from={S.words} durationInFrames={S.end - S.words}><Words /></Sequence>
      <Sequence from={S.end}><End /></Sequence>
      {[S.question, S.phone, S.sources, S.recap, S.end].map((at) => <Wipe key={at} at={at} />)}
      {[S.question, S.phone, S.sources, S.recap, S.end].map((at) => (
        <Sequence key={`w${at}`} from={at - 8} durationInFrames={30}><Audio src={staticFile('sfx/whoosh-fast.mp3')} volume={0.35} /></Sequence>
      ))}
      <Grain />
    </AbsoluteFill>
  );
}

/** A green band that sweeps across on every cut: the brand's one gesture. */
export function Wipe({ at }: { at: number }) {
  const f = useCurrentFrame() - at;
  if (f < -10 || f > 10) return null;
  const x = interpolate(f, [-10, 10], [-120, 120], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -200, bottom: -200, left: '50%', width: '70%', marginLeft: '-35%', background: C.accent, transform: `translateX(${x}%) skewX(-12deg)` }} />
    </AbsoluteFill>
  );
}

export function Grain() {
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile('fx/grain.png')})`, opacity: 0.05, mixBlendMode: 'overlay', pointerEvents: 'none' }} />;
}

/** The mark: the day is a line that ends in its period. */
export function Mark({ size, color, bar = 1, dot = 1 }: { size: number; color: string; bar?: number; dot?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      <rect x="1" y="10" width={12 * bar} height="4" rx="2" fill={color} />
      <circle cx="18" cy="12" r={5 * dot} fill={color} />
    </svg>
  );
}

// ── 1 · Logo ─────────────────────────────────────────────────────────────────────────────
function Logo() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = t(f, 4, 22);
  const dot = spring({ frame: f - 20, fps, config: { damping: 9, stiffness: 180 } });
  const word = t(f, 30, 48);
  const out = t(f, 74, 90);
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Sequence from={18} durationInFrames={40}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.45} /></Sequence>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, transform: `scale(${1 + 0.06 * t(f, 20, 90)}) translateY(${-40 * out}px)`, opacity: 1 - out }}>
        <Mark size={200} color={C.accent} bar={bar} dot={dot} />
        <div style={{ overflow: 'hidden' }}>
          <p style={type(150, 600, { color: C.light, transform: `translateY(${(1 - word) * 110}%)` })}>DailyRecap</p>
        </div>
      </div>
      <p style={type(34, 500, { position: 'absolute', bottom: 150, color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 44, 58) * (1 - out) })}>Your startup's first chief of staff</p>
    </AbsoluteFill>
  );
}

// ── 2 · The question ─────────────────────────────────────────────────────────────────────
function Line({ f, at, children, style }: { f: number; at: number; children: ReactNode; style?: CSSProperties }) {
  const k = t(f, at, at + 14);
  return (
    <div style={{ overflow: 'hidden', paddingBottom: 8 }}>
      <p style={{ ...type(96, 500, { color: C.ink }), transform: `translateY(${(1 - k) * 105}%)`, ...style }}>{children}</p>
    </div>
  );
}
export function Question() {
  const f = useCurrentFrame();
  const big = f >= 72;
  const k = t(f, 72, 90);
  const hl = t(f, 92, 112);
  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: 'center', padding: '0 160px' }}>
      {!big ? (
        <div>
          <Line f={f} at={4}>Every evening,</Line>
          <Line f={f} at={20}>every founder asks</Line>
          <Line f={f} at={36} style={{ color: C.mid }}>the same question.</Line>
        </div>
      ) : (
        <div style={{ transform: `scale(${1.25 - 0.25 * k})`, transformOrigin: 'left center', opacity: k }}>
          <p style={type(210, 600, { color: C.ink })}>What happened</p>
          <p style={type(210, 600, { color: C.ink, position: 'relative', display: 'inline-block', marginTop: 10 })}>
            <span style={{ position: 'absolute', left: -16, right: -16, top: 18, bottom: -6, background: C.accent, borderRadius: 18, transform: `scaleX(${hl})`, transformOrigin: 'left' }} />
            <span style={{ position: 'relative' }}>today?</span>
          </p>
        </div>
      )}
      {big && <Sequence from={72} durationInFrames={30}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.3} /></Sequence>}
    </AbsoluteFill>
  );
}

// ── 3 · One text ─────────────────────────────────────────────────────────────────────────
export function Bubble({ f, at, out, children }: { f: number; at: number; out?: boolean; children: ReactNode }) {
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 200 } });
  if (f < at) return null;
  return (
    <div style={{ alignSelf: out ? 'flex-end' : 'flex-start', maxWidth: '84%', padding: '18px 24px', borderRadius: 28, fontFamily: FONT, fontSize: 28, lineHeight: 1.3, background: out ? C.blue : '#e9ece9', color: out ? '#fff' : C.ink, borderBottomRightRadius: out ? 8 : 28, borderBottomLeftRadius: out ? 28 : 8, transform: `scale(${s})`, transformOrigin: out ? 'bottom right' : 'bottom left' }}>
      {children}
    </div>
  );
}
export function Typed({ f, at, text: s, speed = 1.6 }: { f: number; at: number; text: string; speed?: number }) {
  const n = Math.max(0, Math.min(s.length, Math.floor((f - at) * speed)));
  return <>{s.slice(0, n)}{n < s.length && <span style={{ opacity: 0.6 }}>|</span>}</>;
}
export function Phone({ site = 'acme.com' }: { site?: string } = {}) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  const install = 'Set this up for me: ' + URL;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {[16, 70, 118].map((at) => <Sequence key={at} from={at} durationInFrames={20}><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.5} /></Sequence>)}
      <div style={{ position: 'absolute', left: 150, top: 330, width: 640 }}>
        <p style={type(30, 600, { color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 6, 20) })}>Step one</p>
        <div style={{ overflow: 'hidden', marginTop: 24 }}>
          <p style={type(110, 600, { color: C.light, transform: `translateY(${(1 - t(f, 8, 24)) * 105}%)` })}>One text</p>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <p style={type(110, 600, { color: C.light, transform: `translateY(${(1 - t(f, 16, 32)) * 105}%)` })}>to install.</p>
        </div>
        <p style={type(40, 400, { color: 'rgba(253,255,252,.7)', marginTop: 36, lineHeight: 1.3, opacity: t(f, 90, 110) })}>It asks for one thing:<br />your website.</p>
      </div>
      <div style={{ position: 'absolute', right: 200, top: 90, width: 560, height: 1000, borderRadius: 72, background: '#0f140f', padding: 16, boxShadow: '0 60px 120px -40px rgba(0,0,0,.8), 0 0 0 2px rgba(253,255,252,.08)', transform: `translateY(${(1 - rise) * 500}px) rotate(${(1 - rise) * 6}deg)` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 58, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '56px 28px 20px', borderBottom: '1px solid #e6ece5', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: C.accent, display: 'grid', placeItems: 'center' }}><Mark size={38} color={C.ink} /></div>
            <div>
              <p style={type(28, 600, { color: C.ink })}>DailyRecap</p>
              <p style={type(20, 400, { color: C.mid, marginTop: 4 })}>iMessage</p>
            </div>
          </div>
          <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'flex-end', paddingBottom: 40 }}>
            <Bubble f={f} at={16} out><Typed f={f} at={16} text={install} /></Bubble>
            <Bubble f={f} at={70}>Hi! I'm DailyRecap, your chief of staff. What's your company's website?</Bubble>
            <Bubble f={f} at={118} out>{site}</Bubble>
            <Bubble f={f} at={150}>On it. Your first video, in 15 minutes.</Bubble>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── 4 · Sources ──────────────────────────────────────────────────────────────────────────
const NODES = [
  { label: 'GitHub', x: 330, y: 300 },
  { label: 'Your team', x: 300, y: 620 },
  { label: 'Odoo', x: 560, y: 880 },
  { label: 'Your agents', x: 1590, y: 290 },
  { label: 'A KPI sheet', x: 1620, y: 610 },
  { label: 'Your website', x: 1360, y: 880 },
];
const CX = 960, CY = 560;
export function Sources() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const core = spring({ frame: f - 4, fps, config: { damping: 12, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <p style={type(30, 600, { position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 4, 18) })}>Every weekday at 6 pm</p>
      <p style={type(76, 600, { position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', color: C.light, opacity: t(f, 8, 24), transform: `translateY(${(1 - t(f, 8, 24)) * 30}px)` })}>It asks people and agents.</p>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {NODES.map((n, i) => {
          const at = 14 + i * 7;
          const len = Math.hypot(n.x - CX, n.y - CY);
          const draw = t(f, at, at + 22);
          const cycle = ((f - at - 22) % 40) / 40;
          const live = f > at + 22;
          return (
            <g key={n.label}>
              <line x1={n.x} y1={n.y} x2={CX} y2={CY} stroke="rgba(160,224,153,.45)" strokeWidth={3} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
              {live && <circle cx={n.x + (CX - n.x) * cycle} cy={n.y + (CY - n.y) * cycle} r={9} fill={C.accent} opacity={1 - cycle * 0.6} />}
            </g>
          );
        })}
      </svg>
      {NODES.map((n, i) => {
        const s = spring({ frame: f - (10 + i * 7), fps, config: { damping: 13, stiffness: 160 } });
        const checked = f > 120 + i * 6;
        return (
          <div key={n.label} style={{ position: 'absolute', left: n.x, top: n.y, transform: `translate(-50%,-50%) scale(${s})`, display: 'flex', alignItems: 'center', gap: 14, padding: '20px 30px', borderRadius: 999, background: checked ? C.accent : '#2c3a2b', color: checked ? C.ink : C.light, ...type(34, 600), boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)' }}>
            {checked && <span>✓</span>}{n.label}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: CX, top: CY, width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: 999, background: C.accent, display: 'grid', placeItems: 'center', transform: `scale(${core * (1 + 0.04 * Math.sin(f / 6))})`, boxShadow: `0 0 0 ${18 + 10 * Math.sin(f / 8)}px rgba(160,224,153,.14)` }}>
        <Mark size={110} color={C.ink} />
      </div>
      <p style={type(44, 500, { position: 'absolute', left: 0, right: 0, bottom: 60, textAlign: 'center', color: 'rgba(253,255,252,.75)', opacity: t(f, 110, 126) })}>Then it opens every source it can.</p>
      {[120, 126, 132, 138, 144, 150].map((at) => <Sequence key={at} from={at} durationInFrames={14}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.22} /></Sequence>)}
    </AbsoluteFill>
  );
}

// ── 5 · The recap ────────────────────────────────────────────────────────────────────────
const ROWS = [
  { ok: true, src: 'GitHub', text: '14 commits shipped, 2 releases' },
  { ok: true, src: 'Odoo', text: '38 orders, $12.4k invoiced' },
  { ok: false, src: 'Theo, CTO assistant', text: 'CI fixed on main' },
];
function Recap() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: f, fps, config: { damping: 16, stiffness: 110 } });
  const n = Math.round(interpolate(f, [14, 60], [0, 301], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const bars = [0.42, 0.55, 0.5, 0.68, 0.74, 0.9];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position: 'absolute', left: 150, top: 300, width: 760 }}>
        <p style={type(30, 600, { color: C.ok, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 4, 18) })}>The video of your day</p>
        <div style={{ overflow: 'hidden', marginTop: 24 }}>
          <p style={type(100, 600, { color: C.ink, transform: `translateY(${(1 - t(f, 8, 24)) * 105}%)` })}>30 seconds,</p>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <p style={type(100, 600, { color: C.ink, transform: `translateY(${(1 - t(f, 16, 32)) * 105}%)` })}>on your phone.</p>
        </div>
        <p style={type(42, 400, { color: C.mid, marginTop: 40, lineHeight: 1.3, opacity: t(f, 100, 120) })}>Every row says <b style={{ color: C.ink, fontWeight: 600 }}>✓ verified</b><br />or <b style={{ color: C.ink, fontWeight: 600 }}>reported</b>, next to its source.</p>
      </div>
      <div style={{ position: 'absolute', right: 230, top: 70, width: 530, height: 940, borderRadius: 40, background: C.ink, overflow: 'hidden', boxShadow: '0 60px 120px -50px rgba(32,41,31,.7)', transform: `translateY(${(1 - card) * 700}px)`, padding: '64px 44px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={type(22, 600, { color: C.accent, letterSpacing: '0.18em', textTransform: 'uppercase' })}>Acme Ops · today</p>
          <Mark size={36} color={C.accent} />
        </div>
        <p style={type(150, 600, { color: C.light, marginTop: 40, fontVariantNumeric: 'tabular-nums' })}>{n}</p>
        <p style={type(26, 500, { color: 'rgba(253,255,252,.7)', marginTop: 10 })}>weekly active users <span style={{ color: C.accent }}>✓ verified</span></p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 150, marginTop: 34 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h * 100 * t(f, 30 + i * 4, 52 + i * 4)}%`, background: i === bars.length - 1 ? C.accent : 'rgba(160,224,153,.35)', borderRadius: 8 }} />
          ))}
        </div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ROWS.map((r, i) => {
            const at = 70 + i * 16;
            const k = t(f, at, at + 14);
            return (
              <div key={r.src} style={{ opacity: k, transform: `translateX(${(1 - k) * 60}px)`, padding: '16px 20px', borderRadius: 16, background: 'rgba(253,255,252,.07)' }}>
                <p style={type(24, 600, { color: C.light, lineHeight: 1.25 })}>{r.text}</p>
                <p style={type(19, 500, { color: r.ok ? C.accent : 'rgba(253,255,252,.55)', marginTop: 6 })}>{r.ok ? '✓ verified' : '· reported'} · {r.src}</p>
              </div>
            );
          })}
        </div>
        <p style={type(16, 500, { color: 'rgba(253,255,252,.4)', marginTop: 'auto' })}>Example company</p>
      </div>
      {[70, 86, 102].map((at) => <Sequence key={at} from={at} durationInFrames={14}><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.3} /></Sequence>)}
    </AbsoluteFill>
  );
}

// ── 6 · Three words, on the beat ─────────────────────────────────────────────────────────
const WORDS: Array<[string, string, string]> = [['It asks.', C.accent, C.ink], ['It checks.', C.ink, C.light], ['It cuts the video.', C.bg, C.ink]];
export function Words() {
  const f = useCurrentFrame();
  const i = Math.min(2, Math.floor(f / 33));
  const local = f - i * 33;
  const [word, bg, fg] = WORDS[i];
  return (
    <AbsoluteFill style={{ background: bg, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 33, 66].map((at) => <Sequence key={at} from={at} durationInFrames={20}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.28} /></Sequence>)}
      <p style={type(200, 600, { color: fg, transform: `scale(${1.18 - 0.18 * t(local, 0, 10)})` })}>{word}</p>
    </AbsoluteFill>
  );
}

// ── 7 · End card ─────────────────────────────────────────────────────────────────────────
export function End() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: f - 2, fps, config: { damping: 10, stiffness: 150 } });
  const pill = spring({ frame: f - 34, fps, config: { damping: 15, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ background: C.accent, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, transform: `scale(${mark})` }}>
        <Mark size={130} color={C.ink} />
        <p style={type(120, 600, { color: C.ink })}>DailyRecap</p>
      </div>
      <p style={type(56, 500, { color: C.ink, marginTop: 44, opacity: t(f, 14, 30), transform: `translateY(${(1 - t(f, 14, 30)) * 20}px)` })}>Your startup's first chief of staff.</p>
      <div style={{ marginTop: 70, padding: '30px 56px', borderRadius: 999, background: C.ink, transform: `scale(${pill})`, boxShadow: '0 30px 60px -30px rgba(32,41,31,.6)' }}>
        <p style={type(52, 600, { color: C.light, letterSpacing: '-0.01em' })}><Typed f={f} at={40} text={URL} speed={1.5} /></p>
      </div>
      <p style={type(34, 500, { color: C.ink, marginTop: 44, opacity: t(f, 80, 96) })}>One text to install · Free · Open source</p>
      <Sequence from={34} durationInFrames={20}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.35} /></Sequence>
    </AbsoluteFill>
  );
}
