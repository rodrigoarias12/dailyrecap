import { AbsoluteFill, staticFile } from 'remotion';
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
  const h = size * 0.24;
  return (
    <div style={{ width: size, position: 'relative', transform: 'perspective(1400px) rotateX(52deg) rotateZ(-18deg)', transformStyle: 'preserve-3d' }}>
      {/* The top face, with the engraving. */}
      <div style={{ width: size, height: size, borderRadius: size * 0.16, background: 'linear-gradient(135deg, #f4f5f4 0%, #d9dcd9 55%, #c3c7c3 100%)', boxShadow: `0 ${h}px 0 #a9ada9, 0 ${h + 40}px 90px rgba(0,0,0,.55)`, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', opacity: 0.55 }}>
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
        <p style={type(24, 600, { color: 'rgba(253,255,252,.55)', marginLeft: 'auto', letterSpacing: '0.16em', textTransform: 'uppercase' })}>{es ? 'Hackathon OpenClaw 2.0' : 'OpenClaw 2.0 hackathon'}</p>
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
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', marginTop: wide ? 0 : -30, marginBottom: wide ? 0 : 40 }}>
          <MacMini size={wide ? 400 : 320} />
        </div>
      </div>
      {!wide && <div style={{ position: 'relative', marginBottom: 40 }}><Steps wide={false} es={es} /></div>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginTop: wide ? 30 : 0 }}>
        <div style={{ padding: '20px 34px', borderRadius: 999, background: C.accent }}>
          <p style={type(34, 600, { color: C.ink })}>{URL}</p>
        </div>
        <p style={type(24, 500, { color: 'rgba(253,255,252,.6)', lineHeight: 1.3 })}>{es ? <>Cierra el 30/9 a las 23:59<br />(hora del Pacífico).</> : <>One text from your iPhone.<br />Standings close Sep 30, 11:59 pm PT.</>}</p>
      </div>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${staticFile('fx/grain.png')})`, opacity: 0.06, mixBlendMode: 'overlay' }} />
    </AbsoluteFill>
  );
}

export const SocialSquare = () => <Card wide={false} />;
export const SocialWide = () => <Card wide />;
export const SocialEs = () => <Card wide={false} es />;
