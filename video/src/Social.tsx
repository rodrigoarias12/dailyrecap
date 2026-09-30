import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Fonts } from './pieces';
import { C, Mark, type } from './Promo';

/**
 * The social card: the hackathon's own hook. The first prize includes two engraved Mac minis,
 * one for the builder and one for the winning agent's top user, so the offer is real and
 * conditional: if DailyRecap wins, its top user gets one. Rendered as a still:
 *   npx remotion still src/index.ts SocialSquare out/social-square.png --scale=2
 *   npx remotion still src/index.ts SocialWide out/social-wide.png --scale=2
 * No Apple logo on the drawing, on purpose: it is a small silver box and a word.
 */
const URL = 'aiworthusing.com/agent-index/dailyrecap';

function MacMini({ size }: { size: number }) {
  // A real box in 3D: top, front and right faces, the proportions of the 2024 Mac mini (5 in
  // square, 2 in tall), brushed aluminium, and what its front actually has: two USB-C ports, the
  // headphone jack and the power light. The engraving is on the top.
  const h = Math.round(size * 0.4);
  const alu = 'linear-gradient(135deg, #f5f6f5 0%, #dfe2df 45%, #c9cdc9 100%)';
  const face = (extra: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left: 0, top: 0, backfaceVisibility: 'hidden', ...extra });
  return (
    <div style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', transform: 'perspective(2200px) rotateX(58deg) rotateZ(-32deg)' }}>
      {/* Shadow on the table. */}
      <div style={face({ width: size, height: size, borderRadius: size * 0.1, background: 'rgba(0,0,0,.55)', filter: `blur(${size * 0.08}px)`, transform: `translateZ(${-2}px) translate(${size * 0.06}px, ${size * 0.08}px)` })} />
      {/* Front face (towards the viewer, bottom edge of the top). */}
      <div style={face({ width: size, height: h, top: size, transformOrigin: 'top', transform: `rotateX(-90deg) translateY(${-h}px) translateZ(0)`, background: 'linear-gradient(180deg, #d4d7d4, #b9bdb9)', borderRadius: `0 0 ${size * 0.05}px ${size * 0.05}px`, display: 'flex', alignItems: 'center', gap: size * 0.035, paddingLeft: size * 0.1 })}>
        {[0, 1].map((i) => <span key={i} style={{ width: size * 0.07, height: size * 0.028, borderRadius: 99, background: '#4a4f4a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.6)' }} />)}
        <span style={{ width: size * 0.03, height: size * 0.03, borderRadius: 99, background: '#4a4f4a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.6)', marginLeft: size * 0.01 }} />
        <span style={{ marginLeft: 'auto', marginRight: size * 0.1, width: size * 0.018, height: size * 0.018, borderRadius: 99, background: '#fdfffc', boxShadow: '0 0 6px #fdfffc' }} />
      </div>
      {/* Right face. */}
      <div style={face({ width: h, height: size, left: size, transformOrigin: 'left', transform: 'rotateY(90deg)', background: 'linear-gradient(90deg, #c2c6c2, #a9ada9)' })} />
      {/* Top face, raised by the height, with the engraving. */}
      <div style={face({ width: size, height: size, borderRadius: size * 0.1, background: alu, transform: `translateZ(${h}px)`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.6)', display: 'grid', placeItems: 'center' })}>
        <div style={{ textAlign: 'center', opacity: 0.5 }}>
          <svg viewBox="0 0 24 24" width={size * 0.16} height={size * 0.16}><rect x="1" y="10" width="12" height="4" rx="2" fill="#7d837d" /><circle cx="18" cy="12" r="5" fill="#7d837d" /></svg>
          <p style={type(size * 0.055, 600, { color: '#7d837d', marginTop: size * 0.02, letterSpacing: '0.04em' })}>DailyRecap · top user</p>
        </div>
      </div>
    </div>
  );
}

const STEPS = {
  en: ['Text your website', "Get your company's day as a 30-second video", 'Every weekday at 6 pm, ✓ verified'],
  es: ['Mandá un mensaje desde tu iPhone', 'Pasale el sitio web de tu empresa', 'Recibí el día de tu empresa en 30 segundos'],
};

/** YoRobot's mark as its kit draws it: the three-piece «y» in ink on the rounded green square. */
function YoRobot({ size }: { size: number }) {
  return (
    <svg viewBox="116.16 103.77 847.68 847.68" width={size} height={size} style={{ display: 'block', flex: '0 0 auto' }}>
      <rect x="116.16" y="103.77" width="847.68" height="847.68" rx="164.07" fill={C.accent} />
      <path fill={C.ink} d="M761.24,306.36h0s-221.24,0-221.24,0h-221.24c0,122.19,99.05,221.24,221.24,221.24h-221.24v221.24h0c122.19,0,221.24-99.05,221.24-221.24v221.24h221.24c0-122.19-99.05-221.24-221.24-221.24,122.19,0,221.24-99.05,221.24-221.24Z" />
    </svg>
  );
}

function Steps({ wide, es }: { wide: boolean; es?: boolean }) {
  const steps = STEPS[es ? 'es' : 'en'];
  return (
    <div style={{ display: 'flex', flexDirection: wide ? 'column' : 'column', gap: 14 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ width: 52, height: 52, borderRadius: 99, background: C.accent, display: 'grid', placeItems: 'center', flex: '0 0 auto', ...type(28, 700, { color: C.ink }) }}>{i + 1}</span>
          <span style={type(32, 500, { color: C.light, lineHeight: 1.2 })}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function Card({ wide, es }: { wide: boolean; es?: boolean }) {
  const pad = wide ? 90 : 80;
  return (
    <AbsoluteFill style={{ background: C.ink, padding: pad }}>
      <Fonts />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(${wide ? 900 : 800}px at ${wide ? '78% 45%' : '72% 58%'}, rgba(160,224,153,.20), transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
        <Mark size={54} color={C.accent} />
        <p style={type(40, 600, { color: C.light })}>DailyRecap</p>
        {es ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <p style={type(26, 500, { color: 'rgba(253,255,252,.6)' })}>hecho por</p>
            <YoRobot size={46} />
            <p style={type(34, 600, { color: C.light })}>YoRobot</p>
          </div>
        ) : (
          <p style={type(24, 600, { color: 'rgba(253,255,252,.55)', marginLeft: 'auto', letterSpacing: '0.16em', textTransform: 'uppercase' })}>OpenClaw 2.0 hackathon</p>
        )}
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: wide ? 'row' : 'column', flex: 1, marginTop: wide ? 40 : 50, gap: wide ? 40 : 0 }}>
        <div style={{ flex: wide ? '0 0 58%' : undefined }}>
          {es ? (
            <>
              <p style={type(112, 600, { color: C.light, lineHeight: 1.1, letterSpacing: '-0.04em' })}>
                ¿Querés ganarte una{' '}
                <span style={{ background: C.accent, color: C.ink, borderRadius: 20, padding: '0 18px', whiteSpace: 'nowrap' }}>Mac mini?</span>
              </p>
              <p style={type(40, 500, { color: 'rgba(253,255,252,.8)', lineHeight: 1.3, marginTop: 28 })}>Si DailyRecap gana el hackathon, su usuario más activo se lleva una, grabada.</p>
            </>
          ) : (
            <p style={type(wide ? 76 : 96, 600, { color: C.light, lineHeight: wide ? 1.24 : 1.1, letterSpacing: '-0.035em' })}>
              Try it. If we win, our top user takes home an engraved{' '}
              <span style={{ background: C.accent, color: C.ink, borderRadius: 18, padding: '0 16px', whiteSpace: 'nowrap' }}>Mac mini.</span>
            </p>
          )}
          {wide && <div style={{ marginTop: 44 }}><Steps wide /></div>}
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', marginTop: wide ? 0 : 20, marginBottom: wide ? 0 : 30 }}>
          {/* The prize itself: "Apple Mac Mini M4" by LoMit, Wikimedia Commons, CC0. */}
          <Img src={staticFile('social/mac-mini.svg')} style={{ width: wide ? 560 : 600, filter: 'drop-shadow(0 40px 60px rgba(0,0,0,.45))' }} />
        </div>
      </div>
      {!wide && <div style={{ position: 'relative', marginBottom: 40 }}><Steps wide={false} es={es} /></div>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginTop: wide ? 30 : 0 }}>
        <div style={{ padding: '20px 34px', borderRadius: 999, background: C.accent }}>
          <p style={type(34, 600, { color: C.ink })}>{URL}</p>
        </div>
        <p style={type(24, 500, { color: 'rgba(253,255,252,.6)', lineHeight: 1.3 })}>{es ? <>Hackathon OpenClaw 2.0 · cierra el 30/9<br />a las 23:59 (hora del Pacífico) · yorobot.ai</> : <>One text from your iPhone.<br />Standings close Sep 30, 11:59 pm PT.</>}</p>
      </div>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${staticFile('fx/grain.png')})`, opacity: 0.06, mixBlendMode: 'overlay' }} />
    </AbsoluteFill>
  );
}

export const SocialSquare = () => <Card wide={false} />;
export const SocialWide = () => <Card wide />;
export const SocialEs = () => <Card wide={false} es />;
