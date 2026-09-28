import { useMemo, useState, useEffect } from "react";
import { Search, PlusCircle, ClipboardList, ImageOff } from "lucide-react";
import { db } from "../db.js";
import { currency, formatDateTime, profitOf } from "../utils.js";
import { EmptyState } from "./ui.jsx";

export default function JobsList({ jobs, onOpen, onNew }) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("Todos");
  const [thumbs, setThumbs] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = jobs.slice(0, 60).map((j) => j.id);
      const items = await db.getMediaForJobs(ids);
      const map = {};
      for (const m of items) {
        if (m.kind === "foto" && !map[m.jobId]) map[m.jobId] = m.url;
      }
      if (!cancelled) setThumbs(map);
    })();
    return () => { cancelled = true; };
  }, [jobs]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (estado !== "Todos" && j.estado !== estado) return false;
      if (!term) return true;
      return [j.clienteNombre, j.dni, j.marca, j.modelo, j.tipoReparacion, j.numeroSerie, j.imei1, j.imei2]
        .some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [jobs, q, estado]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-title">Trabajos</div>
          <div className="page-sub">{jobs.length} registrados en total</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}><PlusCircle size={16} /> Nuevo trabajo</button>
      </div>

      <div className="jobs-toolbar">
        <div className="search">
          <Search size={16} />
          <input type="text" placeholder="Buscar por cliente, DNI, marca, modelo, IMEI…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ width: "auto", minWidth: 170 }}>
          <option>Todos</option>
          <option>Recibido</option>
          <option>En proceso</option>
          <option>Esperando repuesto</option>
          <option>Listo para entrega</option>
          <option>Entregado</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={jobs.length === 0 ? "Aún no registras trabajos" : "Sin resultados"}
          sub={jobs.length === 0 ? "Registra el primer ingreso de equipo para empezar." : "Prueba con otro término de búsqueda."}
          action={jobs.length === 0 && <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onNew}><PlusCircle size={16} /> Nuevo trabajo</button>}
        />
      ) : (
        filtered.map((job) => {
          const profit = profitOf(job);
          return (
            <div className="job-row" key={job.id} onClick={() => onOpen(job)}>
              <div className="job-thumb">
                {thumbs[job.id] ? <img src={thumbs[job.id]} alt="" /> : <ImageOff size={18} />}
              </div>
              <div className="job-main">
                <div className="device">
                  {job.marca} {job.modelo}
                  <span className={"badge " + (job.sistema === "iOS" ? "ios" : "android")} style={{ marginLeft: 8 }}>{job.sistema}</span>
                </div>
                <div className="client">{job.clienteNombre} · DNI {job.dni}</div>
                <div className="meta">
                  <span>{formatDateTime(job.fecha)}</span>
                  <span>· {job.tipoReparacion}</span>
                  <span>· {job.estado}</span>
                </div>
              </div>
              <div className="job-amount">
                <div>{currency(job.costo)}</div>
                <div className={"profit " + (profit >= 0 ? "pos" : "neg")}>
                  {profit >= 0 ? "+" : ""}{currency(profit)} ganancia
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
