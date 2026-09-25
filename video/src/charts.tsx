import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, text, type Palette } from './style';
import { Appear, enter, leave, Backdrop, Label, useLayout, countUp } from './pieces';

/**
 * A metric with its chart: the number that moved on the left, the shape of how it moved on
 * the right. One series per chart (so no legend), the accent as the only mark color, text in
 * ink, thin marks with rounded data-ends, a recessive grid, and one direct label where the
 * eye lands (the last point, or the biggest bar). The mark draws itself in over the first
 * second; the number counts up beside it.
 *
 * `line`   change over time (weeks, days): a 2px-scale stroke with a soft area below.
 * `bars`   magnitude by category (or by period): thin bars growing from the baseline.
 * `funnel` a sequence of steps that lose people: horizontal bars, each with its share of the first.
 */
export type ChartKind = 'line' | 'bars' | 'funnel';
export type Point = { x: string; y: number };
export type ChartProps = { p: Palette; kind: ChartKind; label: string; value?: string; delta?: string; up?: boolean; unit?: string; series: Point[]; source: string; total: number };

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const fmt = (n: number, unit?: string) => (unit === '%' ? `${Math.round(n)}%` : unit === 'min' ? `${n} min` : n >= 1000 ? n.toLocaleString('en-US') : String(n));

