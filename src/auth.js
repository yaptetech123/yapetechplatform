// Autenticación contra Supabase (tabla app_users). Las contraseñas se
// verifican y se cambian solo a través de funciones RPC del lado del
// servidor (verify_login / set_app_user_password) — el navegador nunca
// lee ni escribe el hash directamente.
import { supabase } from "./supabaseClient.js";

const SESSION_KEY = "yapetech:sesion";

const safe = (fn, fallback) => {
  try { return fn(); } catch { return fallback; }
};

export async function login(usuario, clave) {
  const { data, error } = await supabase.rpc("verify_login", {
    p_usuario: usuario.trim(),
    p_clave: clave,
  });
  if (error) throw error;
  const user = Array.isArray(data) ? data[0] : data;
  if (!user) return null;
  safe(() => localStorage.setItem(SESSION_KEY, JSON.stringify(user)));
  return user;
}

export const getSession = () => safe(() => JSON.parse(localStorage.getItem(SESSION_KEY)), null);
export const clearSession = () => safe(() => localStorage.removeItem(SESSION_KEY));
export const isAdmin = (user) => user?.rol === "admin";

// ---------------- Gestión de usuarios (solo para administradores) ----------------

export async function listUsers() {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, usuario, nombre, rol, activo, creado_en")
    .order("creado_en");
  if (error) throw error;
  return data;
}

export async function createUser({ usuario, clave, nombre, rol }) {
  const { data, error } = await supabase.rpc("create_app_user", {
    p_usuario: usuario.trim(),
    p_clave: clave,
    p_nombre: (nombre || "").trim(),
    p_rol: rol,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function updateUserInfo(id, { usuario, nombre, rol, activo }) {
  const patch = { actualizado_en: new Date().toISOString() };
  if (usuario !== undefined) patch.usuario = usuario.trim();
  if (nombre !== undefined) patch.nombre = nombre.trim();
  if (rol !== undefined) patch.rol = rol;
  if (activo !== undefined) patch.activo = activo;
  const { error } = await supabase.from("app_users").update(patch).eq("id", id);
  if (error) throw error;
}

export async function resetUserPassword(id, clave) {
  const { error } = await supabase.rpc("set_app_user_password", { p_id: id, p_clave: clave });
  if (error) throw error;
}

export async function deleteUser(id) {
  const { error } = await supabase.from("app_users").delete().eq("id", id);
  if (error) throw error;
}
