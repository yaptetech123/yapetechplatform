import { useEffect, useState } from "react";
import { Pencil, Trash2, X, Video, ImageOff } from "lucide-react";
import { db } from "../db.js";
import { currency, formatDateTime, profitOf } from "../utils.js";
import { Modal } from "./ui.jsx";

export default function JobDetail({ job, onClose, onEdit, onDelete }) {
  const [media, setMedia] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const urls = [];
    db.getMediaForJob(job.id).then((items) => {
      if (cancelled) return;
      const withUrls = items.map((m) => {
        const url = URL.createObjectURL(m.blob);
        urls.push(url);
        return { ...m, url };
      });
      setMedia(withUrls);
    });
    return () => { cancelled = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [job.id]);

  const profit = profitOf(job);

  return (
    <Modal
      title={`${job.marca} ${job.modelo}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Eliminar</button>
          <button className="btn btn-primary" onClick={() => onEdit(job)}><Pencil size={15} /> Editar</button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <span className={"badge " + (job.sistema === "iOS" ? "ios" : "android")}>{job.sistema}</span>
        <span className="badge">{job.tipoEquipo}</span>
        <span className="badge">{job.estado}</span>
      </div>

      <div className="detail-grid" style={{ marginBottom: 22 }}>
        <Item k="Cliente" v={job.clienteNombre} />
        <Item k="DNI" v={job.dni} mono />
        {job.telefono && <Item k="Teléfono" v={job.telefono} mono />}
        <Item k="Fecha y hora" v={formatDateTime(job.fecha)} />
        <Item k="Marca / Modelo" v={`${job.marca} ${job.modelo}`} />
        {job.numeroSerie && <Item k="N° de serie" v={job.numeroSerie} mono />}
        {job.imei1 && <Item k="IMEI 1" v={job.imei1} mono />}
        {job.imei2 && <Item k="IMEI 2" v={job.imei2} mono />}
        <Item k="Tipo de reparación" v={job.tipoReparacion} />
        {job.metodoPago && <Item k="Método de pago" v={job.metodoPago} />}
      </div>

      <div style={{ marginBottom: 22 }}>
        <div className="section-title">Descripción del equipo al recibirlo</div>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{job.descripcion}</p>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div className="section-title">Evidencia fotográfica {media.length > 0 && `(${media.length})`}</div>
        {media.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 8 }}>
            <ImageOff size={16} /> Sin fotos ni videos adjuntos.
          </div>
        ) : (
          <div className="media-grid">
            {media.map((m) => (
              <div className="media-item" key={m.id} onClick={() => setLightbox(m)}>
                {m.kind === "video" ? (
                  <>
                    <video src={m.url} muted />
                    <div className="play"><Video size={20} /></div>
                  </>
                ) : (
                  <img src={m.url} alt="" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <MoneyTile label="Cobrado al cliente" value={job.costo} />
        <MoneyTile label="Inversión en repuestos" value={job.inversion} />
        <MoneyTile label="Ganancia" value={profit} highlight />
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="close" onClick={() => setLightbox(null)}><X size={18} /></button>
          {lightbox.kind === "video" ? <video src={lightbox.url} controls autoPlay onClick={(e) => e.stopPropagation()} /> : <img src={lightbox.url} alt="" onClick={(e) => e.stopPropagation()} />}
        </div>
      )}

      {confirmDelete && (
        <Modal
          title="Eliminar trabajo"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => onDelete(job)}><Trash2 size={15} /> Eliminar definitivamente</button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Esta acción eliminará el registro de <b>{job.clienteNombre}</b> ({job.marca} {job.modelo}) junto con sus fotos y videos. No se puede deshacer.
          </p>
        </Modal>
      )}
    </Modal>
  );
}

function Item({ k, v, mono }) {
  return (
    <div className="detail-item">
      <div className="k">{k}</div>
      <div className={"v" + (mono ? " mono" : "")}>{v}</div>
    </div>
  );
}

function MoneyTile({ label, value, highlight }) {
  return (
    <div className="card card-pad" style={{ padding: 14 }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-muted)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, fontFamily: "Sora, sans-serif", color: highlight ? (value >= 0 ? "var(--success)" : "var(--danger)") : "var(--ink)" }}>
        {currency(value)}
      </div>
    </div>
  );
}