export function Chart({ p, kind, label, value, delta, up, unit, series, source, total }: ChartProps) {
  const f = useCurrentFrame();
  const { pad, portrait, width, height } = useLayout();
  const hero = value ?? fmt(series[series.length - 1]?.y ?? 0, unit);
  const chartW = portrait ? width - 2 * pad : Math.round(width * 0.54);
  const chartH = portrait ? Math.round(height * 0.34) : Math.round(height * 0.5);
  return (
    <AbsoluteFill style={{ background: p.ink, padding: `0 ${pad}px`, justifyContent: 'center', opacity: leave(f, total) }}>
      <Audio src={staticFile('sfx/transition-soft.mp3')} volume={0.2} />
      <Backdrop p={p} total={total} />
      <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: portrait ? 'flex-start' : 'center', gap: portrait ? 36 : 64, position: 'relative' }}>
        <div style={{ flex: '0 0 auto', minWidth: portrait ? undefined : Math.round(width * 0.3) }}>
          <Label p={p} style={{ marginBottom: 22 }}>{label}</Label>
          <Appear from={6} travel={24}>
            <p style={text(T.displayXl, { color: p.light, fontSize: portrait ? 150 : 170, lineHeight: 1, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' })}>{countUp(hero, f, 6, 40)}</p>
          </Appear>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
            {delta && (
              <Appear from={44} travel={10}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 22px', borderRadius: 999, background: up === false ? 'rgba(253,255,252,0.1)' : p.accent, ...text(T.title, { color: up === false ? '#ffb4a8' : p.ink, fontSize: 28 }) }}>
                  {up === undefined ? '' : up ? '▲' : '▼'} {delta}
                </span>
              </Appear>
            )}
          </div>
          <Appear from={52} travel={8} style={{ marginTop: 22 }}><span style={text(T.bodySm, { color: p.lightMid })}>{source}</span></Appear>
        </div>
        <div style={{ width: chartW, height: chartH, position: 'relative', opacity: enter(f, 4, 10) }}>
          {kind === 'line' && <Line p={p} series={series} unit={unit} w={chartW} h={chartH} f={f} />}
          {kind === 'bars' && <Bars p={p} series={series} unit={unit} w={chartW} h={chartH} f={f} />}
          {kind === 'funnel' && <Funnel p={p} series={series} unit={unit} w={chartW} h={chartH} f={f} />}
        </div>
      </div>
    </AbsoluteFill>
  );
}

const AX = { left: 16, right: 60, top: 40, bottom: 56 }; // room for the last-point label and the x labels

function Grid({ p, w, h, ticks }: { p: Palette; w: number; h: number; ticks: number[] }) {
  // Three recessive lines and their values, in muted ink: they orient, they do not compete.
  return (
    <>
      {ticks.map((y) => (
        <g key={y}>
          <line x1={AX.left} x2={w - AX.right} y1={y} y2={y} stroke={p.light} strokeOpacity={0.12} strokeWidth={2} />
        </g>
      ))}
    </>
  );
}

function scale(series: Point[], w: number, h: number) {
  const ys = series.map((s) => s.y);
  const max = Math.max(...ys, 1), min = 0;
  const x = (i: number) => AX.left + (i / Math.max(1, series.length - 1)) * (w - AX.left - AX.right);
  const y = (v: number) => AX.top + (1 - (v - min) / (max - min)) * (h - AX.top - AX.bottom);
  return { x, y, max };
}

function XLabels({ p, series, w, h, f, x }: { p: Palette; series: Point[]; w: number; h: number; f: number; x: (i: number) => number }) {
  const every = series.length > 8 ? Math.ceil(series.length / 6) : 1;
  return (
    <>
      {series.map((s, i) => (i % every === 0 || i === series.length - 1) && (
        <text key={s.x} x={x(i)} y={h - 14} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'} fill={p.light} fillOpacity={0.55 * enter(f, 10 + i * 2, 8)} style={{ ...text(T.bodySm, { fontSize: 22 }) } as any}>{s.x}</text>
      ))}
    </>
  );
}

function Line({ p, series, unit, w, h, f }: { p: Palette; series: Point[]; unit?: string; w: number; h: number; f: number }) {
  const { x, y, max } = scale(series, w, h);
  const pts = series.map((s, i) => [x(i), y(s.y)] as const);
  // A smooth path through the points (Catmull-Rom to cubic Bézier), drawn in with stroke-dashoffset.
  const d = pts.map(([px, py], i) => {
    if (i === 0) return `M${px},${py}`;
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const [xa, ya] = pts[i - 2] ?? pts[i - 1], [xb, yb] = pts[i + 1] ?? pts[i];
    const c1x = x0 + (x1 - xa) / 6, c1y = y0 + (y1 - ya) / 6, c2x = x1 - (xb - x0) / 6, c2y = y1 - (yb - y0) / 6;
    return `C${c1x},${c1y} ${c2x},${c2y} ${x1},${y1}`;
  }).join(' ');
  const len = 4000;
  const drawn = interpolate(f, [8, 44], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const last = pts[pts.length - 1];
  const base = y(0);
  const ticks = [0.5, 1].map((k) => y(max * k));
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={p.accent} stopOpacity={0.28} /><stop offset="1" stopColor={p.accent} stopOpacity={0} /></linearGradient>
        <clipPath id="reveal"><rect x={0} y={0} width={AX.left + (w - AX.left - AX.right) * drawn + 8} height={h} /></clipPath>
      </defs>
      <Grid p={p} w={w} h={h} ticks={ticks} />
      <line x1={AX.left} x2={w - AX.right} y1={base} y2={base} stroke={p.light} strokeOpacity={0.3} strokeWidth={2} />
      <g clipPath="url(#reveal)">
        <path d={`${d} L${last[0]},${base} L${pts[0][0]},${base} Z`} fill="url(#area)" />
        <path d={d} fill="none" stroke={p.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - drawn)} />
      </g>
      {/* The last point, ringed in the surface color so it sits on the line, and its value: the one direct label. */}
      <g opacity={enter(f, 40, 10)}>
        <circle cx={last[0]} cy={last[1]} r={14} fill={p.ink} />
        <circle cx={last[0]} cy={last[1]} r={9} fill={p.accent} />
        <text x={last[0] + 22} y={last[1] + 10} fill={p.light} style={text(T.title, { fontSize: 30, fontWeight: 700 }) as any}>{fmt(series[series.length - 1].y, unit)}</text>
      </g>
      <XLabels p={p} series={series} w={w} h={h} f={f} x={x} />
    </svg>
  );
}

