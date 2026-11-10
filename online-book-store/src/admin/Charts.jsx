import { useState } from "react";

// Rounds the axis maximum up to a friendly number (1, 2, 2.5, 5 x 10^n)
function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find(s => s * power >= value);
  return step * power;
}

// Vertical bar chart for a single series (e.g. revenue per day).
// rows: [{ key, label, value, detail }]
export function BarChart({ rows, format = String, ariaLabel }) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(...rows.map(r => r.value), 0));
  const ticks = [max, max / 2, 0];
  const labelEvery = rows.length > 8 ? 2 : 1;

  return (
    <div className="chart">
      <div className="chart-plot" role="img" aria-label={ariaLabel}>
        <div className="chart-axis" aria-hidden="true">
          {ticks.map(t => <span key={t}>{format(t)}</span>)}
        </div>
        <div className="chart-area" onMouseLeave={() => setActive(null)}>
          {ticks.map((t, i) => (
            <span key={t} className="chart-grid" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
          ))}
          {rows.map((row, i) => (
            <button
              type="button"
              key={row.key}
              className={active === i ? "chart-col active" : "chart-col"}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${row.label}: ${format(row.value)}${row.detail ? `, ${row.detail}` : ""}`}
            >
              <span className="chart-bar" style={{ height: `${(row.value / max) * 100}%` }} />
              {active === i && (
                <span className={`chart-tip ${i > rows.length / 2 ? "left" : ""}`} role="tooltip">
                  <b>{format(row.value)}</b>
                  <small>{row.label}{row.detail ? ` · ${row.detail}` : ""}</small>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-labels" aria-hidden="true">
        {rows.map((row, i) => (
          <span key={row.key}>{i % labelEvery === 0 || i === rows.length - 1 ? row.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

// Horizontal bars with the label and value written next to each bar.
// rows: [{ key, label, value, display? }]
export function BarList({ rows, format = String, empty = "No data yet" }) {
  const max = Math.max(...rows.map(r => r.value), 0);
  if (!rows.length || max === 0) return <p className="admin-muted chart-empty">{empty}</p>;

  return (
    <ul className="bar-list">
      {rows.map(row => (
        <li key={row.key} title={`${row.label}: ${format(row.value)}`}>
          <div className="bar-list-text">
            <span>{row.label}</span>
            <b>{row.display ?? format(row.value)}</b>
          </div>
          <div className="bar-list-track">
            <span style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
