import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { Agenda, Chips, Closing, Cover, Events, Fonts, Metric, Numbers, Quote, Screen, Title } from './pieces';
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
          </Sequence>
        );
      })}
      {narration.map((n) => (
        <Sequence key={n.file} from={frames(n.at)} layout="none"><Audio src={staticFile(n.file)} /></Sequence>
      ))}
      {script.music && (
        <Audio
          src={staticFile(script.music)}
          volume={(f) => BED * underVoice(f, windows) * interpolate(f, [0, FPS, total - 2 * FPS, total], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      )}
    </AbsoluteFill>
  );
}
