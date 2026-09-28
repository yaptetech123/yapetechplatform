// Acceso de administrador (guardado solo en este navegador).
const CRED_KEY = "yapetech:credenciales";
const SESSION_KEY = "yapetech:sesion";

export const DEFAULT_CREDENTIALS = { usuario: "admin", clave: "yapetech2026" };

const safe = (fn, fallback) => {
  try { return fn(); } catch { return fallback; }
};

export const getCredentials = () =>
  safe(() => JSON.parse(localStorage.getItem(CRED_KEY)), null) || DEFAULT_CREDENTIALS;

export const setCredentials = (cred) =>
  safe(() => localStorage.setItem(CRED_KEY, JSON.stringify(cred)));

export const checkLogin = (usuario, clave) => {
  const c = getCredentials();
  return usuario.trim().toLowerCase() === c.usuario.toLowerCase() && clave === c.clave;
};

export const isLoggedIn = () => safe(() => localStorage.getItem(SESSION_KEY) === "1", false);
export const saveSession = () => safe(() => localStorage.setItem(SESSION_KEY, "1"));
export const clearSession = () => safe(() => localStorage.removeItem(SESSION_KEY));
