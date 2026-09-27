import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fonts } from './pieces';
import { FONT } from './style';

/**
 * OnBehalf's promo: 37 seconds of motion graphics, music and sound effects, no voice. Every
 * line on screen is something the agent really does (see github.com/rodrigoarias12/onbehalf);
 * the names are examples. The cuts land on the bars of the generated music bed (122 BPM):
 *   node scripts/music.mjs 38 public/audio/music-onbehalf-promo.mp3
 *   npx remotion render src/index.ts OnBehalfPromo out/onbehalf-promo.mp4 --crf=16 --image-format=png --pixel-format=yuv420p --color-space=bt709
 */
export const ONBEHALF_PROMO_FRAMES = 1110;
const URL = 'aiworthusing.com/agent-index/onbehalf';

const C = { accent: '#ffcf5c', ink: '#20291f', bg: '#f8faf7', light: '#fdfffc', mid: '#647063', line: '#dde5dc', blue: '#2f7bf6', red: '#e5484d', ok: '#2c7a3f', gray: '#e9ece9' };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const t = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: ease });
const type = (size: number, weight = 500, extra?: CSSProperties): CSSProperties => ({ fontFamily: FONT, fontSize: size, fontWeight: weight, letterSpacing: size > 60 ? '-0.035em' : '-0.01em', lineHeight: 1.04, margin: 0, ...extra });
const label = (color: string, extra?: CSSProperties): CSSProperties => type(28, 600, { color, letterSpacing: '0.2em', textTransform: 'uppercase', ...extra });

/** Scene boundaries, in frames (one bar of the bed ≈ 59 frames). */
const S = { hook: 0, logo: 150, guard: 270, phone: 470, calendar: 680, langs: 830, words: 930, end: 1030 };
const CUTS = [S.logo, S.guard, S.phone, S.calendar, S.langs, S.end];

export function OnBehalfPromo() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />
      <Audio src={staticFile('audio/music-onbehalf-promo.mp3')} volume={(f) => interpolate(f, [0, 20, ONBEHALF_PROMO_FRAMES - 60, ONBEHALF_PROMO_FRAMES], [0, 0.85, 0.85, 0], clamp)} />
      <Sequence durationInFrames={S.logo}><Hook /></Sequence>
      <Sequence from={S.logo} durationInFrames={S.guard - S.logo}><Logo /></Sequence>
      <Sequence from={S.guard} durationInFrames={S.phone - S.guard}><Guard /></Sequence>
      <Sequence from={S.phone} durationInFrames={S.calendar - S.phone}><Phone /></Sequence>
      <Sequence from={S.calendar} durationInFrames={S.langs - S.calendar}><Calendar /></Sequence>
      <Sequence from={S.langs} durationInFrames={S.words - S.langs}><Languages /></Sequence>
      <Sequence from={S.words} durationInFrames={S.end - S.words}><Words /></Sequence>
      <Sequence from={S.end}><End /></Sequence>
      {CUTS.map((at) => <Wipe key={at} at={at} />)}
      {CUTS.map((at) => <Sequence key={`w${at}`} from={at - 8} durationInFrames={30}><Audio src={staticFile('sfx/whoosh-fast.mp3')} volume={0.32} /></Sequence>)}
      <Grain />
    </AbsoluteFill>
  );
}

