import { useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Wallet, TrendingUp, Receipt, ClipboardCheck, BarChart3 } from "lucide-react";
import { currency, currencyShort, profitOf, MONTHS } from "../utils.js";
import { EmptyState } from "./ui.jsx";

const PERIODS = [
  { id: "dia", label: "Día", unit: "hour", spanDays: 1 },
  { id: "semana", label: "Semana", unit: "day", count: 7, spanDays: 7 },
  { id: "mes", label: "Mes", unit: "day", count: 30, spanDays: 30 },
  { id: "3m", label: "3 meses", unit: "week", count: 13, spanDays: 91 },
  { id: "6m", label: "6 meses", unit: "month", count: 6, spanDays: 182 },
  { id: "1a", label: "1 año", unit: "month", count: 12, spanDays: 365 },
];

export default function Dashboard({ jobs }) {
  const [periodId, setPeriodId] = useState("mes");
  const period = PERIODS.find((p) => p.id === periodId);

  const daily = useMemo(() => dailyTotals(jobs), [jobs]);

  const buckets = useMemo(() => {
    if (period.unit === "hour") return buildHourBuckets(jobs);
    if (period.unit === "day") return buildDayBuckets(daily, period.count);
    if (period.unit === "week") return buildWeekBuckets(daily, period.count);
    return buildMonthly(jobs, period.count);
  }, [jobs, daily, period]);

  const current = useMemo(() => sumRangeDays(daily, 0, period.spanDays - 1), [daily, period]);
  const previous = useMemo(() => sumRangeDays(daily, period.spanDays, period.spanDays * 2 - 1), [daily, period]);
  const delta = previous.ganancia !== 0 ? ((current.ganancia - previous.ganancia) / Math.abs(previous.ganancia)) * 100 : null;

  const periodJobs = useMemo(() => jobsInRange(jobs, period.spanDays), [jobs, period]);
  const topReparaciones = useMemo(() => rankBy(periodJobs, "tipoReparacion"), [periodJobs]);
  const topMarcas = useMemo(() => rankBy(periodJobs, "marca"), [periodJobs]);

  if (jobs.length === 0) {
    return (
      <div>
        <div className="page-title" style={{ marginBottom: 4 }}>Ganancias</div>
        <div className="page-sub" style={{ marginBottom: 20 }}>Todavía no hay datos suficientes.</div>
        <EmptyState icon={BarChart3} title="Sin trabajos registrados" sub="Registra tu primer trabajo para ver aquí el dashboard de ganancias." />
      </div>
    );
  }

  const chartTitle = "Ganancia " + (
    period.id === "dia" ? "por hora (hoy)" :
    period.id === "semana" ? "por día (últimos 7 días)" :
    period.id === "mes" ? "por día (últimos 30 días)" :
    period.id === "3m" ? "por semana (últimos 3 meses)" :
    "por mes"
  );
  const tickInterval = buckets.length > 10 ? Math.ceil(buckets.length / 10) - 1 : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div className="page-title">Ganancias del negocio</div>
          <div className="page-sub">Resumen de {period.label.toLowerCase()}, calculado sobre tus trabajos registrados.</div>
        </div>
        <div className="seg">
          {PERIODS.map((p) => (
            <button key={p.id} className={periodId === p.id ? "active" : ""} onClick={() => setPeriodId(p.id)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <StatTile icon={Wallet} label={`Ingresos (${period.label.toLowerCase()})`} value={currency(current.ingresos)} />
        <StatTile icon={Receipt} label={`Invertido en repuestos`} value={currency(current.inversion)} />
        <StatTile
          icon={TrendingUp} label={`Ganancia (${period.label.toLowerCase()})`} value={currency(current.ganancia)}
          delta={delta}
          deltaLabel={delta === null ? null : "vs. periodo anterior"}
        />
        <StatTile icon={ClipboardCheck} label="Trabajos en el periodo" value={current.cantidad} />
      </div>

      <div className="card chart-card">
        <div className="chart-head">
          <div className="section-title" style={{ marginBottom: 0 }}>{chartTitle}</div>
          <div className="legend-row">
            <LegendItem color="var(--chart-1)" label="Ingresos" />
            <LegendItem color="var(--chart-2)" label="Inversión" />
            <LegendItem color="var(--chart-3)" label="Ganancia" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={buckets} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barCategoryGap={22}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 12, fill: "var(--chart-muted)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
            <YAxis tickFormatter={currencyShort} tick={{ fontSize: 12, fill: "var(--chart-muted)" }} axisLine={false} tickLine={false} width={58} />
            <Tooltip content={<PeriodTooltip />} cursor={{ fill: "rgba(137,135,129,0.08)" }} />
            <Bar dataKey="ingresos" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="inversion" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Line dataKey="ganancia" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-3)", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="two-col">
        <div className="card chart-card">
          <div className="section-title">Trabajos en el periodo</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={buckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 12, fill: "var(--chart-muted)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
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
                {buckets.map((m, i) => <Cell key={i} fill="var(--chart-1)" />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="section-title">Reparaciones más frecuentes</div>
          {topReparaciones.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Sin datos en este periodo.</div>
          ) : (
            topReparaciones.map((r) => (
              <div className="rank-row" key={r.name}>
                <span className="name">{r.name}</span>
                <span className="count">{r.count}</span>
              </div>
            ))
          )}

          <div className="section-title" style={{ marginTop: 20 }}>Marcas más atendidas</div>
          {topMarcas.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Sin datos en este periodo.</div>
          ) : (
            topMarcas.map((r) => (
              <div className="rank-row" key={r.name}>
                <span className="name">{r.name}</span>
                <span className="count">{r.count}</span>
              </div>
            ))
          )}
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

function PeriodTooltip({ active, payload, label }) {
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

// ---------------- Helpers de fecha (hora local) ----------------

const pad2 = (n) => String(n).padStart(2, "0");
const dateKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dayLabelOf = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const emptyBucket = () => ({ ingresos: 0, inversion: 0, ganancia: 0, cantidad: 0 });

// Suma de cada trabajo agrupado por día calendario (clave "YYYY-MM-DD").
function dailyTotals(jobs) {
  const map = new Map();
  for (const job of jobs) {
    const key = (job.fecha || "").slice(0, 10);
    if (!key) continue;
    if (!map.has(key)) map.set(key, emptyBucket());
    const b = map.get(key);
    b.ingresos += Number(job.costo) || 0;
    b.inversion += Number(job.inversion) || 0;
    b.ganancia += profitOf(job);
    b.cantidad += 1;
  }
  return map;
}

// Suma los totales diarios entre hace `fromOffset` y `toOffsetInclusive` días
// (0 = hoy). Se usa tanto para las tarjetas del periodo como para comparar
// con el periodo anterior equivalente.
function sumRangeDays(daily, fromOffset, toOffsetInclusive) {
  const now = new Date();
  const acc = emptyBucket();
  for (let off = fromOffset; off <= toOffsetInclusive; off++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - off);
    const v = daily.get(dateKeyOf(d));
    if (!v) continue;
    acc.ingresos += v.ingresos;
    acc.inversion += v.inversion;
    acc.ganancia += v.ganancia;
    acc.cantidad += v.cantidad;
  }
  return acc;
}

function jobsInRange(jobs, spanDays) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (spanDays - 1));
  return jobs.filter((j) => {
    const key = (j.fecha || "").slice(0, 10);
    if (!key) return false;
    const [y, m, d] = key.split("-").map(Number);
    const jd = new Date(y, (m || 1) - 1, d || 1);
    return jd >= cutoff;
  });
}

function buildHourBuckets(jobs) {
  const now = new Date();
  const todayKeyStr = dateKeyOf(now);
  const buckets = [];
  for (let h = 0; h <= now.getHours(); h++) {
    buckets.push({ key: `h${h}`, label: `${pad2(h)}:00`, ...emptyBucket() });
  }
  for (const job of jobs) {
    if ((job.fecha || "").slice(0, 10) !== todayKeyStr) continue;
    const h = new Date(job.fecha).getHours();
    const b = buckets[h];
    if (!b) continue;
    b.ingresos += Number(job.costo) || 0;
    b.inversion += Number(job.inversion) || 0;
    b.ganancia += profitOf(job);
    b.cantidad += 1;
  }
  return buckets;
}

function buildDayBuckets(daily, count) {
  const now = new Date();
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const v = daily.get(dateKeyOf(d)) || emptyBucket();
    buckets.push({ key: dateKeyOf(d), label: dayLabelOf(d), ...v });
  }
  return buckets;
}

function buildWeekBuckets(daily, weeksCount) {
  const now = new Date();
  const buckets = [];
  for (let w = weeksCount - 1; w >= 0; w--) {
    const acc = emptyBucket();
    for (let d = 0; d <= 6; d++) {
      const dayOffset = w * 7 + d;
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
      const v = daily.get(dateKeyOf(date));
      if (v) { acc.ingresos += v.ingresos; acc.inversion += v.inversion; acc.ganancia += v.ganancia; acc.cantidad += v.cantidad; }
    }
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w * 7 + 6));
    buckets.push({ key: `w${w}`, label: dayLabelOf(startDate), ...acc });
  }
  return buckets;
}

function buildMonthly(jobs, count) {
  const now = new Date();
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      ...emptyBucket(),
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
