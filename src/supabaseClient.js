import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Ayuda a detectar rápido un despliegue sin las variables de entorno
  // configuradas (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
  console.error(
    "Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "La app no podrá guardar ni leer datos."
  );
}

export const supabase = createClient(url, anonKey);

export const MEDIA_BUCKET = "media";
