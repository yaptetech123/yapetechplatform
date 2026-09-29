import { useEffect, useRef, useState } from "react";
import {
  KeyRound, Download, Upload, Trash2, ShieldCheck, Users, PlusCircle, Pencil, Loader2, Save, X,
} from "lucide-react";
import { db } from "../db.js";
import {
  resetUserPassword, listUsers, createUser, updateUserInfo, deleteUser,
} from "../auth.js";
import { blobToDataURL, dataURLToBlob, downloadBlob } from "../utils.js";
import { Modal } from "./ui.jsx";

export default function Settings({ jobs, reload, notify, currentUser }) {
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const importRef = useRef(null);

  const exportBackup = async () => {
    setBusy(true);
    try {
      const allJobs = await db.getAllJobs();
      const allMedia = await db.getAllMedia();
      const allParts = await db.getAllParts();
      const mediaB64 = await Promise.all(
        allMedia.map(async (m) => {
          const blob = await (await fetch(m.url)).blob();
          return { id: m.id, jobId: m.jobId, kind: m.kind, name: m.name, size: m.size, data: await blobToDataURL(blob) };
        })
      );
      const payload = { app: "yapetech", version: 1, exportedAt: new Date().toISOString(), jobs: allJobs, media: mediaB64, parts: allParts };
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
      for (const part of payload.parts || []) await db.putPart(part);
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

  return (
    <div>
      <div className="page-title" style={{ marginBottom: 4 }}>Ajustes</div>
      <div className="page-sub" style={{ marginBottom: 22 }}>Seguridad de acceso, usuarios y respaldo de tu información.</div>

      <MyAccount currentUser={currentUser} notify={notify} />

      <UsersPanel currentUser={currentUser} notify={notify} />

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

// ---------------- Mi cuenta (cambiar mi propia contraseña) ----------------

function MyAccount({ currentUser, notify }) {
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [saving, setSaving] = useState(false);

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwNew.length < 4) { setPwError("La contraseña debe tener al menos 4 caracteres."); return; }
    if (pwNew !== pwConfirm) { setPwError("Las contraseñas no coinciden."); return; }
    setSaving(true);
    try {
      await resetUserPassword(currentUser.id, pwNew);
      setPwNew(""); setPwConfirm("");
      notify?.("Contraseña actualizada");
    } catch (err) {
      console.error(err);
      setPwError("No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card card-pad settings-section">
      <div className="section-title"><KeyRound size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Mi cuenta</div>
      <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: -6, marginBottom: 16 }}>
        Sesión: <b>{currentUser.usuario}</b> {currentUser.nombre ? `(${currentUser.nombre})` : ""} — {currentUser.rol === "admin" ? "Administrador" : "Técnico"}
      </p>
      <form onSubmit={savePassword} className="form-grid">
        <div className="field">
          <label>Nueva contraseña</label>
          <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="field">
          <label>Confirmar nueva contraseña</label>
          <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="••••••••" />
        </div>
        {pwError && <div className="error-text field full" style={{ marginTop: -8 }}>{pwError}</div>}
        <div className="field full">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Cambiar mi contraseña
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------- Gestión de usuarios (solo administradores) ----------------

function UsersPanel({ currentUser, notify }) {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const reload = async () => {
    const all = await listUsers();
    setUsers(all);
    setLoaded(true);
  };

  useEffect(() => { reload(); }, []);

  const admins = users.filter((u) => u.rol === "admin" && u.activo);

  const onSaved = async (msg) => {
    setModalOpen(false);
    setEditing(null);
    await reload();
    notify?.(msg);
  };

  const onDelete = async () => {
    if (confirmDelete.id === currentUser.id) {
      notify?.("No puedes eliminar tu propia cuenta", "err");
      setConfirmDelete(null);
      return;
    }
    if (confirmDelete.rol === "admin" && admins.length <= 1) {
      notify?.("Debe quedar al menos un administrador", "err");
      setConfirmDelete(null);
      return;
    }
    await deleteUser(confirmDelete.id);
    setConfirmDelete(null);
    await reload();
    notify?.("Usuario eliminado");
  };

  return (
    <div className="card card-pad settings-section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 10 }}>
        <div className="section-title" style={{ marginBottom: 0 }}><Users size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Usuarios</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModalOpen(true); }}><PlusCircle size={14} /> Agregar usuario</button>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 0, marginBottom: 16 }}>
        Crea cuentas para tu equipo con menos permisos: un usuario con rol <b>Técnico</b> no ve el apartado de Ajustes.
      </p>

      {!loaded ? (
        <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Cargando…</div>
      ) : (
        users.map((u) => (
          <div className="kv-row" key={u.id}>
            <div>
              <div className="k">
                {u.usuario} {u.nombre && <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>— {u.nombre}</span>}
                {u.id === currentUser.id && <span className="badge" style={{ marginLeft: 8 }}>Tú</span>}
              </div>
              <div className="d">
                {u.rol === "admin" ? "Administrador" : "Técnico"} · {u.activo ? "Activo" : "Inactivo"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="icon-btn" onClick={() => { setEditing(u); setModalOpen(true); }} aria-label="Editar"><Pencil size={15} /></button>
              <button className="icon-btn danger" onClick={() => setConfirmDelete(u)} aria-label="Eliminar"><Trash2 size={15} /></button>
            </div>
          </div>
        ))
      )}

      {modalOpen && (
        <UserModal
          initial={editing}
          currentUser={currentUser}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Eliminar usuario"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={onDelete}><Trash2 size={15} /> Sí, eliminar</button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Se eliminará el acceso de <b>{confirmDelete.usuario}</b>. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}

function UserModal({ initial, currentUser, onClose, onSaved }) {
  const isEdit = !!initial;
  const isSelf = initial?.id === currentUser.id;
  const [usuario, setUsuario] = useState(initial?.usuario || "");
  const [nombre, setNombre] = useState(initial?.nombre || "");
  const [rol, setRol] = useState(initial?.rol || "tecnico");
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!usuario.trim()) { setError("Ingresa un usuario."); return; }
    if (!isEdit && clave.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); return; }
    if (clave && clave.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateUserInfo(initial.id, { usuario, nombre, rol, activo });
        if (clave) await resetUserPassword(initial.id, clave);
        onSaved("Usuario actualizado");
      } else {
        await createUser({ usuario, clave, nombre, rol });
        onSaved("Usuario creado");
      }
    } catch (err) {
      console.error(err);
      setError(
        String(err.message || "").includes("duplicate") || String(err.message || "").includes("unique")
          ? "Ese nombre de usuario ya existe."
          : "No se pudo guardar el usuario."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Editar usuario" : "Agregar usuario"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>Usuario <span className="req">*</span></label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <label>Nombre <span className="hint">opcional</span></label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)} disabled={isSelf}>
              <option value="tecnico">Técnico</option>
              <option value="admin">Administrador</option>
            </select>
            {isSelf && <div className="hint" style={{ marginTop: 4 }}>No puedes cambiar tu propio rol.</div>}
          </div>
          {isEdit && (
            <div className="field">
              <label>Estado</label>
              <select value={activo ? "1" : "0"} onChange={(e) => setActivo(e.target.value === "1")} disabled={isSelf}>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          )}
          <div className="field full">
            <label>{isEdit ? "Nueva contraseña" : "Contraseña"} {isEdit && <span className="hint">deja en blanco para no cambiarla</span>}{!isEdit && <span className="req">*</span>}</label>
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </div>
          {error && <div className="error-text field full" style={{ marginTop: -8 }}>{error}</div>}
        </div>
      </form>
    </Modal>
  );
}
