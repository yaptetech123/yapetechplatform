export const BRANDS = [
  "Apple", "Samsung", "Xiaomi", "Redmi", "Poco", "Motorola", "Huawei", "Honor",
  "Oppo", "Realme", "Vivo", "OnePlus", "Google", "Nokia", "ZTE", "Tecno",
  "Infinix", "Lenovo", "Sony", "LG", "Otra",
];

export const DEVICE_TYPES = ["Celular", "Tablet"];

export const PAYMENT_METHODS = ["Yape", "Transferencia", "Plin", "Efectivo"];

export const REPAIR_TYPES = [
  "Cambio de pantalla",
  "Cambio de batería",
  "Pin / puerto de carga",
  "Cambio de tapa trasera",
  "Cámara",
  "Lente de cámara",
  "Parlante / auricular",
  "Micrófono",
  "Botones (power / volumen)",
  "Face ID / Touch ID / huella",
  "Placa / microelectrónica",
  "Daño por líquido",
  "Software / flasheo",
  "Desbloqueo de cuenta",
  "Señal / antena",
  "Mantenimiento / limpieza",
  "Diagnóstico",
  "Otro",
];

export const systemForBrand = (brand) => (brand === "Apple" ? "iOS" : "Android");

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export const currency = (n) =>
  "S/ " +
  (Number(n) || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const currencyShort = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000) return "S/ " + (v / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 }) + "k";
  return "S/ " + v.toLocaleString("es-PE", { maximumFractionDigits: 0 });
};

const pad = (n) => String(n).padStart(2, "0");

// Fecha y hora local en formato de <input type="datetime-local">
export const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const todayKey = () => nowLocal().slice(0, 10);

export const formatDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleString("es-PE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MONTHS_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const profitOf = (job) => (Number(job.costo) || 0) - (Number(job.inversion) || 0);

// Validación de IMEI (15 dígitos + dígito verificador Luhn)
export const isValidImei = (imei) => {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(imei[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

// Reduce el tamaño de las fotos antes de guardarlas (las fotos del celular
// suelen pesar 3–10 MB; así se guardan en ~300 KB sin perder detalle útil).
export async function compressImage(file, maxSide = 1920, quality = 0.82) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await loadImage(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    return file; // formatos no soportados (p. ej. HEIC en algunos navegadores)
  }
}

function loadImage(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadImgEl(file));
  }
  return loadImgEl(file);
}

function loadImgEl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export const dataURLToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

export const formatBytes = (b) => {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
