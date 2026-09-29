import { useEffect, useMemo, useState } from "react";
import { Search, PlusCircle, Boxes, Pencil, Trash2, X, Save, Loader2 } from "lucide-react";
import { db } from "../db.js";
import { BRANDS, PART_TYPES, uid, currency } from "../utils.js";
import { Modal, EmptyState } from "./ui.jsx";

const LOW_STOCK = 2; // a partir de qué cantidad se marca como stock bajo

const emptyForm = () => ({
  tipoRepuesto: "",
  marca: "",
  modelo: "",
  detalle: "",
  cantidad: "1",
  costo: "",
  precioVenta: "",
});

export default function Inventory({ notify }) {
  const [parts, setParts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const reload = async () => {
    const all = await db.getAllParts();
    setParts(all);
    setLoaded(true);
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return parts.filter((p) => {
      if (tipoFiltro !== "Todos" && p.tipoRepuesto !== tipoFiltro) return false;
      if (!term) return true;
      return [p.tipoRepuesto, p.modelo, p.marca, p.detalle].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [parts, q, tipoFiltro]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (part) => { setEditing(part); setModalOpen(true); };

  const onSaved = async (msg) => {
    setModalOpen(false);
    setEditing(null);
    await reload();
    notify?.(msg);
  };

  const onDelete = async () => {
    await db.deletePart(confirmDelete.id);
    setConfirmDelete(null);
    await reload();
    notify?.("Repuesto eliminado");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-title">Inventario</div>
          <div className="page-sub">{parts.length} repuestos registrados</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><PlusCircle size={16} /> Agregar repuesto</button>
      </div>

      <div className="jobs-toolbar">
        <div className="search">
          <Search size={16} />
          <input type="text" placeholder="Buscar por tipo, modelo, marca…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} style={{ width: "auto", minWidth: 190 }}>
          <option>Todos</option>
          {PART_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {!loaded ? (
        <div className="empty">Cargando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={parts.length === 0 ? "Aún no registras repuestos" : "Sin resultados"}
          sub={parts.length === 0 ? "Agrega tu primer repuesto para llevar el control de tu stock." : "Prueba con otro término o filtro."}
          action={parts.length === 0 && <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={openNew}><PlusCircle size={16} /> Agregar repuesto</button>}
        />
      ) : (
        filtered.map((part) => {
          const low = Number(part.cantidad) <= LOW_STOCK;
          return (
            <div className="part-row" key={part.id} onClick={() => openEdit(part)}>
              <div className="part-main">
                <div className="title">{part.tipoRepuesto} {part.marca && `· ${part.marca}`}</div>
                <div className="sub">{part.modelo}{part.detalle && ` — ${part.detalle}`}</div>
                <div className="meta" style={{ marginTop: 6 }}>
                  <span className={"stock-pill" + (low ? " low" : "")}>{part.cantidad} en stock</span>
                  {part.precioVenta !== "" && <span style={{ marginLeft: 8 }}>Venta: {currency(part.precioVenta)}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button className="icon-btn" onClick={() => openEdit(part)} aria-label="Editar"><Pencil size={15} /></button>
                <button className="icon-btn danger" onClick={() => setConfirmDelete(part)} aria-label="Eliminar"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })
      )}

      {modalOpen && (
        <PartModal
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Eliminar repuesto"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={onDelete}><Trash2 size={15} /> Sí, eliminar</button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Se eliminará <b>{confirmDelete.tipoRepuesto} — {confirmDelete.modelo}</b> del inventario. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}

function PartModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => (initial ? toFormState(initial) : emptyForm()));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    if (!form.tipoRepuesto) e.tipoRepuesto = "Requerido";
    if (!form.modelo.trim()) e.modelo = "Requerido";
    if (form.cantidad === "" || Number(form.cantidad) < 0) e.cantidad = "Ingresa la cantidad";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const part = {
        id: initial?.id || uid(),
        tipoRepuesto: form.tipoRepuesto,
        marca: form.marca,
        modelo: form.modelo.trim(),
        detalle: form.detalle.trim(),
        cantidad: Number(form.cantidad),
        costo: form.costo === "" ? "" : Number(form.costo),
        precioVenta: form.precioVenta === "" ? "" : Number(form.precioVenta),
        creadoEn: initial?.creadoEn,
      };
      await db.putPart(part);
      onSaved(isEdit ? "Repuesto actualizado" : "Repuesto agregado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Editar repuesto" : "Agregar repuesto"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="part-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isEdit ? "Guardar cambios" : "Agregar"}
          </button>
        </>
      }
    >
      <form id="part-form" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>Tipo de repuesto <span className="req">*</span></label>
            <select className={errors.tipoRepuesto ? "error" : ""} value={form.tipoRepuesto} onChange={(e) => set("tipoRepuesto", e.target.value)}>
              <option value="">Selecciona…</option>
              {PART_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            {errors.tipoRepuesto && <div className="error-text">{errors.tipoRepuesto}</div>}
          </div>
          <div className="field">
            <label>Modelo <span className="req">*</span></label>
            <input type="text" placeholder="Ej. iPhone 12, Galaxy A54" className={errors.modelo ? "error" : ""}
              value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
            {errors.modelo && <div className="error-text">{errors.modelo}</div>}
          </div>
          <div className="field">
            <label>Marca <span className="hint">opcional</span></label>
            <select value={form.marca} onChange={(e) => set("marca", e.target.value)}>
              <option value="">Selecciona…</option>
              {BRANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Detalle <span className="hint">opcional</span></label>
            <input type="text" placeholder="Ej. original, genérico, color negro" value={form.detalle} onChange={(e) => set("detalle", e.target.value)} />
          </div>
          <div className="field">
            <label>Cantidad en stock <span className="req">*</span></label>
            <input type="number" min="0" step="1" className={errors.cantidad ? "error" : ""}
              value={form.cantidad} onChange={(e) => set("cantidad", e.target.value)} />
            {errors.cantidad && <div className="error-text">{errors.cantidad}</div>}
          </div>
          <div className="field">
            <label>Costo (compra) <span className="hint">opcional</span></label>
            <div className="field-money">
              <input type="number" min="0" step="0.10" value={form.costo} onChange={(e) => set("costo", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Precio de venta <span className="hint">opcional</span></label>
            <div className="field-money">
              <input type="number" min="0" step="0.10" value={form.precioVenta} onChange={(e) => set("precioVenta", e.target.value)} />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function toFormState(part) {
  return {
    tipoRepuesto: part.tipoRepuesto,
    marca: part.marca || "",
    modelo: part.modelo,
    detalle: part.detalle || "",
    cantidad: String(part.cantidad ?? "1"),
    costo: part.costo === "" || part.costo === null ? "" : String(part.costo),
    precioVenta: part.precioVenta === "" || part.precioVenta === null ? "" : String(part.precioVenta),
  };
}
