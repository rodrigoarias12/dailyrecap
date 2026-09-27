import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fonts } from './pieces';
import { C, End, Grain, Mark, Phone, Question, Sources, Wipe, Words, clamp, t, type } from './Promo';

/**
 * The demo for YouTube, cut like the promo: a founder, her recap on her phone, and how she got
 * it, in drawn scenes, big type, music and sound effects, no voice and no captions. The recaps
 * inside the phones are real renders of the engine (public/demo3/, not committed):
 *   founder.mp4    the opening shot
 *   ceo-after.mp4  a daily recap (YoRobot's, demo KPI sheet)
 *   first-after.mp4 the first video, made from yorobot.ai alone
 *   home.png       yorobot.ai, the page the first video was made from
 */
const S = { founder: 0, recap: 126, question: 456, install: 606, first: 786, sources: 1116, connect: 1296, beats: 1476, ways: 1596, end: 1776 };
export const DEMO_FRAMES = 1926;

/** The voice: one line per scene (edge-tts, en-US-AndrewNeural, +6%), in public/audio/narration/demo3/, not committed. Start and length in seconds. */
const VOICE: Array<[string, number, number]> = [
  ['v01', 0.5, 2.98], ['v02', 4.6, 6.43], ['v03', 15.5, 3.31], ['v04', 20.5, 4.25], ['v05', 26.5, 7.97], ['v06', 37.3, 5.78],
  ['v07', 43.5, 5.11], ['v08', 49.25, 0.96], ['v09', 50.35, 0.96], ['v10', 51.45, 2.09], ['v11', 53.4, 4.9], ['v12', 59.4, 3.19],
];
/** The music ducks under every line and comes back between them. */
function bed(f: number) {
  let k = 1;
  for (const [, at, len] of VOICE) k = Math.min(k, interpolate(f, [at * 30 - 8, at * 30, (at + len) * 30, (at + len) * 30 + 12], [1, 0.3, 0.3, 1], clamp));
  return k;
}
const CUTS = [S.recap, S.question, S.install, S.first, S.sources, S.connect, S.ways, S.end];

export function Demo() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />
      <Audio src={staticFile('audio/music-demo3.mp3')} volume={(f) => 0.9 * bed(f) * interpolate(f, [0, 12, DEMO_FRAMES - 60, DEMO_FRAMES], [0, 1, 1, 0], clamp)} />
      {VOICE.map(([file, at]) => <Sequence key={file} from={Math.round(at * 30)} layout="none"><Audio src={staticFile(`audio/narration/demo3/${file}.mp3`)} volume={1} /></Sequence>)}
      <Sequence durationInFrames={S.recap}><Founder /></Sequence>
      <Sequence from={S.recap} durationInFrames={S.question - S.recap}><HerRecap /></Sequence>
      <Sequence from={S.question} durationInFrames={S.install - S.question}><Question /></Sequence>
      <Sequence from={S.install} durationInFrames={S.first - S.install}><Phone site="yorobot.ai/en" /></Sequence>
      <Sequence from={S.first} durationInFrames={S.sources - S.first}><FirstVideo /></Sequence>
      <Sequence from={S.sources} durationInFrames={S.connect - S.sources}><Sources /></Sequence>
      <Sequence from={S.connect} durationInFrames={S.beats - S.connect}><Connect /></Sequence>
      <Sequence from={S.beats} durationInFrames={S.ways - S.beats}><Words /></Sequence>
      <Sequence from={S.ways} durationInFrames={S.end - S.ways}><Ways /></Sequence>
      <Sequence from={S.end}><End /></Sequence>
      {CUTS.map((at) => <Wipe key={at} at={at} />)}
      {CUTS.map((at) => (
        <Sequence key={`w${at}`} from={at - 8} durationInFrames={30}><Audio src={staticFile('sfx/whoosh-fast.mp3')} volume={0.35} /></Sequence>
      ))}
      <Grain />
    </AbsoluteFill>
  );
}

/** A phone frame around anything: a video, a chat. */
function Handset({ children, rise, style }: { children: ReactNode; rise: number; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'absolute', width: 520, height: 1000, top: 40, borderRadius: 70, background: '#0f140f', padding: 14, boxShadow: '0 60px 120px -40px rgba(0,0,0,.8), 0 0 0 2px rgba(253,255,252,.08)', transform: `translateY(${(1 - rise) * 600}px) rotate(${(1 - rise) * 5}deg)`, ...style }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 57, overflow: 'hidden', background: C.ink, position: 'relative' }}>{children}</div>
    </div>
  );
}

