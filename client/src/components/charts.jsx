import { useEffect, useRef, useState } from "react";

// Small, dependency-free charts. Every chart here is a single series in one
// validated hue (--chart-1), so no legend is needed: the card title names it.
// Each chart has a hover/focus tooltip and a "Show table" alternative so the
// numbers are never available only as colour or shape.

const niceMax = (v) => {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const parseDay = (d) => new Date(`${d}T12:00:00`);

// Vertical bars over time, e.g. registrations per day: data = [{ date, count }]
export function TimeBarChart({ data, valueLabel = "registrations", title }) {
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  // Draw at the container's real pixel width so text stays 11px at any size.
  const [W, setW] = useState(480);
  const boxRef = useRef(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [showTable]);
  const H = 200;
  const pad = { l: 30, r: 6, t: 10, b: 22 };
  const max = niceMax(Math.max(0, ...data.map((d) => d.count)));
  const band = (W - pad.l - pad.r) / data.length;
  const barW = Math.max(2, Math.min(18, band - 2)); // >= 2px gap between bars
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const total = data.reduce((s, d) => s + d.count, 0);
  // Roughly one date label per 70px so labels never collide.
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor((W - pad.l) / 70))));

  // Bar with a 4px rounded top, square at the baseline.
  const barPath = (x, top, bottom, w) => {
    const h = bottom - top;
    if (h <= 0) return "";
    const r = Math.min(4, w / 2, h);
    return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${bottom} Z`;
  };

  return (
    <div className="bar-chart">
      <div className="chart-card-head">
        <span className="chart-sub">{total} {valueLabel} in the last {data.length} days</span>
        <button type="button" className="btn btn-ghost btn-sm chart-toggle" onClick={() => setShowTable((s) => !s)}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>
      {showTable ? (
        <div className="table-wrapper scrollable-table">
          <table className="data-table">
            <caption className="sr-only">{title}</caption>
            <thead><tr><th scope="col">Date</th><th scope="col" className="num">{valueLabel}</th></tr></thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date}><td>{longDate.format(parseDay(d.date))}</td><td className="num">{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={boxRef} style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${title}: ${total} ${valueLabel} in the last ${data.length} days`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
                <text className="axis-label" x={pad.l - 6} y={y(t) + 3} textAnchor="end">{t}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = pad.l + i * band + (band - barW) / 2;
              return (
                <g key={d.date}>
                  <path className={`bar ${active === i ? "is-active" : ""}`} d={barPath(x, y(d.count), y(0), barW)} />
                  {/* Hit target is the whole column, larger than the bar.
                      Keyboard and screen-reader users get the same numbers
                      from "Show table" instead of 30 extra tab stops. */}
                  <rect
                    className="hit"
                    x={pad.l + i * band}
                    y={pad.t}
                    width={band}
                    height={H - pad.t - pad.b}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                  />
                  {i % labelEvery === 0 && (
                    <text className="axis-label" x={pad.l + i * band + band / 2} y={H - 6} textAnchor="middle">
                      {shortDate.format(parseDay(d.date))}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {active !== null && (
            <div
              className="chart-tooltip"
              style={{
                left: `${((pad.l + active * band + band / 2) / W) * 100}%`,
                top: `${(y(data[active].count) / H) * 100}%`,
              }}
            >
              <strong>{data[active].count}</strong> {valueLabel} · {longDate.format(parseDay(data[active].date))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Horizontal bars with direct value labels: items = [{ label, value }]
export function HBarList({ items, format = (v) => v, emptyText = "No data yet." }) {
  if (!items.length) return <p className="muted">{emptyText}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="hbar-list">
      {items.map((item) => (
        <li key={item.label} className="hbar-row" title={`${item.label}: ${format(item.value)}`}>
          <span className="hbar-label">{item.label}</span>
          <span className="hbar-track" aria-hidden="true">
            <span className="hbar-fill" style={{ display: "block", width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="hbar-value">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// Inline percentage meter for tables.
export function Meter({ value, label }) {
  if (value === null || value === undefined) return <span className="muted">n/a</span>;
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="meter" title={label ? `${label}: ${value}%` : `${value}%`}>
      <span className="meter-track" aria-hidden="true"><span className="meter-fill" style={{ display: "block", width: `${v}%` }} /></span>
      <span className="meter-value">{value}%</span>
    </span>
  );
}
