import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, PlusCircle, ClipboardList, Settings as SettingsIcon, LogOut, Boxes,
} from "lucide-react";
import { db } from "./db.js";
import { getSession, clearSession, isAdmin } from "./auth.js";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import JobForm from "./components/JobForm.jsx";
import JobsList from "./components/JobsList.jsx";
import JobDetail from "./components/JobDetail.jsx";
import Inventory from "./components/Inventory.jsx";
import Settings from "./components/Settings.jsx";
import { Toast } from "./components/ui.jsx";

const NAV_ALL = [
  { id: "nuevo", label: "Nuevo trabajo", short: "Nuevo", icon: PlusCircle },
  { id: "trabajos", label: "Trabajos", short: "Trabajos", icon: ClipboardList },
  { id: "inventario", label: "Inventario", short: "Inventario", icon: Boxes },
  { id: "dashboard", label: "Ganancias", short: "Ganancias", icon: LayoutDashboard },
  { id: "ajustes", label: "Ajustes", short: "Ajustes", icon: SettingsIcon, adminOnly: true },
];

export default function App() {
  const [user, setUser] = useState(getSession());
  if (!user) {
    return <Login onSuccess={(u) => setUser(u)} />;
  }
  return <Shell user={user} onLogout={() => { clearSession(); setUser(null); }} />;
}

function Shell({ user, onLogout }) {
  const admin = isAdmin(user);
  const NAV = NAV_ALL.filter((n) => !n.adminOnly || admin);

  const [tab, setTab] = useState("trabajos");
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(null); // trabajo en edición
  const [viewing, setViewing] = useState(null); // trabajo abierto en detalle
  const [toast, setToast] = useState(null);

  const reload = useCallback(async () => {
    const all = await db.getAllJobs();
    all.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
    setJobs(all);
    setLoaded(true);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const notify = (msg, kind = "ok") => {
    setToast({ msg, kind, key: Date.now() });
  };

  const go = (id) => {
    setTab(id);
    if (id !== "nuevo") setEditing(null);
    window.scrollTo({ top: 0 });
  };

  const onSaved = async (job, isEdit) => {
    await reload();
    notify(isEdit ? "Trabajo actualizado" : "Trabajo registrado");
    setEditing(null);
    setTab("trabajos");
    if (isEdit) setViewing(job);
  };

  const onDelete = async (job) => {
    await db.deleteJob(job.id);
    setViewing(null);
    await reload();
    notify("Trabajo eliminado");
  };

  const startEdit = (job) => {
    setViewing(null);
    setEditing(job);
    setTab("nuevo");
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={"side-link" + (tab === n.id ? " active" : "")}
              onClick={() => go(n.id)}
            >
              <n.icon size={18} />
              <span>{n.id === "nuevo" && editing ? "Editar trabajo" : n.label}</span>
            </button>
          ))}
        </nav>
        <button className="side-link logout" onClick={onLogout}>
          <LogOut size={18} />
          <span>Cerrar sesión{user.nombre ? ` (${user.nombre})` : ""}</span>
        </button>
      </aside>

      <header className="topbar">
        <Brand compact />
        <button className="icon-btn light" onClick={onLogout} aria-label="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </header>

      <main className="main">
        {!loaded ? (
          <div className="empty">Cargando…</div>
        ) : tab === "dashboard" ? (
          <Dashboard jobs={jobs} />
        ) : tab === "nuevo" ? (
          <JobForm
            key={editing ? editing.id : "nuevo"}
            initial={editing}
            onSaved={onSaved}
            onCancel={editing ? () => { setEditing(null); setTab("trabajos"); } : null}
            notify={notify}
          />
        ) : tab === "trabajos" ? (
          <JobsList jobs={jobs} onOpen={setViewing} onNew={() => go("nuevo")} />
        ) : tab === "inventario" ? (
          <Inventory notify={notify} />
        ) : tab === "ajustes" && admin ? (
          <Settings jobs={jobs} reload={reload} notify={notify} currentUser={user} />
        ) : null}
      </main>

      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={"bottom-link" + (tab === n.id ? " active" : "")}
            onClick={() => go(n.id)}
          >
            <n.icon size={20} />
            <span>{n.short}</span>
          </button>
        ))}
      </nav>

      {viewing && (
        <JobDetail
          job={viewing}
          onClose={() => setViewing(null)}
          onEdit={startEdit}
          onDelete={onDelete}
        />
      )}
      {toast && <Toast key={toast.key} {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}

export function Brand({ compact }) {
  return (
    <div className={"brand" + (compact ? " compact" : "")}>
      <div className="brand-mark"><img src="/logo.webp" alt="" /></div>
      <div>
        <div className="brand-name">YAPE<span>TECH</span></div>
        {!compact && <div className="brand-sub">Servicio técnico</div>}
      </div>
    </div>
  );
}