function Reveal({ f, at, size, color, children, weight = 600 }: { f: number; at: number; size: number; color: string; children: ReactNode; weight?: number }) {
  return (
    <div style={{ overflow: 'hidden', paddingBottom: 6 }}>
      <p style={type(size, weight, { color, transform: `translateY(${(1 - t(f, at, at + 14)) * 108}%)` })}>{children}</p>
    </div>
  );
}

// ── The founder ──────────────────────────────────────────────────────────────────────────
function Founder() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* Her phone lights up: the recap arrives. The shot's own sound is off, the music runs from frame 0. */}
      <Sequence from={10} durationInFrames={24}><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.7} /></Sequence>
      <Sequence from={96} durationInFrames={40}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.4} /></Sequence>
      <OffthreadVideo src={staticFile('demo3/founder.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + 0.05 * t(f, 0, 126)})` }} />
      <div style={{ position: 'absolute', left: 120, bottom: 110, opacity: t(f, 20, 36) }}>
        <p style={type(30, 600, { color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase' })}>6:00 pm</p>
        <Reveal f={f} at={26} size={90} color={C.light}>Her company's day</Reveal>
        <Reveal f={f} at={34} size={90} color={C.light}>just arrived.</Reveal>
      </div>
    </AbsoluteFill>
  );
}

// ── Her recap, on her phone ──────────────────────────────────────────────────────────────
function Callout({ f, at, children, on }: { f: number; at: number; children: ReactNode; on: boolean }) {
  const { fps } = useVideoConfig();
  const k = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 190, mass: 0.8 } });
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '18px 30px', borderRadius: 999, background: on ? C.accent : 'transparent', border: on ? 'none' : '2px solid rgba(253,255,252,.4)', transform: `scale(${k})`, transformOrigin: 'left center', ...type(36, 600, { color: on ? C.ink : C.light }) }}>
      {children}
    </div>
  );
}
function HerRecap() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: 'absolute', left: 150, top: 250, width: 1000 }}>
        <p style={type(30, 600, { color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 6, 20) })}>Every weekday at 6 pm</p>
        <div style={{ marginTop: 24 }}>
          <Reveal f={f} at={8} size={104} color={C.light}>Her company's day,</Reveal>
          <Reveal f={f} at={16} size={104} color={C.light}>as a 30-second video.</Reveal>
        </div>
        <p style={type(40, 400, { color: 'rgba(253,255,252,.7)', marginTop: 50, lineHeight: 1.3, opacity: t(f, 150, 170) })}>Every number and every row says<br />where it came from:</p>
        <div style={{ display: 'flex', gap: 18, marginTop: 28 }}>
          <Callout f={f} at={176} on>✓ verified</Callout>
          <Callout f={f} at={190} on={false}>reported</Callout>
        </div>
        <Sequence from={176} durationInFrames={14}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.35} /></Sequence>
        <Sequence from={190} durationInFrames={14}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.25} /></Sequence>
      </div>
      <Handset rise={rise} style={{ right: 210 }}>
        <OffthreadVideo src={staticFile('demo3/ceo-after.mp4')} muted startFrom={0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Handset>
    </AbsoluteFill>
  );
}

// ── The first video, from the website alone ─────────────────────────────────────────────
function FirstVideo() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const site = spring({ frame: f - 4, fps, config: { damping: 16, stiffness: 110 } });
  const fly = t(f, 70, 100);
  const rise = spring({ frame: f - 86, fps, config: { damping: 18, stiffness: 100 } });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position: 'absolute', left: 150, top: 250, width: 800 }}>
        <p style={type(30, 600, { color: C.ok, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 6, 20) })}>Fifteen minutes later</p>
        <div style={{ marginTop: 24 }}>
          <Reveal f={f} at={8} size={104} color={C.ink}>Her first video,</Reveal>
          <Reveal f={f} at={16} size={104} color={C.ink}>made from her</Reveal>
          <Reveal f={f} at={24} size={104} color={C.ink}>website alone.</Reveal>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 50 }}>
          {['Her name', 'Her logo', 'Her colors', 'What she does'].map((x, i) => {
            const k = spring({ frame: f - (120 + i * 10), fps, config: { damping: 13, stiffness: 190, mass: 0.8 } });
            return (
              <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderRadius: 999, background: C.accent, transform: `scale(${k})`, ...type(32, 600, { color: C.ink }) }}>✓ {x}</span>
            );
          })}
        </div>
        {[120, 130, 140, 150].map((at) => <Sequence key={at} from={at} durationInFrames={14}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.22} /></Sequence>)}
      </div>
      {/* The website: it lands, then flies into the phone that makes the video from it. */}
      <div style={{ position: 'absolute', right: 150, top: 300, width: 760, borderRadius: 18, overflow: 'hidden', boxShadow: '0 50px 100px -40px rgba(32,41,31,.6), 0 0 0 1px rgba(0,0,0,.08)', opacity: site * (1 - fly), transform: `translateY(${(1 - site) * 200}px) translateX(${fly * 120}px) scale(${1 - 0.6 * fly})` }}>
        <div style={{ height: 40, background: '#eef1ed', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: '#cfd6ce' }} />)}
          <span style={type(18, 500, { color: C.mid, marginLeft: 16 })}>yorobot.ai/en</span>
        </div>
        <Img src={staticFile('demo3/home.png')} style={{ display: 'block', width: '100%' }} />
      </div>
      {f >= 80 && (
        <Handset rise={rise} style={{ right: 270 }}>
          <Sequence from={96} layout="none"><OffthreadVideo src={staticFile('demo3/first-after.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Sequence>
        </Handset>
      )}
    </AbsoluteFill>
  );
}

