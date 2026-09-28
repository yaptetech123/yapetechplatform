import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export function Toast({ msg, kind, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={"toast" + (kind === "err" ? " err" : "")}>
      {kind === "err" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {msg}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={wide ? { maxWidth: 860 } : undefined}>
        <div className="modal-head">
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, required, hint, error, children }) {
  return (
    <div className="field">
      <label>{label} {required && <span className="req">*</span>}{hint && <span className="hint"> — {hint}</span>}</label>
      {children}
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, sub, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={40} strokeWidth={1.4} />}
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink-soft)" }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
      {action}
    </div>
  );
}
