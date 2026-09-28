import { useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Wallet, TrendingUp, Receipt, ClipboardCheck, BarChart3 } from "lucide-react";
import { currency, currencyShort, profitOf, MONTHS, MONTHS_LONG } from "../utils.js";
import { EmptyState } from "./ui.jsx";

export default function Dashboard({ jobs }) {
  const [range, setRange] = useState(12); // meses a mostrar

  const monthly = useMemo(() => buildMonthly(jobs, range), [jobs, range]);
  const totals = useMemo(() => {
    const ingresos = jobs.reduce((s, j) => s + (Number(j.costo) || 0), 0);
    const inversion = jobs.reduce((s, j) => s + (Number(j.inversion) || 0), 0);
    return { ingresos, inversion, ganancia: ingresos - inversion, trabajos: jobs.length };
  }, [jobs]);

  const thisMonth = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];
  const monthDelta = prevMonth && prevMonth.ganancia !== 0
    ? ((thisMonth.ganancia - prevMonth.ganancia) / Math.abs(prevMonth.ganancia)) * 100
    : null;

  const topReparaciones = useMemo(() => rankBy(jobs, "tipoReparacion"), [jobs]);
  const topMarcas = useMemo(() => rankBy(jobs, "marca"), [jobs]);

  if (jobs.length === 0) {
    return (
      <div>
        <div className="page-title" style={{ marginBottom: 4 }}>Ganancias</div>
        <div className="page-sub" style={{ marginBottom: 20 }}>Todavía no hay datos suficientes.</div>
        <EmptyState icon={BarChart3} title="Sin trabajos registrados" sub="Registra tu primer trabajo para ver aquí el dashboard de ganancias." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div className="page-title">Ganancias del negocio</div>
          <div className="page-sub">Resumen general y por mes, calculado sobre todos los trabajos registrados.</div>
        </div>
        <div className="seg">
          {[6, 12, 24].map((n) => (
            <button key={n} className={range === n ? "active" : ""} onClick={() => setRange(n)}>{n} meses</button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <StatTile icon={Wallet} label="Ingresos totales" value={currency(totals.ingresos)} />
        <StatTile icon={Receipt} label="Invertido en repuestos" value={currency(totals.inversion)} />
        <StatTile
          icon={TrendingUp} label="Ganancia total" value={currency(totals.ganancia)}
          delta={monthDelta}
          deltaLabel={monthDelta === null ? null : `vs. mes anterior`}
        />
        <StatTile icon={ClipboardCheck} label="Trabajos registrados" value={totals.trabajos} />
      </div>

      <div className="card chart-card">
        <div className="chart-head">
          <div className="section-title" style={{ marginBottom: 0 }}>Ganancia por mes</div>
          <div className="legend-row">
            <LegendItem color="var(--chart-1)" label="Ingresos" />
            <LegendItem color="var(--chart-2)" label="Inversión" />
            <LegendItem color="var(--chart-3)" label="Ganancia" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthly} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barCategoryGap={22}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--chart-muted)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
            <YAxis tickFormatter={currencyShort} tick={{ fontSize: 12, fill: "var(--chart-muted)" }} axisLine={false} tickLine={false} width={58} />
            <Tooltip content={<MonthTooltip />} cursor={{ fill: "rgba(137,135,129,0.08)" }} />
            <Bar dataKey="ingresos" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="inversion" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Line dataKey="ganancia" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-3)", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="two-col">
        <div className="card chart-card">
          <div className="section-title">Trabajos por mes</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--chart-muted)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--chart-muted)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                cursor={{ fill: "rgba(137,135,129,0.08)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="chart-tooltip">
                      <div className="tt-title">{label}</div>
                      <div className="tt-row"><span className="tt-dot" style={{ background: "var(--chart-1)" }} />{payload[0].value} trabajos</div>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                {monthly.map((m, i) => <Cell key={i} fill="var(--chart-1)" />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="section-title">Reparaciones más frecuentes</div>
          {topReparaciones.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Sin datos.</div>
          ) : (
            topReparaciones.map((r) => (
              <div className="rank-row" key={r.name}>
                <span className="name">{r.name}</span>
                <span className="count">{r.count}</span>
              </div>
            ))
          )}

          <div className="section-title" style={{ marginTop: 20 }}>Marcas más atendidas</div>
          {topMarcas.map((r) => (
            <div className="rank-row" key={r.name}>
              <span className="name">{r.name}</span>
              <span className="count">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, delta, deltaLabel }) {
  const deltaClass = delta === null || delta === undefined ? null : delta > 0.5 ? "pos" : delta < -0.5 ? "neg" : "flat";
  return (
    <div className="card stat-tile">
      <div className="label"><Icon size={14} /> {label}</div>
      <div className="value">{value}</div>
      {deltaClass && (
        <div className={"delta " + deltaClass}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta).toFixed(0)}% {deltaLabel}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <span className="legend-item">
      <span className="legend-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

function MonthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{label}</div>
      <div className="tt-row"><span className="tt-dot" style={{ background: "var(--chart-1)" }} /> Ingresos: {currency(byKey.ingresos)}</div>
      <div className="tt-row"><span className="tt-dot" style={{ background: "var(--chart-2)" }} /> Inversión: {currency(byKey.inversion)}</div>
      <div className="tt-row"><span className="tt-dot" style={{ background: "var(--chart-3)" }} /> Ganancia: {currency(byKey.ganancia)}</div>
    </div>
  );
}

function buildMonthly(jobs, count) {
  const now = new Date();
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      ingresos: 0, inversion: 0, ganancia: 0, cantidad: 0,
    });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  for (const job of jobs) {
    const key = (job.fecha || "").slice(0, 7);
    const bucket = byKey[key];
    if (!bucket) continue;
    bucket.ingresos += Number(job.costo) || 0;
    bucket.inversion += Number(job.inversion) || 0;
    bucket.ganancia += profitOf(job);
    bucket.cantidad += 1;
  }
  return buckets;
}

function rankBy(jobs, field) {
  const counts = new Map();
  for (const j of jobs) {
    const v = j[field] || "—";
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
