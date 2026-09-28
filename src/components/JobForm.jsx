import { useEffect, useRef, useState } from "react";
import {
  Camera, Image as ImageIcon, Video, Trash2, X, Save, ArrowLeft, Loader2,
} from "lucide-react";
import { db } from "../db.js";
import {
  BRANDS, DEVICE_TYPES, REPAIR_TYPES, PAYMENT_METHODS, systemForBrand, uid, nowLocal,
  compressImage, isValidImei, formatBytes,
} from "../utils.js";

const emptyForm = () => ({
  fecha: nowLocal(),
  dni: "",
  clienteNombre: "",
  telefono: "",
  tipoEquipo: "Celular",
  marca: "",
  marcaOtra: "",
  modelo: "",
  numeroSerie: "",
  imei1: "",
  imei2: "",
  tipoReparacion: "",
  tipoReparacionOtro: "",
  descripcion: "",
  costo: "",
  inversion: "",
  metodoPago: "",
  estado: "En proceso",
});

const ESTADOS = ["Recibido", "En proceso", "Esperando repuesto", "Listo para entrega", "Entregado"];

export default function JobForm({ initial, onSaved, onCancel, notify }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => (initial ? toFormState(initial) : emptyForm()));
  const [errors, setErrors] = useState({});
  const [media, setMedia] = useState([]); // { id, jobId, kind, blob, url, name, size, isNew }
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const objectUrls = useRef([]);

  useEffect(() => {
    if (initial) {
      db.getMediaForJob(initial.id).then((items) => {
        // Los medios ya guardados vienen con una URL pública lista para usar
        // (no hace falta crear object URLs locales para estos).
        setMedia(items.map((m) => ({ ...m, isNew: false })));
      });
    }
    return () => { objectUrls.current.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addFiles = async (fileList, kind) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const items = [];
    for (const file of files) {
      const isVideo = kind === "video" || file.type.startsWith("video/");
      const blob = isVideo ? file : await compressImage(file);
      const url = URL.createObjectURL(blob);
      objectUrls.current.push(url);
      items.push({
        id: uid(), kind: isVideo ? "video" : "foto", blob, url,
        name: file.name, size: blob.size, isNew: true,
      });
    }
    setMedia((m) => [...m, ...items]);
  };

  const removeMedia = (id) => setMedia((m) => m.filter((x) => x.id !== id));

  const validate = () => {
    const e = {};
    if (!form.fecha) e.fecha = "Requerido";
    if (!/^\d{8}$/.test(form.dni.trim())) e.dni = "DNI de 8 dígitos";
    if (!form.clienteNombre.trim()) e.clienteNombre = "Requerido";
    if (!form.marca) e.marca = "Requerido";
    if (form.marca === "Otra" && !form.marcaOtra.trim()) e.marcaOtra = "Especifica la marca";
    if (!form.modelo.trim()) e.modelo = "Requerido";
    if (!form.tipoReparacion) e.tipoReparacion = "Requerido";
    if (form.tipoReparacion === "Otro" && !form.tipoReparacionOtro.trim()) e.tipoReparacionOtro = "Especifica el tipo de reparación";
    if (!form.descripcion.trim()) e.descripcion = "Describe cómo se recibió el equipo";
    if (form.imei1 && !isValidImei(form.imei1.trim())) e.imei1 = "IMEI inválido (15 dígitos)";
    if (form.imei2 && !isValidImei(form.imei2.trim())) e.imei2 = "IMEI inválido (15 dígitos)";
    if (form.costo === "" || Number(form.costo) < 0) e.costo = "Ingresa el costo";
    if (form.inversion === "" || Number(form.inversion) < 0) e.inversion = "Ingresa la inversión";
    if (!form.metodoPago) e.metodoPago = "Selecciona el método de pago";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      notify?.("Revisa los campos marcados en rojo", "err");
      return;
    }
    setSaving(true);
    try {
      const marcaFinal = form.marca === "Otra" ? form.marcaOtra.trim() : form.marca;
      const tipoReparacionFinal = form.tipoReparacion === "Otro" ? form.tipoReparacionOtro.trim() : form.tipoReparacion;
      const job = {
        id: initial?.id || uid(),
        fecha: form.fecha,
        dni: form.dni.trim(),
        clienteNombre: form.clienteNombre.trim(),
        telefono: form.telefono.trim(),
        tipoEquipo: form.tipoEquipo,
        marca: marcaFinal,
        sistema: systemForBrand(marcaFinal),
        modelo: form.modelo.trim(),
        numeroSerie: form.numeroSerie.trim(),
        imei1: form.imei1.trim(),
        imei2: form.imei2.trim(),
        tipoReparacion: tipoReparacionFinal,
        descripcion: form.descripcion.trim(),
        costo: Number(form.costo),
        inversion: Number(form.inversion),
        metodoPago: form.metodoPago,
        estado: form.estado,
        creadoEn: initial?.creadoEn || new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };
      await db.putJob(job);

      const newMedia = media.filter((m) => m.isNew);
      if (newMedia.length) {
        await db.putMedia(newMedia.map((m) => ({ id: m.id, jobId: job.id, kind: m.kind, blob: m.blob, name: m.name, size: m.size, creadoEn: new Date().toISOString() })));
      }
      if (isEdit) {
        const current = await db.getMediaForJob(job.id);
        const keepIds = new Set(media.map((m) => m.id));
        const removed = current.filter((m) => !keepIds.has(m.id)).map((m) => m.id);
        if (removed.length) await db.deleteMedia(removed);
      }

      onSaved(job, isEdit);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        {onCancel && (
          <button className="icon-btn" onClick={onCancel} aria-label="Volver"><ArrowLeft size={17} /></button>
        )}
        <div>
          <div className="page-title">{isEdit ? "Editar trabajo" : "Nuevo trabajo"}</div>
          <div className="page-sub">Registra el ingreso del equipo con todos sus datos y evidencia fotográfica.</div>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="section-title">Datos del cliente</div>
          <div className="form-grid">
            <div className="field">
              <label>Fecha y hora <span className="req">*</span></label>
              <input type="datetime-local" className={errors.fecha ? "error" : ""} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
              {errors.fecha && <div className="error-text">{errors.fecha}</div>}
            </div>
            <div className="field">
              <label>DNI del cliente <span className="req">*</span></label>
              <input type="text" inputMode="numeric" maxLength={8} placeholder="12345678" className={errors.dni ? "error" : ""}
                value={form.dni} onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))} />
              {errors.dni && <div className="error-text">{errors.dni}</div>}
            </div>
            <div className="field">
              <label>Nombre del cliente <span className="req">*</span></label>
              <input type="text" placeholder="Nombre y apellido" className={errors.clienteNombre ? "error" : ""}
                value={form.clienteNombre} onChange={(e) => set("clienteNombre", e.target.value)} />
              {errors.clienteNombre && <div className="error-text">{errors.clienteNombre}</div>}
            </div>
            <div className="field">
              <label>Teléfono <span className="hint">opcional</span></label>
              <input type="text" inputMode="numeric" placeholder="999 999 999" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="section-title">Datos del equipo</div>
          <div className="form-grid">
            <div className="field">
              <label>Tipo de equipo</label>
              <select value={form.tipoEquipo} onChange={(e) => set("tipoEquipo", e.target.value)}>
                {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Marca <span className="req">*</span></label>
              <select className={errors.marca ? "error" : ""} value={form.marca} onChange={(e) => set("marca", e.target.value)}>
                <option value="">Selecciona…</option>
                {BRANDS.map((b) => <option key={b}>{b}</option>)}
              </select>
              {errors.marca && <div className="error-text">{errors.marca}</div>}
            </div>
            {form.marca === "Otra" && (
              <div className="field">
                <label>Especifica la marca <span className="req">*</span></label>
                <input type="text" className={errors.marcaOtra ? "error" : ""} value={form.marcaOtra} onChange={(e) => set("marcaOtra", e.target.value)} />
                {errors.marcaOtra && <div className="error-text">{errors.marcaOtra}</div>}
              </div>
            )}
            <div className="field">
              <label>Modelo <span className="req">*</span></label>
              <input type="text" placeholder="Ej. Galaxy A54, iPhone 13" className={errors.modelo ? "error" : ""}
                value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
              {errors.modelo && <div className="error-text">{errors.modelo}</div>}
            </div>
            <div className="field">
              <label>Número de serie <span className="hint">opcional</span></label>
              <input type="text" value={form.numeroSerie} onChange={(e) => set("numeroSerie", e.target.value)} />
            </div>
            <div className="field">
              <label>IMEI 1 <span className="hint">opcional</span></label>
              <input type="text" inputMode="numeric" maxLength={15} placeholder="15 dígitos" className={errors.imei1 ? "error" : ""}
                value={form.imei1} onChange={(e) => set("imei1", e.target.value.replace(/\D/g, ""))} />
              {errors.imei1 && <div className="error-text">{errors.imei1}</div>}
            </div>
            <div className="field">
              <label>IMEI 2 <span className="hint">opcional / dual SIM</span></label>
              <input type="text" inputMode="numeric" maxLength={15} placeholder="15 dígitos" className={errors.imei2 ? "error" : ""}
                value={form.imei2} onChange={(e) => set("imei2", e.target.value.replace(/\D/g, ""))} />
              {errors.imei2 && <div className="error-text">{errors.imei2}</div>}
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="section-title">Reparación</div>
          <div className="form-grid">
            <div className="field">
              <label>Tipo de reparación <span className="req">*</span></label>
              <select className={errors.tipoReparacion ? "error" : ""} value={form.tipoReparacion} onChange={(e) => set("tipoReparacion", e.target.value)}>
                <option value="">Selecciona…</option>
                {REPAIR_TYPES.map((r) => <option key={r}>{r}</option>)}
              </select>
              {errors.tipoReparacion && <div className="error-text">{errors.tipoReparacion}</div>}
            </div>
            {form.tipoReparacion === "Otro" && (
              <div className="field">
                <label>Especifica el tipo de reparación <span className="req">*</span></label>
                <input type="text" placeholder="Ej. Cambio de conector de carga" className={errors.tipoReparacionOtro ? "error" : ""}
                  value={form.tipoReparacionOtro} onChange={(e) => set("tipoReparacionOtro", e.target.value)} />
                {errors.tipoReparacionOtro && <div className="error-text">{errors.tipoReparacionOtro}</div>}
              </div>
            )}
            <div className="field">
              <label>Estado del trabajo</label>
              <select value={form.estado} onChange={(e) => set("estado", e.target.value)}>
                {ESTADOS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field full">
              <label>Descripción — cómo se recibe el equipo <span className="req">*</span></label>
              <textarea placeholder="Estado físico, rayones, funcionamiento, accesorios entregados, contraseña/patrón, etc." className={errors.descripcion ? "error" : ""}
                value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
              {errors.descripcion && <div className="error-text">{errors.descripcion}</div>}
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="section-title">Fotos y video del equipo</div>
          <p style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: -6, marginBottom: 14 }}>
            Usa la cámara para dejar evidencia del estado al recibirlo, o sube archivos de tu galería.
          </p>
          <div className="media-grid">
            {media.map((m) => (
              <div className="media-item" key={m.id}>
                {m.kind === "video" ? (
                  <>
                    <video src={m.url} muted onClick={() => setLightbox(m)} />
                    <div className="play" onClick={() => setLightbox(m)}><Video size={20} /></div>
                  </>
                ) : (
                  <img src={m.url} alt="" onClick={() => setLightbox(m)} />
                )}
                <button type="button" className="remove" onClick={() => removeMedia(m.id)} aria-label="Quitar"><X size={13} /></button>
              </div>
            ))}
            <button type="button" className="media-add" onClick={() => cameraInputRef.current?.click()}>
              <Camera size={20} /> Cámara
            </button>
            <button type="button" className="media-add" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon size={20} /> Galería
            </button>
            <button type="button" className="media-add" onClick={() => videoInputRef.current?.click()}>
              <Video size={20} /> Video
            </button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => { addFiles(e.target.files, "foto"); e.target.value = ""; }} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { addFiles(e.target.files, "foto"); e.target.value = ""; }} />
          <input ref={videoInputRef} type="file" accept="video/*" multiple hidden
            onChange={(e) => { addFiles(e.target.files, "video"); e.target.value = ""; }} />
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="section-title">Costos</div>
          <div className="form-grid">
            <div className="field">
              <label>Costo de la reparación (cobrado al cliente) <span className="req">*</span></label>
              <div className="field-money">
                <input type="number" min="0" step="0.10" className={errors.costo ? "error" : ""}
                  value={form.costo} onChange={(e) => set("costo", e.target.value)} />
              </div>
              {errors.costo && <div className="error-text">{errors.costo}</div>}
            </div>
            <div className="field">
              <label>Inversión en repuestos / insumos <span className="req">*</span></label>
              <div className="field-money">
                <input type="number" min="0" step="0.10" className={errors.inversion ? "error" : ""}
                  value={form.inversion} onChange={(e) => set("inversion", e.target.value)} />
              </div>
              {errors.inversion && <div className="error-text">{errors.inversion}</div>}
            </div>
            <div className="field">
              <label>Método de pago <span className="req">*</span></label>
              <select className={errors.metodoPago ? "error" : ""} value={form.metodoPago} onChange={(e) => set("metodoPago", e.target.value)}>
                <option value="">Selecciona…</option>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
              {errors.metodoPago && <div className="error-text">{errors.metodoPago}</div>}
            </div>
            <div className="field full" style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px" }}>
              <label style={{ marginBottom: 0 }}>Ganancia estimada</label>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--success)", fontFamily: "Sora, sans-serif" }}>
                S/ {((Number(form.costo) || 0) - (Number(form.inversion) || 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isEdit ? "Guardar cambios" : "Registrar trabajo"}
          </button>
        </div>
      </form>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="close" onClick={() => setLightbox(null)}><X size={18} /></button>
          {lightbox.kind === "video" ? <video src={lightbox.url} controls autoPlay onClick={(e) => e.stopPropagation()} /> : <img src={lightbox.url} alt="" onClick={(e) => e.stopPropagation()} />}
        </div>
      )}
    </div>
  );
}

function toFormState(job) {
  return {
    fecha: job.fecha, dni: job.dni, clienteNombre: job.clienteNombre, telefono: job.telefono || "",
    tipoEquipo: job.tipoEquipo || "Celular",
    marca: BRANDS.includes(job.marca) ? job.marca : "Otra",
    marcaOtra: BRANDS.includes(job.marca) ? "" : job.marca,
    modelo: job.modelo, numeroSerie: job.numeroSerie || "",
    imei1: job.imei1 || "", imei2: job.imei2 || "",
    tipoReparacion: REPAIR_TYPES.includes(job.tipoReparacion) ? job.tipoReparacion : "Otro",
    tipoReparacionOtro: REPAIR_TYPES.includes(job.tipoReparacion) ? "" : job.tipoReparacion,
    descripcion: job.descripcion,
    costo: String(job.costo ?? ""), inversion: String(job.inversion ?? ""),
    metodoPago: job.metodoPago || "",
    estado: job.estado || "En proceso",
  };
}