function Bars({ p, series, unit, w, h, f }: { p: Palette; series: Point[]; unit?: string; w: number; h: number; f: number }) {
  const n = series.length;
  const max = Math.max(...series.map((s) => s.y), 1);
  const inner = w - AX.left - AX.right + 40;
  const slot = inner / n, bw = Math.min(slot * 0.58, 110);
  const base = h - AX.bottom, top = AX.top;
  const y = (v: number) => base - (v / max) * (base - top);
  const iMax = series.findIndex((s) => s.y === max);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <Grid p={p} w={w} h={h} ticks={[y(max / 2), y(max)]} />
      <line x1={AX.left} x2={w - AX.right + 40} y1={base} y2={base} stroke={p.light} strokeOpacity={0.3} strokeWidth={2} />
      {series.map((s, i) => {
        const g = interpolate(f, [8 + i * 3, 30 + i * 3], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const hh = (base - y(s.y)) * g;
        const cx = AX.left + slot * i + slot / 2;
        const isLast = i === n - 1, lit = isLast || i === iMax;
        return (
          <g key={s.x}>
            {/* Rounded only at the data end; the baseline end stays square. */}
            <path d={`M${cx - bw / 2},${base} v${-Math.max(0, hh - 8)} a8,8 0 0 1 8,-8 h${bw - 16} a8,8 0 0 1 8,8 v${Math.max(0, hh - 8)} z`} fill={p.accent} fillOpacity={lit ? 1 : 0.55} />
            {lit && <text x={cx} y={base - hh - 16} textAnchor="middle" fill={p.light} fillOpacity={enter(f, 30 + i * 3, 8)} style={text(T.title, { fontSize: 28, fontWeight: 700 }) as any}>{fmt(s.y, unit)}</text>}
            <text x={cx} y={h - 14} textAnchor="middle" fill={p.light} fillOpacity={0.55 * enter(f, 10 + i * 2, 8)} style={text(T.bodySm, { fontSize: 22 }) as any}>{s.x}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Funnel({ p, series, unit, w, h, f }: { p: Palette; series: Point[]; unit?: string; w: number; h: number; f: number }) {
  const n = series.length;
  const first = Math.max(series[0]?.y ?? 1, 1);
  const rowH = Math.min(72, (h - 20) / n), gap = 16;
  const labelW = Math.round(w * 0.3), barMax = w - labelW - 120;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {series.map((s, i) => {
        const g = interpolate(f, [8 + i * 6, 32 + i * 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const share = s.y / first;
        const bw = Math.max(8, barMax * share * g);
        const yy = 10 + i * (rowH + gap);
        return (
          <g key={s.x} opacity={enter(f, 6 + i * 6, 8)}>
            <text x={0} y={yy + rowH / 2 + 9} fill={p.light} style={text(T.body, { fontSize: 26, fontWeight: 500 }) as any}>{s.x}</text>
            <path d={`M${labelW},${yy} h${Math.max(0, bw - 8)} a8,8 0 0 1 8,8 v${rowH - 16} a8,8 0 0 1 -8,8 h${-Math.max(0, bw - 8)} z`} fill={p.accent} fillOpacity={i === 0 ? 1 : 0.55 + 0.45 * share} />
            <text x={labelW + bw + 18} y={yy + rowH / 2 + 10} fill={p.light} style={text(T.title, { fontSize: 28, fontWeight: 700 }) as any}>{fmt(s.y, unit)}<tspan fill={p.light} fillOpacity={0.55} style={text(T.bodySm, { fontSize: 22, fontWeight: 400 }) as any}>{i > 0 ? `  ${Math.round(share * 100)}%` : ''}</tspan></text>
          </g>
        );
      })}
    </svg>
  );
}
