import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Agenda, Captions, Chips, Closing, Cover, Events, Fonts, Metric, Numbers, Quote, Screen, Title } from './pieces';
import { FPS, frames, sceneStarts, totalFrames, type Script } from './script';
import { palette } from './style';

const BED = 0.3, BED_UNDER_VOICE = 0.1;

/** How much of the music bed stays at frame f: 1 with no voice, lower under a sentence. */
function underVoice(f: number, windows: { from: number; to: number }[]): number {
  let floor = 1;
  for (const v of windows) {
    const k = interpolate(f, [v.from - 10, v.from, v.to, v.to + 16], [1, BED_UNDER_VOICE / BED, BED_UNDER_VOICE / BED, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    floor = Math.min(floor, k);
  }
  return floor;
}

/**
 * The handoff between scenes: the outgoing scene leaves upward with a blur over its last
 * 0.33 s and the incoming one arrives from below over 0.5 s, both eased. The motion is the
 * cut. The first scene has no entrance and the last has no exit.
 */
function Shell({ len, first, last, children }: { len: number; first: boolean; last: boolean; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const inK = first ? 1 : interpolate(f, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const outK = last ? 0 : interpolate(f, [len - 10, len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const y = (1 - inK) * 140 - outK * 140;
  const blur = (1 - inK) * 24 + outK * 24;
  return <AbsoluteFill style={{ transform: `translateY(${y}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>;
}

/** One component for every video: the script decides the scenes, the composition decides the frame. */
export function Video(script: Script) {
  const p = palette(script.brand);
  const starts = sceneStarts(script);
  const total = totalFrames(script);
  const narration = script.narration ?? [];
  const windows = narration.map((n) => ({ from: frames(n.at), to: frames(n.at + n.seconds) }));
  return (
    <AbsoluteFill style={{ background: p.ink }}>
      <Fonts />
      {script.scenes.map((s, i) => {
        const len = frames(s.seconds);
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={len} name={`${i + 1} ${s.type}`}>
            <Shell len={len} first={i === 0} last={i === script.scenes.length - 1}>
            {s.type === 'title' && <Title p={p} label={s.label} phrase={s.text} total={len} />}
            {s.type === 'cover' && <Cover p={p} image={s.image} label={s.label} phrase={s.text} total={len} />}
            {s.type === 'screen' && <Screen p={p} image={s.image} focus={s.focus} zoom={s.zoom} label={s.label} phrase={s.text} total={len} />}
            {s.type === 'chips' && <Chips p={p} label={s.label} items={s.items} total={len} />}
            {s.type === 'numbers' && <Numbers p={p} label={s.label} items={s.items} total={len} />}
            {s.type === 'events' && <Events p={p} label={s.label} items={s.items} total={len} />}
            {s.type === 'metric' && <Metric p={p} label={s.label} value={s.value} delta={s.delta} up={s.up} source={s.source} total={len} />}
            {s.type === 'quote' && <Quote p={p} quote={s.text} who={s.who} total={len} />}
            {s.type === 'agenda' && <Agenda p={p} label={s.label} items={s.items} total={len} />}
            {s.type === 'closing' && <Closing p={p} cta={s.cta} total={len} credit={script.credit !== false} />}
            </Shell>
          </Sequence>
        );
      })}
      {narration.map((n) => (
        <Sequence key={n.file} from={frames(n.at)} layout="none"><Audio src={staticFile(n.file)} /></Sequence>
      ))}
      {(script.captions ?? script.format === 'portrait') && (
        <Captions p={p} lines={narration.filter((n) => n.words?.length).map((n) => ({ at: n.at, words: n.words! }))} />
      )}
      {script.music && (
        <Audio
          src={staticFile(script.music)}
          volume={(f) => BED * underVoice(f, windows) * interpolate(f, [0, FPS, total - 2 * FPS, total], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      )}
    </AbsoluteFill>
  );
}
