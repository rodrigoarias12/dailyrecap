import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fonts } from './pieces';
import { C, End, Grain, Question, Sources, Typed, URL, Wipe, Words, clamp, t, type } from './Promo';

/**
 * The demo for YouTube, cut like the promo: a founder, her recap on her phone, and how she got
 * it, told in the iMessage threads where it really happens and closed on the diagram of how it
 * runs. Drawn scenes, big type, one music bed, a voice, no captions. The media inside the
 * phones are real renders of the engine (public/demo3/, not committed):
 *   founder.mp4     the opening shot
 *   ceo-after.mp4   a daily recap (YoRobot's, demo KPI sheet)
 *   first-after.mp4 the first video, made from yorobot.ai alone
 *   home.png        yorobot.ai, the page the first video was made from
 *   plano.png       docs/plano-en.html at 2x
 */
const S = { founder: 0, recap: 126, question: 456, install: 606, first: 846, menu: 1176, sources: 1386, beats: 1566, plano: 1686, end: 1926 };
export const DEMO_FRAMES = 2076;
const CUTS = [S.recap, S.question, S.install, S.first, S.menu, S.sources, S.plano, S.end];

/** The voice: one line per scene (edge-tts, en-US-AndrewNeural, +6%), in public/audio/narration/demo3/, not committed. Start and length in seconds. */
const VOICE: Array<[string, number, number]> = [
  ['v01', 0.5, 2.98], ['v02', 4.6, 6.43], ['v03', 15.5, 3.31], ['v04', 20.6, 6.72], ['v05', 28.6, 7.97], ['v07', 39.5, 6.12], ['v06', 46.4, 5.78],
  ['v08', 52.3, 0.96], ['v09', 53.4, 0.96], ['v10', 54.5, 2.09], ['v11', 56.7, 5.93], ['v12', 64.6, 3.19],
];

/** The music ducks under every line and comes back between them. */
function bed(f: number) {
  let k = 1;
  for (const [, at, len] of VOICE) k = Math.min(k, interpolate(f, [at * 30 - 8, at * 30, (at + len) * 30, (at + len) * 30 + 12], [1, 0.3, 0.3, 1], clamp));
  return k;
}

export function Demo() {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />
      <Audio src={staticFile('audio/music-demo3.mp3')} volume={(f) => 0.9 * bed(f) * interpolate(f, [0, 12, DEMO_FRAMES - 60, DEMO_FRAMES], [0, 1, 1, 0], clamp)} />
      {VOICE.map(([file, at]) => <Sequence key={file} from={Math.round(at * 30)} layout="none"><Audio src={staticFile(`audio/narration/demo3/${file}.mp3`)} /></Sequence>)}
      <Sequence durationInFrames={S.recap}><Founder /></Sequence>
      <Sequence from={S.recap} durationInFrames={S.question - S.recap}><HerRecap /></Sequence>
      <Sequence from={S.question} durationInFrames={S.install - S.question}><Question /></Sequence>
      <Sequence from={S.install} durationInFrames={S.first - S.install}><Install /></Sequence>
      <Sequence from={S.first} durationInFrames={S.menu - S.first}><FirstVideo /></Sequence>
      <Sequence from={S.menu} durationInFrames={S.sources - S.menu}><Menu /></Sequence>
      <Sequence from={S.sources} durationInFrames={S.beats - S.sources}><Sources /></Sequence>
      <Sequence from={S.beats} durationInFrames={S.plano - S.beats}><Words /></Sequence>
      <Sequence from={S.plano} durationInFrames={S.end - S.plano}><Plano /></Sequence>
      <Sequence from={S.end}><End /></Sequence>
      {CUTS.map((at) => <Wipe key={at} at={at} />)}
      {CUTS.map((at) => (
        <Sequence key={`w${at}`} from={at - 8} durationInFrames={30}><Audio src={staticFile('sfx/whoosh-fast.mp3')} volume={0.35} /></Sequence>
      ))}
      <Grain />
    </AbsoluteFill>
  );
}

