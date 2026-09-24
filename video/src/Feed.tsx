import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS, frames, type Brand } from './script';
import { T, text, palette } from './style';

/**
 * A phone in a feed: the vertical clip playing inside a device frame, with the furniture
 * a short-video app puts around it (rail of actions on the right, handle and caption at the
 * bottom, a progress line). Generic, not any one app's assets. The phone arrives with a
 * spring and a slight 3D tilt, over a blurred copy of the clip and the brand's glows.
 */
export type FeedProps = {
  brand: Brand;
  /** Path under public/ to the vertical clip. */
  clip: string;
  /** Where in the clip to start, in seconds. */
  from: number;
  /** How long to show, in seconds. */
  seconds: number;
  handle: string;
  caption: string;
  music?: string;
};

export const FEED_EXAMPLE: FeedProps = {
  brand: { name: 'PayDece', url: 'yorobot.ai', accent: '#a0e099', ink: '#20291f', bg: '#f8faf7', logo: 'brand/dailyrecap-logo.png' },
  clip: 'demo/clip.mp4', from: 0, seconds: 8, handle: '@paydece', caption: 'Day 47 building in public · today, in one minute', music: 'DailyRecap · original bed',
};

export const feedFrames = (p: FeedProps) => frames(p.seconds);

function Icon({ d, size = 46 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="#fdfffc" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))' }}><path d={d} /></svg>;
}
const HEART = 'M12 21s-7.5-4.6-9.5-9.2C1.1 8.4 3.3 5 6.8 5c1.9 0 3.5 1 4.2 2.4C11.7 6 13.3 5 15.2 5c3.5 0 5.7 3.4 4.3 6.8C19.5 16.4 12 21 12 21z';
const COMMENT = 'M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z';
const BOOKMARK = 'M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z';
const SHARE = 'M14 5l7 6-7 6v-4c-5 0-8 1.5-11 5 1-5 4-9 11-10V5z';

export function Feed(p: FeedProps) {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c = palette(p.brand);
  const pop = spring({ frame: f, fps, config: { damping: 16, stiffness: 90, mass: 0.9 } });
  const tilt = (1 - pop) * 14;
  const phoneH = Math.round(height * 0.9), phoneW = Math.round(phoneH * 9 / 19.5);
  const bezel = 14, radius = 58;
  const progress = interpolate(f, [0, frames(p.seconds)], [0, 1]);
  const t = f / FPS;
  const x1 = 0.72 + 0.06 * Math.sin(t * 0.4), y1 = 0.3 + 0.08 * Math.cos(t * 0.3);
  return (
    <AbsoluteFill style={{ background: c.ink, alignItems: 'center', justifyContent: 'center', perspective: 2200 }}>
      {/* The clip itself, blurred and dimmed, is the room the phone sits in. */}
      <OffthreadVideo src={staticFile(p.clip)} startFrom={frames(p.from)} muted style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.45) saturate(1.2)', transform: 'scale(1.15)' }} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(${width * 0.5}px at ${x1 * 100}% ${y1 * 100}%, ${c.accent}33, transparent 70%)` }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${staticFile('fx/grain.png')})`, backgroundSize: '512px 512px', opacity: 0.12, mixBlendMode: 'overlay' }} />

      {/* The device. */}
      <div style={{ width: phoneW, height: phoneH, borderRadius: radius, background: '#0b0f0b', padding: bezel, boxShadow: '0 60px 140px -30px rgba(0,0,0,.8), 0 0 0 2px rgba(255,255,255,.08), inset 0 0 0 2px rgba(255,255,255,.05)', transform: `scale(${0.86 + 0.14 * pop}) rotateY(${-tilt}deg) rotateX(${tilt * 0.35}deg)`, opacity: pop, position: 'relative' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: radius - bezel, overflow: 'hidden', background: '#000' }}>
          <OffthreadVideo src={staticFile(p.clip)} startFrom={frames(p.from)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Dynamic island. */}
          <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: phoneW * 0.32, height: 34, borderRadius: 20, background: '#000' }} />
          {/* Top tabs. */}
          <div style={{ position: 'absolute', top: 68, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 34 }}>
            <span style={text(T.bodySm, { color: 'rgba(253,255,252,.6)', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,.6)' })}>Following</span>
            <span style={text(T.bodySm, { color: '#fdfffc', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,.6)', borderBottom: '3px solid #fdfffc', paddingBottom: 4 })}>For You</span>
          </div>
          {/* Right rail. */}
          <div style={{ position: 'absolute', right: 18, bottom: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
            <div style={{ width: 66, height: 66, borderRadius: 99, background: '#fdfffc', display: 'grid', placeItems: 'center', border: '2px solid #fdfffc', boxShadow: '0 4px 12px rgba(0,0,0,.5)', position: 'relative' }}>
              {p.brand.logo ? <Img src={staticFile(p.brand.logo)} style={{ width: 46, height: 46 }} /> : <span style={text(T.title, { color: c.ink })}>{p.brand.name.slice(0, 1)}</span>}
              <span style={{ position: 'absolute', bottom: -12, width: 26, height: 26, borderRadius: 99, background: c.accent, color: c.ink, fontSize: 20, fontWeight: 700, display: 'grid', placeItems: 'center', fontFamily: 'Rethink Sans' }}>+</span>
            </div>
            {[[HEART, '12.4K'], [COMMENT, '318'], [BOOKMARK, '1,024'], [SHARE, '842']].map(([d, n]) => (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Icon d={d} />
                <span style={text(T.label, { color: '#fdfffc', fontSize: 16, letterSpacing: 0, textTransform: 'none', textShadow: '0 1px 4px rgba(0,0,0,.6)' })}>{n}</span>
              </div>
            ))}
          </div>
          {/* Handle, caption, music. */}
          <div style={{ position: 'absolute', left: 22, right: 120, bottom: 64, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={text(T.title, { color: '#fdfffc', fontSize: 28, fontWeight: 700, textShadow: '0 1px 6px rgba(0,0,0,.7)' })}>{p.handle}</span>
            <span style={text(T.bodySm, { color: '#fdfffc', fontSize: 22, lineHeight: 1.3, textShadow: '0 1px 6px rgba(0,0,0,.7)' })}>{p.caption}</span>
            {p.music && <span style={text(T.bodySm, { color: 'rgba(253,255,252,.85)', fontSize: 19, textShadow: '0 1px 6px rgba(0,0,0,.7)' })}>♪ {p.music}</span>}
          </div>
          {/* Progress line. */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, background: 'rgba(255,255,255,.18)' }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', background: c.accent }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
