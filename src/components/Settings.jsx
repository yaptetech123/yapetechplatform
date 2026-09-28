import { useRef, useState } from "react";
import { KeyRound, Download, Upload, Trash2, ShieldCheck } from "lucide-react";
import { db } from "../db.js";
import { getCredentials, setCredentials } from "../auth.js";
import { blobToDataURL, dataURLToBlob, formatBytes, downloadBlob } from "../utils.js";
import { Modal } from "./ui.jsx";

export default function Settings({ jobs, reload, notify }) {
  const [pwUser, setPwUser] = useState(getCredentials().usuario);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const importRef = useRef(null);

  const savePassword = (e) => {
    e.preventDefault();
    setPwError("");
    if (!pwUser.trim()) { setPwError("Ingresa un usuario."); return; }
    if (pwNew && pwNew.length < 4) { setPwError("La contraseña debe tener al menos 4 caracteres."); return; }
    if (pwNew && pwNew !== pwConfirm) { setPwError("Las contraseñas no coinciden."); return; }
    const current = getCredentials();
    setCredentials({ usuario: pwUser.trim(), clave: pwNew || current.clave });
    setPwNew(""); setPwConfirm("");
    notify?.("Credenciales actualizadas");
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      const allJobs = await db.getAllJobs();
      const allMedia = await db.getAllMedia();
      const mediaB64 = await Promise.all(
        allMedia.map(async (m) => {
          const blob = await (await fetch(m.url)).blob();
          return { id: m.id, jobId: m.jobId, kind: m.kind, name: m.name, size: m.size, data: await blobToDataURL(blob) };
        })
      );
      const payload = { app: "yapetech", version: 1, exportedAt: new Date().toISOString(), jobs: allJobs, media: mediaB64 };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      downloadBlob(blob, `yapetech-respaldo-${new Date().toISOString().slice(0, 10)}.json`);
      notify?.("Respaldo descargado");
    } catch (err) {
      console.error(err);
      notify?.("No se pudo generar el respaldo", "err");
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (payload.app !== "yapetech" || !Array.isArray(payload.jobs)) throw new Error("Archivo inválido");
      for (const job of payload.jobs) await db.putJob(job);
      const mediaBlobs = await Promise.all(
        (payload.media || []).map(async (m) => ({ id: m.id, jobId: m.jobId, kind: m.kind, name: m.name, size: m.size, blob: await dataURLToBlob(m.data) }))
      );
      if (mediaBlobs.length) await db.putMedia(mediaBlobs);
      await reload();
      notify?.(`Respaldo importado: ${payload.jobs.length} trabajos`);
    } catch (err) {
      console.error(err);
      notify?.("El archivo de respaldo no es válido", "err");
    } finally {
      setBusy(false);
    }
  };

  const wipeAll = async () => {
    await db.clearAll();
    await reload();
    setConfirmWipe(false);
    notify?.("Todos los datos fueron eliminados");
  };

  const totalMediaSize = 0; // (se calcula bajo demanda en el respaldo)

  return (
    <div>
      <div className="page-title" style={{ marginBottom: 4 }}>Ajustes</div>
      <div className="page-sub" style={{ marginBottom: 22 }}>Seguridad de acceso y respaldo de tu información.</div>

      <div className="card card-pad settings-section">
        <div className="section-title"><KeyRound size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Acceso de administrador</div>
        <form onSubmit={savePassword} className="form-grid">
          <div className="field">
            <label>Usuario</label>
            <input type="text" value={pwUser} onChange={(e) => setPwUser(e.target.value)} />
          </div>
          <div className="field">
            <label>Nueva contraseña <span className="hint">deja en blanco para no cambiarla</span></label>
            <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="field full">
            <label>Confirmar nueva contraseña</label>
            <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          {pwError && <div className="error-text field full" style={{ marginTop: -8 }}>{pwError}</div>}
          <div className="field full">
            <button className="btn btn-primary" type="submit">Guardar credenciales</button>
          </div>
        </form>
      </div>

      <div className="card card-pad settings-section">
        <div className="section-title">Respaldo de información</div>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: -6, marginBottom: 16 }}>
          Todos los datos (trabajos, fotos y videos) se guardan en la nube y se ven igual desde cualquier
          dispositivo. Aun así, te recomendamos descargar un respaldo periódicamente como copia adicional.
        </p>
        <div className="kv-row">
          <div>
            <div className="k">Exportar respaldo completo</div>
            <div className="d">Descarga un archivo .json con {jobs.length} trabajos y toda su evidencia.</div>
          </div>
          <button className="btn btn-ghost" onClick={exportBackup} disabled={busy}><Download size={15} /> Descargar</button>
        </div>
        <div className="kv-row">
          <div>
            <div className="k">Importar respaldo</div>
            <div className="d">Restaura trabajos desde un archivo exportado previamente.</div>
          </div>
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()} disabled={busy}><Upload size={15} /> Elegir archivo</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { importBackup(e.target.files[0]); e.target.value = ""; }} />
        </div>
      </div>

      <div className="card card-pad settings-section" style={{ borderColor: "rgba(208,56,74,0.3)" }}>
        <div className="section-title" style={{ color: "var(--danger)" }}>Zona de riesgo</div>
        <div className="kv-row">
          <div>
            <div className="k">Eliminar todos los datos</div>
            <div className="d">Borra permanentemente todos los trabajos, fotos y videos de este navegador.</div>
          </div>
          <button className="btn btn-danger" onClick={() => setConfirmWipe(true)}><Trash2 size={15} /> Eliminar todo</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-muted)", fontSize: 12, marginTop: 8 }}>
        <ShieldCheck size={14} /> Los datos se guardan en la nube y se sincronizan entre todos tus dispositivos.
      </div>

      {confirmWipe && (
        <Modal
          title="Eliminar todos los datos"
          onClose={() => setConfirmWipe(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmWipe(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={wipeAll}><Trash2 size={15} /> Sí, eliminar todo</button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Se eliminarán los {jobs.length} trabajos registrados junto con todas sus fotos y videos. Esta acción no se puede deshacer.
            Te recomendamos descargar un respaldo antes de continuar.
          </p>
        </Modal>
      )}
    </div>
  );
}