// ── Shared pieces ────────────────────────────────────────────────────────────────────────
function Handset({ children, rise, style, light }: { children: ReactNode; rise: number; style?: CSSProperties; light?: boolean }) {
  return (
    <div style={{ position: 'absolute', width: 540, height: 1000, top: 40, borderRadius: 70, background: '#0f140f', padding: 14, boxShadow: '0 60px 120px -40px rgba(0,0,0,.8), 0 0 0 2px rgba(253,255,252,.08)', transform: `translateY(${(1 - rise) * 600}px) rotate(${(1 - rise) * 5}deg)`, ...style }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 57, overflow: 'hidden', background: light ? '#fff' : C.ink, position: 'relative' }}>{children}</div>
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

/** The left half of a phone scene: a label, the headline revealed line by line, and a quieter line under it. */
function Side({ f, label, lines, sub, subAt = 60, dark = true }: { f: number; label: string; lines: string[]; sub?: ReactNode; subAt?: number; dark?: boolean }) {
  return (
    <div style={{ position: 'absolute', left: 150, top: 250, width: 1000 }}>
      <p style={type(30, 600, { color: dark ? C.accent : C.ok, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: t(f, 6, 20) })}>{label}</p>
      <div style={{ marginTop: 24 }}>
        {lines.map((l, i) => <Reveal key={l} f={f} at={8 + i * 8} size={104} color={dark ? C.light : C.ink}>{l}</Reveal>)}
      </div>
      {sub && <div style={type(40, 400, { color: dark ? 'rgba(253,255,252,.72)' : C.mid, marginTop: 44, lineHeight: 1.3, maxWidth: 820, opacity: t(f, subAt, subAt + 16) })}>{sub}</div>}
    </div>
  );
}

/** One iMessage thread, drawn: messages arrive at their frame with a small spring and push the older ones up. */
type Msg = { at: number; out?: boolean; text?: string; typed?: boolean; video?: string; note?: string };
function Thread({ f, name, sub, avatar, msgs }: { f: number; name: string; sub: string; avatar: 'mark' | 'plow'; msgs: Msg[] }) {
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '58px 26px 18px', borderBottom: '1px solid #e6ece5', display: 'flex', alignItems: 'center', gap: 16, flex: '0 0 auto' }}>
        <div style={{ width: 62, height: 62, borderRadius: 99, background: avatar === 'mark' ? C.accent : '#e3e8e2', display: 'grid', placeItems: 'center' }}>
          {avatar === 'mark'
            ? <svg viewBox="0 0 24 24" width="36" height="36"><rect x="1" y="10" width="12" height="4" rx="2" fill={C.ink} /><circle cx="18" cy="12" r="5" fill={C.ink} /></svg>
            : <span style={type(24, 600, { color: C.mid })}>P</span>}
        </div>
        <div>
          <p style={type(28, 600, { color: C.ink })}>{name}</p>
          <p style={type(19, 400, { color: C.mid, marginTop: 4 })}>{sub}</p>
        </div>
      </div>
      <div style={{ flex: 1, padding: '20px 22px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12, overflow: 'hidden' }}>
        {msgs.filter((m) => f >= m.at).map((m, i) => {
          const k = spring({ frame: f - m.at, fps, config: { damping: 14, stiffness: 200 } });
          const base: CSSProperties = { alignSelf: m.out ? 'flex-end' : 'flex-start', transform: `scale(${k})`, transformOrigin: m.out ? 'bottom right' : 'bottom left', flex: '0 0 auto' };
          if (m.note) return <p key={i} style={{ ...base, ...type(16, 500, { color: C.mid }) }}>{m.note}</p>;
          if (m.video) {
            return (
              <div key={i} style={{ ...base, width: 230, height: 408, borderRadius: 20, overflow: 'hidden', background: C.ink }}>
                <OffthreadVideo src={staticFile(m.video)} muted startFrom={Math.max(0, -m.at)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            );
          }
          return (
            <div key={i} style={{ ...base, maxWidth: '86%', padding: '14px 20px', borderRadius: 24, whiteSpace: 'pre-line', background: m.out ? '#2f7bf6' : '#e9ece9', color: m.out ? '#fff' : C.ink, borderBottomRightRadius: m.out ? 7 : 24, borderBottomLeftRadius: m.out ? 24 : 7, ...type(23, 400, { lineHeight: 1.32, letterSpacing: 0 }) }}>
              {m.typed ? <Typed f={f} at={m.at} text={m.text ?? ''} /> : m.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Pops({ msgs, offset = 0 }: { msgs: Msg[]; offset?: number }) {
  return <>{msgs.filter((m) => !m.note && m.at >= 0).map((m, i) => <Sequence key={i} from={offset + m.at} durationInFrames={20}><Audio src={staticFile('sfx/ui-message-pop.mp3')} volume={0.45} /></Sequence>)}</>;
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
      <Side f={f} label="Every weekday at 6 pm" lines={["Her company's day,", 'as a 30-second video.']} subAt={150} sub={<>Every number and every row says<br />where it came from:</>} />
      <div style={{ position: 'absolute', left: 150, top: 700, display: 'flex', gap: 18 }}>
        <Callout f={f} at={176} on>✓ verified</Callout>
        <Callout f={f} at={190} on={false}>reported</Callout>
      </div>
      <Sequence from={176} durationInFrames={14}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.35} /></Sequence>
      <Sequence from={190} durationInFrames={14}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.25} /></Sequence>
      <Handset rise={rise} style={{ right: 200 }}>
        <OffthreadVideo src={staticFile('demo3/ceo-after.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Handset>
    </AbsoluteFill>
  );
}

// ── One text to install: the reception number, then the agent's own ─────────────────────
const RECEPTION: Msg[] = [
  { at: 14, out: true, typed: true, text: 'Set this up for me: ' + URL },
  { at: 70, out: true, note: 'Delivered' },
];
const HELLO: Msg[] = [
  { at: 8, text: "Hi, I'm DailyRecap, your chief of staff. Every weekday evening I'll send you a video of what happened at your company, checked against the sources. Send me your company's website and I'll make your first one, right now." },
  { at: 62, out: true, text: 'yorobot.ai/en' },
  { at: 96, text: 'Got it: YoRobot, green and ink, logo from yorobot.ai. Your recap goes out here at 18:00 on weekdays. Making your first one now, about 15 minutes.' },
];
function Install() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  const swap = t(f, 96, 112);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Side f={f} label="Step one" lines={['One text', 'to install.']} subAt={110} sub={<>Plow gives her agent its own number.<br />It asks for one thing: her website.</>} />
      <Pops msgs={RECEPTION} />
      <Pops msgs={HELLO} offset={110} />
      <Handset rise={rise} light style={{ right: 200 }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-swap * 100}%)` }}>
          <Thread f={f} name="+1 (628) 246-3032" sub="Plow · reception" avatar="plow" msgs={RECEPTION} />
        </div>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - swap) * 100}%)` }}>
          <Thread f={f - 110} name="DailyRecap" sub="your agent's own number" avatar="mark" msgs={HELLO} />
        </div>
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
      <Side f={f} dark={false} label="Fifteen minutes later" lines={['Her first video,', 'made from her', 'website alone.']} />
      <div style={{ position: 'absolute', left: 150, top: 720, display: 'flex', flexWrap: 'wrap', gap: 14, width: 800 }}>
        {['Her name', 'Her logo', 'Her colors', 'What she does'].map((x, i) => {
          const k = spring({ frame: f - (120 + i * 10), fps, config: { damping: 13, stiffness: 190, mass: 0.8 } });
          return <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderRadius: 999, background: C.accent, transform: `scale(${k})`, ...type(32, 600, { color: C.ink }) }}>✓ {x}</span>;
        })}
      </div>
      {[120, 130, 140, 150].map((at) => <Sequence key={at} from={at} durationInFrames={14}><Audio src={staticFile('sfx/ui-select-modern.mp3')} volume={0.22} /></Sequence>)}
      {/* The website lands, then flies into the phone that makes the video from it. */}
      <div style={{ position: 'absolute', right: 150, top: 300, width: 760, borderRadius: 18, overflow: 'hidden', boxShadow: '0 50px 100px -40px rgba(32,41,31,.6), 0 0 0 1px rgba(0,0,0,.08)', opacity: site * (1 - fly), transform: `translateY(${(1 - site) * 200}px) translateX(${fly * 120}px) scale(${1 - 0.6 * fly})` }}>
        <div style={{ height: 40, background: '#eef1ed', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: '#cfd6ce' }} />)}
          <span style={type(18, 500, { color: C.mid, marginLeft: 16 })}>yorobot.ai/en</span>
        </div>
        <Img src={staticFile('demo3/home.png')} style={{ display: 'block', width: '100%' }} />
      </div>
      {f >= 80 && (
        <Handset rise={rise} style={{ right: 260 }}>
          <Sequence from={96} layout="none"><OffthreadVideo src={staticFile('demo3/first-after.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Sequence>
        </Handset>
      )}
    </AbsoluteFill>
  );
}

