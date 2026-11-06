/** Line-and-area chart as plain SVG (no chart library). Each point has a hover tooltip; the highest one is labelled. */
export default function AreaChart({ data, format, label }: { data: { label: string; value: number }[]; format: (v: number) => string; label: string }) {
  const W = 600, H = 230, L = 56, R = 12, T = 14, B = 26;
  const max = Math.max(...data.map((d) => d.value), 0);
  const step = max <= 0 ? 1 : 10 ** Math.floor(Math.log10(max)) * ([1, 2, 2.5, 5, 10].find((m) => m * 10 ** Math.floor(Math.log10(max)) * 4 >= max) ?? 10);
  const top = step * 4;
  const x = (i: number) => L + (data.length < 2 ? (W - L - R) / 2 : (i / (data.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  const peak = max > 0 ? data.findIndex((d) => d.value === max) : -1;
  const ticks = data.length <= 5 ? data.map((_, i) => i) : [0, 1, 2, 3, 4].map((k) => Math.round((k / 4) * (data.length - 1)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto">
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line x1={L} x2={W - R} y1={y(step * k)} y2={y(step * k)} stroke="var(--line)" strokeDasharray={k ? "3 4" : undefined} />
          <text x={L - 8} y={y(step * k) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{format(step * k)}</text>
        </g>
      ))}
      {data.length > 0 && <path d={`${line} L${x(data.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`} fill="var(--brand-text)" opacity="0.14" />}
      <path d={line} fill="none" stroke="var(--brand-text)" strokeWidth="2" strokeLinejoin="round" />
      {ticks.map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{data[i]?.label}</text>)}
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={data.length > 40 ? 5 : 7} fill="transparent" stroke="none"><title>{`${d.label}: ${format(d.value)}`}</title></circle>
      ))}
      {peak >= 0 && (
        <g>
          <circle cx={x(peak)} cy={y(max)} r="4" fill="var(--brand-text)" />
          <text x={Math.min(Math.max(x(peak), L + 40), W - R - 40)} y={Math.max(y(max) - 9, 11)} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--fg)">{format(max)} · {data[peak].label}</text>
        </g>
      )}
    </svg>
  );
}