// ── Then, connect more ───────────────────────────────────────────────────────────────────
const MENU: Array<[string, string]> = [
  ['Your numbers', 'Odoo, a KPI sheet, a report link'],
  ['Your team', 'a phone number each'],
  ['Your other agents', 'OpenClaw, Agent2Agent, YoRobot'],
  ['Your repos', 'commits, releases, CI'],
];
function Connect() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.ink, padding: '0 150px', justifyContent: 'center' }}>
      <p style={type(30, 600, { color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 4, 18) })}>Then, when she wants</p>
      <div style={{ marginTop: 20, marginBottom: 50 }}>
        <Reveal f={f} at={6} size={100} color={C.light}>Connect more. Reply a number.</Reveal>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {MENU.map(([a, b], i) => {
          const at = 30 + i * 14;
          const k = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 180, mass: 0.8 } });
          return (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '28px 34px', borderRadius: 24, background: '#2c3a2b', opacity: Math.min(1, k), transform: `translateY(${(1 - k) * 40}px)` }}>
              <span style={{ width: 84, height: 84, borderRadius: 99, background: C.accent, display: 'grid', placeItems: 'center', flex: '0 0 auto', ...type(46, 700, { color: C.ink }) }}>{i + 1}</span>
              <div>
                <p style={type(46, 600, { color: C.light })}>{a}</p>
                <p style={type(28, 400, { color: 'rgba(253,255,252,.65)', marginTop: 8 })}>{b}</p>
              </div>
            </div>
          );
        })}
      </div>
      {[30, 44, 58, 72].map((at) => <Sequence key={at} from={at} durationInFrames={14}><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.3} /></Sequence>)}
    </AbsoluteFill>
  );
}

// ── Two ways to run it ───────────────────────────────────────────────────────────────────
function Ways() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards: Array<[string, string, string]> = [
    ['On Plow', 'One text from your iPhone.', 'Nothing to install.'],
    ['On your own OpenClaw', 'Beside your other agents.', 'Telegram, Slack, WhatsApp.'],
  ];
  return (
    <AbsoluteFill style={{ background: C.bg, padding: '0 150px', justifyContent: 'center' }}>
      <p style={type(30, 600, { color: C.ok, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 4, 18) })}>Two ways to run it</p>
      <div style={{ display: 'flex', gap: 40, marginTop: 44 }}>
        {cards.map(([h, a, b], i) => {
          const k = spring({ frame: f - (10 + i * 12), fps, config: { damping: 15, stiffness: 150 } });
          return (
            <div key={h} style={{ flex: 1, padding: '56px 56px 60px', borderRadius: 32, background: i === 0 ? C.ink : '#fff', boxShadow: '0 40px 80px -40px rgba(32,41,31,.5), 0 0 0 1px rgba(0,0,0,.06)', transform: `translateY(${(1 - k) * 300}px)`, opacity: Math.min(1, k) }}>
              <Mark size={70} color={i === 0 ? C.accent : C.ink} />
              <p style={type(76, 600, { color: i === 0 ? C.light : C.ink, marginTop: 30 })}>{h}</p>
              <p style={type(40, 400, { color: i === 0 ? 'rgba(253,255,252,.75)' : C.mid, marginTop: 24, lineHeight: 1.3 })}>{a}<br />{b}</p>
            </div>
          );
        })}
      </div>
      <p style={type(34, 500, { color: C.mid, marginTop: 44, opacity: t(f, 60, 76) })}>Open source, MIT.</p>
      {[10, 22].map((at) => <Sequence key={at} from={at} durationInFrames={20}><Audio src={staticFile('sfx/impact-transition.mp3')} volume={0.2} /></Sequence>)}
    </AbsoluteFill>
  );
}