// ── Right after it, in the same thread: what to connect next (the skill's own words) ─────
const MENU: Msg[] = [
  { at: -60, video: 'demo3/first-after.mp4' },
  { at: 24, text: "Tomorrow's can know more. Pick any:\n· numbers: connect Odoo or a report link\n· team: who I ask every day\n· repos: add your repos\nReply one of those words, or \"later\"." },
  { at: 104, out: true, text: 'team' },
  { at: 132, text: 'Who do I ask every day? For each one: a name, what they do, and a phone number. People or agents, it is the same.' },
];
function Menu() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Side f={f} label="Right after the first video" lines={['Then, connect', 'more.']} subAt={104} sub={<>One word at a time: numbers, team, repos.<br />Or "later".</>} />
      <Pops msgs={MENU} />
      <Handset rise={rise} light style={{ right: 200 }}>
        <Thread f={f} name="DailyRecap" sub="your agent's own number" avatar="mark" msgs={MENU} />
      </Handset>
    </AbsoluteFill>
  );
}

// ── How it runs: the diagram, with the camera going to each half ─────────────────────────
function Plano() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 1360, H = 960;
  const inK = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  const z1 = t(f, 50, 80), z2 = t(f, 140, 170);
  // Enough zoom to read a half, not so much that the side columns (who writes, what goes out) leave the frame.
  const s = 1 + 0.4 * z1;
  const fy = 0.5 + (0.36 - 0.5) * z1 + (0.64 - 0.36) * z2;
  const tags: Array<[string, number, number]> = [['On your own OpenClaw: beside your agents', 80, 140], ['On Plow: one text, a container of its own', 170, 240]];
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: W, height: H, borderRadius: 24, overflow: 'hidden', background: '#fff', boxShadow: '0 50px 100px -40px rgba(32,41,31,.55), 0 0 0 1px rgba(0,0,0,.06)', transform: `translateY(${(1 - inK) * 400}px)` }}>
        <Img src={staticFile('demo3/plano.png')} style={{ width: W, height: H, objectFit: 'contain', transformOrigin: 'center', transform: `translate(0px, ${(0.5 - fy) * H * s}px) scale(${s})` }} />
      </div>
      {tags.map(([label, at, until]) => (
        <div key={label} style={{ position: 'absolute', bottom: 60, padding: '20px 40px', borderRadius: 999, background: C.ink, opacity: t(f, at, at + 12) * (1 - t(f, until, until + 10)), transform: `translateY(${(1 - t(f, at, at + 12)) * 30}px)`, ...type(40, 600, { color: C.light }) }}>{label}</div>
      ))}
      {[80, 170].map((at) => <Sequence key={at} from={at} durationInFrames={20}><Audio src={staticFile('sfx/transition-soft.mp3')} volume={0.3} /></Sequence>)}
    </AbsoluteFill>
  );
}
