import { Composition } from 'remotion';
import { Video } from './Video';
import { CLIP, EXAMPLE, FPS, RECAP, totalFrames, type Script } from './script';

/**
 * Two frames, one component. scripts/render.mjs picks `Landscape` (16:9, the launch video
 * and the internal recap) or `Portrait` (9:16, the public clip) from `script.format`, and
 * passes the script as --props; the duration is computed from the scenes.
 */
export function Root() {
  const metadata = async ({ props }: { props: Script }) => ({ durationInFrames: totalFrames(props) });
  return (
    <>
      <Composition id="Landscape" component={Video} fps={FPS} width={1920} height={1080} durationInFrames={totalFrames(EXAMPLE)} defaultProps={EXAMPLE} calculateMetadata={metadata} />
      <Composition id="Recap" component={Video} fps={FPS} width={1920} height={1080} durationInFrames={totalFrames(RECAP)} defaultProps={RECAP} calculateMetadata={metadata} />
      <Composition id="Portrait" component={Video} fps={FPS} width={1080} height={1920} durationInFrames={totalFrames(CLIP)} defaultProps={CLIP} calculateMetadata={metadata} />
    </>
  );
}