/** An amber band sweeping across on every cut: the brand's one gesture. */
function Wipe({ at }: { at: number }) {
  const f = useCurrentFrame() - at;
  if (f < -10 || f > 10) return null;
  const x = interpolate(f, [-10, 10], [-120, 120], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -200, bottom: -200, left: '50%', width: '70%', marginLeft: '-35%', background: C.accent, transform: `translateX(${x}%) skewX(-12deg)` }} />
    </AbsoluteFill>
  );
}
function Grain() {
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile('fx/grain.png')})`, opacity: 0.05, mixBlendMode: 'overlay', pointerEvents: 'none' }} />;
}

/** The mark: a speech bubble with a person in front of it. The voice goes first, the person stays. */
function Mark({ size, bubble = 1, head = 1, ink = C.ink, cut = C.accent }: { size: number; bubble?: number; head?: number; ink?: string; cut?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      <g style={{ transform: `scale(${bubble})`, transformOrigin: '15px 13px' }}>
        <path d="M8.5 5.5h9a4 4 0 0 1 4 4v4.5a4 4 0 0 1-4 4h-4.2l-3.8 3.2v-3.2h-1a4 4 0 0 1-4-4V9.5a4 4 0 0 1 4-4z" fill={ink} stroke={cut} strokeWidth={1.6} />
      </g>
      <circle cx="6" cy="7" r={4 * head} fill={ink} stroke={cut} strokeWidth={head > 0 ? 1.2 : 0} />
    </svg>
  );
}
function Tile({ size, bubble, head }: { size: number; bubble?: number; head?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: C.accent, display: 'grid', placeItems: 'center' }}>
      <Mark size={size * 0.66} bubble={bubble} head={head} />
    </div>
  );
}

function Reveal({ f, at, children, style }: { f: number; at: number; children: ReactNode; style?: CSSProperties }) {
  const k = t(f, at, at + 14);
  return (
    <div style={{ overflow: 'hidden', paddingBottom: 10 }}>
      <div style={{ transform: `translateY(${(1 - k) * 105}%)`, ...style }}>{children}</div>
    </div>
  );
}
function Typed({ f, at, text: s, speed = 1.6 }: { f: number; at: number; text: string; speed?: number }) {
  const n = Math.max(0, Math.min(s.length, Math.floor((f - at) * speed)));
  return <>{s.slice(0, n)}{n < s.length && <span style={{ opacity: 0.55 }}>|</span>}</>;
}
function Pop({ at, sfx = 'ui-message-pop', volume = 0.4 }: { at: number; sfx?: string; volume?: number }) {
  return <Sequence from={at} durationInFrames={24}><Audio src={staticFile(`sfx/${sfx}.mp3`)} volume={volume} /></Sequence>;
}

// ── 1 · The hook: the message nobody wanted ──────────────────────────────────────────────
function Hook() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bubble = spring({ frame: f - 34, fps, config: { damping: 14, stiffness: 190 } });
  const strike = t(f, 92, 112);
  const shake = f > 92 && f < 104 ? Math.sin(f * 2.4) * 6 : 0;
  const msg = "Hey Patrick! I'm free Tuesday at noon. See you then!";
  return (
    <AbsoluteFill style={{ background: C.ink, padding: '0 160px', justifyContent: 'center' }}>
      <Pop at={34} />
      <Sequence from={92} durationInFrames={30}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.4} /></Sequence>
      <Reveal f={f} at={4}><p style={type(84, 600, { color: C.light })}>Your AI assistant just texted</p></Reveal>
      <Reveal f={f} at={14}><p style={type(84, 600, { color: C.light })}>an investor <span style={{ color: C.accent }}>for you.</span></p></Reveal>
      <div style={{ marginTop: 70, display: 'flex', alignItems: 'center', gap: 36, transform: `translateX(${shake}px)` }}>
        <div style={{ position: 'relative', padding: '30px 40px', borderRadius: 40, borderBottomLeftRadius: 10, background: C.blue, color: '#fff', ...type(46, 500, { letterSpacing: '-0.01em', lineHeight: 1.25 }), transform: `scale(${bubble})`, transformOrigin: 'bottom left', maxWidth: 1180 }}>
          <Typed f={f} at={38} text={msg} speed={2.2} />
          <div style={{ position: 'absolute', left: 30, right: 30, top: '50%', height: 6, borderRadius: 3, background: C.red, transform: `scaleX(${strike})`, transformOrigin: 'left' }} />
        </div>
      </div>
      <p style={type(64, 600, { color: C.red, marginTop: 48, opacity: t(f, 104, 118), transform: `translateY(${(1 - t(f, 104, 118)) * 20}px)` })}>…written as you.</p>
    </AbsoluteFill>
  );
}

// ── 2 · Logo ─────────────────────────────────────────────────────────────────────────────
function Logo() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tile = spring({ frame: f - 2, fps, config: { damping: 11, stiffness: 160 } });
  const bubble = spring({ frame: f - 10, fps, config: { damping: 9, stiffness: 170 } });
  const head = spring({ frame: f - 20, fps, config: { damping: 8, stiffness: 200 } });
  const word = t(f, 22, 40);
  const out = t(f, 104, 120);
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Sequence from={18} durationInFrames={40}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.45} /></Sequence>
      <div style={{ display: 'flex', alignItems: 'center', gap: 48, transform: `scale(${1 + 0.05 * t(f, 20, 120)}) translateY(${-40 * out}px)`, opacity: 1 - out }}>
        <div style={{ transform: `scale(${tile}) rotate(${(1 - tile) * -12}deg)` }}><Tile size={210} bubble={bubble} head={head} /></div>
        <div style={{ overflow: 'hidden' }}>
          <p style={type(160, 600, { color: C.light, transform: `translateY(${(1 - word) * 110}%)` })}>OnBehalf</p>
        </div>
      </div>
      <p style={type(58, 500, { position: 'absolute', bottom: 190, color: C.light, opacity: t(f, 44, 60) * (1 - out) })}>
        Speaks <span style={{ color: C.accent }}>for</span> you. Never <span style={{ color: C.accent }}>as</span> you.
      </p>
    </AbsoluteFill>
  );
}

// ── 3 · The voice guard: "I'm" becomes "Sam is" ──────────────────────────────────────────
const CHECKS = ['Owner’s voice → rewritten', 'Wrong weekday → rewritten', 'Last door → not sent'];
function Guard() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: f - 4, fps, config: { damping: 16, stiffness: 120 } });
  const strike = t(f, 40, 56);
  const swap = t(f, 62, 80);
  const scan = t(f, 20, 60);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Pop at={40} sfx="ui-select-modern" volume={0.35} />
      <Pop at={66} />
      {[120, 134, 148].map((at) => <Pop key={at} at={at} sfx="ui-select-modern" volume={0.22} />)}
      <div style={{ position: 'absolute', left: 150, top: 150 }}>
        <p style={label(C.mid, { opacity: t(f, 4, 18) })}>The voice guard</p>
        <Reveal f={f} at={8} style={{ marginTop: 22 }}><p style={type(92, 600, { color: C.ink })}>Checked outside the model.</p></Reveal>
      </div>
      <div style={{ position: 'absolute', left: 150, top: 420, width: 1000, padding: '40px 48px', borderRadius: 36, background: '#fff', boxShadow: '0 50px 100px -50px rgba(32,41,31,.45), 0 0 0 1px ' + C.line, transform: `translateY(${(1 - card) * 300}px)`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 160, left: `${-20 + scan * 110}%`, background: 'linear-gradient(90deg, transparent, rgba(255,207,92,.45), transparent)', opacity: scan < 1 ? 1 : 0 }} />
        <p style={label(C.mid, { fontSize: 22 })}>To Patrick · from Spruce, Sam’s assistant</p>
        <p style={type(58, 500, { color: C.ink, marginTop: 26, lineHeight: 1.25, letterSpacing: '-0.015em', position: 'relative' })}>
          <span style={{ position: 'relative', display: 'inline-block', width: interpolate(swap, [0, 1], [84, 178]), height: '1.25em', verticalAlign: 'bottom' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - swap, color: C.red }}>I’m</span>
            <span style={{ position: 'absolute', left: 0, top: 0, height: 5, marginTop: '0.62em', width: 84, background: C.red, transform: `scaleX(${strike})`, transformOrigin: 'left', opacity: 1 - swap }} />
            <span style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', opacity: swap, transform: `translateY(${(1 - swap) * 30}px)`, background: C.accent, borderRadius: 10, padding: '0 8px', marginLeft: -8 }}>Sam is</span>
          </span>
          <span>&nbsp;free Tuesday at noon.</span>
        </p>
      </div>
      <div style={{ position: 'absolute', right: 150, top: 430, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {CHECKS.map((c, i) => {
          const s = spring({ frame: f - (120 + i * 14), fps, config: { damping: 14, stiffness: 170 } });
          return (
            <div key={c} style={{ transform: `scale(${s})`, transformOrigin: 'left center', display: 'flex', alignItems: 'center', gap: 16, padding: '20px 30px', borderRadius: 999, background: C.ink, color: C.light, ...type(32, 600) }}>
              <span style={{ width: 34, height: 34, borderRadius: 99, background: C.accent, color: C.ink, display: 'grid', placeItems: 'center', fontSize: 22 }}>✓</span>{c}
            </div>
          );
        })}
      </div>
      <p style={type(40, 500, { position: 'absolute', left: 150, bottom: 110, color: C.mid, opacity: t(f, 150, 166) })}>Hooks in the OpenClaw Gateway. Not a line in a prompt.</p>
    </AbsoluteFill>
  );
}

// ── 4 · Text it like a person ────────────────────────────────────────────────────────────
function Bubble({ f, at, out, small, children }: { f: number; at: number; out?: boolean; small?: boolean; children: ReactNode }) {
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 200 } });
  if (f < at) return null;
  return (
    <div style={{ alignSelf: out ? 'flex-end' : 'flex-start', maxWidth: '86%', padding: '16px 22px', borderRadius: 26, fontFamily: FONT, fontSize: small ? 22 : 26, lineHeight: 1.3, background: out ? C.blue : C.gray, color: out ? '#fff' : C.ink, borderBottomRightRadius: out ? 8 : 26, borderBottomLeftRadius: out ? 26 : 8, transform: `scale(${s})`, transformOrigin: out ? 'bottom right' : 'bottom left' }}>
      {children}
    </div>
  );
}
function Phone() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  const ask = 'Coffee with Juan next week, +1 415 555 0134';
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {[14, 64, 124, 150].map((at) => <Pop key={at} at={at} volume={0.45} />)}
      <div style={{ position: 'absolute', left: 150, top: 300, width: 760 }}>
        <p style={label(C.accent, { opacity: t(f, 6, 20) })}>How it works</p>
        <Reveal f={f} at={8} style={{ marginTop: 24 }}><p style={type(104, 600, { color: C.light })}>Text it</p></Reveal>
        <Reveal f={f} at={16}><p style={type(104, 600, { color: C.light })}>like a person.</p></Reveal>
        <p style={type(40, 400, { color: 'rgba(253,255,252,.72)', marginTop: 40, lineHeight: 1.35, opacity: t(f, 80, 100) })}>It texts them <b style={{ color: C.accent, fontWeight: 600 }}>as your assistant</b>,<br />with times you’re really free,<br />and tells you if it arrived.</p>
      </div>
      <div style={{ position: 'absolute', right: 210, top: 60, width: 560, height: 1020, borderRadius: 72, background: '#0f140f', padding: 16, boxShadow: '0 60px 120px -40px rgba(0,0,0,.8), 0 0 0 2px rgba(253,255,252,.08)', transform: `translateY(${(1 - rise) * 520}px) rotate(${(1 - rise) * 6}deg)` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 58, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '54px 28px 18px', borderBottom: '1px solid #e6ece5', display: 'flex', alignItems: 'center', gap: 16 }}>
            <Tile size={62} />
            <div>
              <p style={type(28, 600, { color: C.ink })}>Spruce</p>
              <p style={type(19, 400, { color: C.mid, marginTop: 4 })}>Sam’s assistant · iMessage</p>
            </div>
          </div>
          <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-end', paddingBottom: 36 }}>
            <Bubble f={f} at={14} out><Typed f={f} at={14} text={ask} speed={1.5} /></Bubble>
            <Bubble f={f} at={64} small>Here’s what Juan will get:<br /><i>“Hi Juan, this is Spruce, Sam’s assistant (I’m an AI). Sam is free Mon Sep 28, Tue Sep 29 or Thu Oct 1, 9–10am PT. Which works?”</i><br />Send it?</Bubble>
            <Bubble f={f} at={124} out>Send it</Bubble>
            <Bubble f={f} at={150}>It reached Juan <span style={{ color: C.ok, fontWeight: 600 }}>✓ delivered</span>. I’ll tell you when he answers.</Bubble>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── 5 · The calendar: free, never what ───────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const BUSY: Array<[number, number, number]> = [[0, 1, 2.2], [1, 3.4, 5], [2, 0, 6], [3, 2.4, 3.6], [4, 0.6, 2.4], [4, 3.6, 5.2]];
const FREE: Array<[number, number]> = [[0, 0], [1, 0], [3, 0]];
function Calendar() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colW = 200, rowH = 88, x0 = 900, y0 = 250;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {[40, 52, 64].map((at) => <Pop key={at} at={at} sfx="ui-select-modern" volume={0.22} />)}
      <div style={{ position: 'absolute', left: 150, top: 330, width: 660 }}>
        <p style={label(C.mid, { opacity: t(f, 4, 18) })}>Your calendar, read-only</p>
        <Reveal f={f} at={8} style={{ marginTop: 22 }}><p style={type(86, 600, { color: C.ink })}>When you’re free.</p></Reveal>
        <Reveal f={f} at={18}><p style={type(86, 600, { color: C.mid })}>Never what</p></Reveal>
        <Reveal f={f} at={26}><p style={type(86, 600, { color: C.mid })}>you’re doing.</p></Reveal>
      </div>
      {DAYS.map((d, i) => (
        <p key={d} style={type(28, 600, { position: 'absolute', left: x0 + i * colW, top: y0 - 60, width: colW - 16, textAlign: 'center', color: C.mid, opacity: t(f, 6 + i * 3, 20 + i * 3) })}>{d}</p>
      ))}
      <div style={{ position: 'absolute', left: x0, top: y0, width: colW * 5 - 16, height: rowH * 6, borderRadius: 24, background: '#fff', boxShadow: '0 0 0 1px ' + C.line, opacity: t(f, 4, 16) }} />
      {BUSY.map(([d, a, b], i) => {
        const k = t(f, 12 + i * 4, 28 + i * 4);
        return <div key={i} style={{ position: 'absolute', left: x0 + d * colW + 10, top: y0 + a * rowH + 8, width: colW - 36, height: (b - a) * rowH - 16, borderRadius: 16, background: '#dfe4de', transform: `scaleY(${k})`, transformOrigin: 'top', display: 'grid', placeItems: 'center', ...type(22, 600, { color: '#8a948a' }) }}>{k > 0.9 ? 'busy' : ''}</div>;
      })}
      {FREE.map(([d, a], i) => {
        const s = spring({ frame: f - (40 + i * 12), fps, config: { damping: 12, stiffness: 180 } });
        return <div key={i} style={{ position: 'absolute', left: x0 + d * colW + 10, top: y0 + a * rowH + 8, width: colW - 36, height: rowH - 16, borderRadius: 16, background: C.accent, transform: `scale(${s})`, display: 'grid', placeItems: 'center', ...type(24, 600, { color: C.ink }), boxShadow: '0 16px 30px -16px rgba(32,41,31,.5)' }}>9–10am</div>;
      })}
      <p style={type(34, 500, { position: 'absolute', left: x0, top: y0 + rowH * 6 + 40, color: C.mid, opacity: t(f, 90, 106) })}>A script reads the calendar. The model only sees the free slots.</p>
    </AbsoluteFill>
  );
}

// ── 6 · Any language, any time zone ──────────────────────────────────────────────────────
const LANGS: Array<[string, string]> = [['Hi Juan, this is Spruce, Sam’s assistant.', 'PT'], ['Hola Juan, soy Spruce, la asistente de Sam.', 'ART'], ['Oi Juan, aqui é a Spruce, assistente do Sam.', 'BRT']];
function Languages() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: 'center', padding: '0 150px' }}>
      {[6, 30, 54].map((at) => <Pop key={at} at={at} volume={0.35} />)}
      <p style={label(C.accent, { opacity: t(f, 2, 14), marginBottom: 40 })}>In their language, on their clock</p>
      {LANGS.map(([s, tz], i) => {
        const k = t(f, 6 + i * 24, 20 + i * 24);
        return (
          <div key={tz} style={{ display: 'flex', alignItems: 'center', gap: 34, marginBottom: 28, opacity: k, transform: `translateX(${(1 - k) * 80}px)` }}>
            <span style={{ ...type(30, 600, { color: C.ink }), background: C.accent, borderRadius: 12, padding: '10px 18px', minWidth: 110, textAlign: 'center' }}>{tz}</span>
            <p style={type(62, 500, { color: C.light, letterSpacing: '-0.02em' })}>{s}</p>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ── 7 · Three lines, on the beat ─────────────────────────────────────────────────────────
const WORDS: Array<[string, string, string]> = [['It finds the time.', C.accent, C.ink], ['It texts as your assistant.', C.ink, C.light], ['It tells you what really happened.', C.bg, C.ink]];
function Words() {
  const f = useCurrentFrame();
  const i = Math.min(2, Math.floor(f / 33));
  const local = f - i * 33;
  const [word, bg, fg] = WORDS[i];
  return (
    <AbsoluteFill style={{ background: bg, alignItems: 'center', justifyContent: 'center', padding: '0 120px' }}>
      {[0, 33, 66].map((at) => <Sequence key={at} from={at} durationInFrames={20}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.26} /></Sequence>)}
      <p style={type(128, 600, { color: fg, textAlign: 'center', transform: `scale(${1.14 - 0.14 * t(local, 0, 10)})` })}>{word}</p>
    </AbsoluteFill>
  );
}

// ── 8 · End card ─────────────────────────────────────────────────────────────────────────
function End() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: f - 2, fps, config: { damping: 10, stiffness: 150 } });
  const pill = spring({ frame: f - 30, fps, config: { damping: 15, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ background: C.accent, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 34, transform: `scale(${mark})` }}>
        <div style={{ width: 140, height: 140, borderRadius: 40, background: C.ink, display: 'grid', placeItems: 'center' }}><Mark size={92} ink={C.accent} cut={C.ink} /></div>
        <p style={type(130, 600, { color: C.ink })}>OnBehalf</p>
      </div>
      <p style={type(56, 500, { color: C.ink, marginTop: 44, opacity: t(f, 12, 28), transform: `translateY(${(1 - t(f, 12, 28)) * 20}px)` })}>Speaks for you. Never as you.</p>
      <div style={{ marginTop: 64, padding: '30px 56px', borderRadius: 999, background: C.ink, transform: `scale(${pill})`, boxShadow: '0 30px 60px -30px rgba(32,41,31,.6)' }}>
        <p style={type(50, 600, { color: C.light, letterSpacing: '-0.01em' })}><Typed f={f} at={36} text={URL} speed={1.6} /></p>
      </div>
      <p style={type(32, 500, { color: C.ink, marginTop: 40, opacity: t(f, 64, 78) })}>Tap “Text this agent” · Open source · OpenClaw on Plow</p>
      <Sequence from={30} durationInFrames={20}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.35} /></Sequence>
    </AbsoluteFill>
  );
}
