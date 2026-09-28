import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { checkLogin } from "../auth.js";

export default function Login({ onSuccess }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!usuario.trim() || !clave) { setError("Ingresa usuario y contraseña."); return; }
    if (checkLogin(usuario, clave)) {
      onSuccess();
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.webp" alt="YAPETECH" />
          <div className="brand-name">YAPE<span>TECH</span></div>
          <div className="brand-sub" style={{ fontSize: 12.5 }}>Panel administrativo · Servicio técnico</div>
        </div>

        <form onSubmit={submit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Usuario</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus autoComplete="username" placeholder="admin" />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ paddingRight: 38 }}
              />
              <button type="button" onClick={() => setShowPass((s) => !s)} aria-label="Mostrar contraseña"
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-muted)", cursor: "pointer", display: "flex" }}>
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <div className="error-text" style={{ marginBottom: 8 }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
            <Lock size={15} /> Ingresar
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: "var(--ink-muted)", textAlign: "center", marginTop: 20, marginBottom: 0 }}>
          Acceso exclusivo para el administrador del local.
        </p>
      </div>
    </div>
  );
}
