// Capa de datos: guarda todo en Supabase (Postgres + Storage), así que los
// trabajos, fotos y videos se ven igual desde cualquier dispositivo y no se
// pierden aunque se borre el navegador.
import { supabase, MEDIA_BUCKET } from "./supabaseClient.js";

const jobToRow = (job) => ({
  id: job.id,
  fecha: job.fecha,
  dni: job.dni,
  cliente_nombre: job.clienteNombre,
  telefono: job.telefono || "",
  tipo_equipo: job.tipoEquipo,
  marca: job.marca,
  sistema: job.sistema,
  modelo: job.modelo,
  numero_serie: job.numeroSerie || "",
  imei1: job.imei1 || "",
  imei2: job.imei2 || "",
  tipo_reparacion: job.tipoReparacion,
  descripcion: job.descripcion,
  costo: job.costo,
  inversion: job.inversion,
  metodo_pago: job.metodoPago || "",
  estado: job.estado,
  creado_en: job.creadoEn || new Date().toISOString(),
  actualizado_en: job.actualizadoEn || new Date().toISOString(),
});

const rowToJob = (r) => ({
  id: r.id,
  fecha: r.fecha,
  dni: r.dni,
  clienteNombre: r.cliente_nombre,
  telefono: r.telefono,
  tipoEquipo: r.tipo_equipo,
  marca: r.marca,
  sistema: r.sistema,
  modelo: r.modelo,
  numeroSerie: r.numero_serie,
  imei1: r.imei1,
  imei2: r.imei2,
  tipoReparacion: r.tipo_reparacion,
  descripcion: r.descripcion,
  costo: Number(r.costo),
  inversion: Number(r.inversion),
  metodoPago: r.metodo_pago,
  estado: r.estado,
  creadoEn: r.creado_en,
  actualizadoEn: r.actualizado_en,
});

const rowToMedia = (r) => ({
  id: r.id,
  jobId: r.job_id,
  kind: r.kind,
  name: r.name,
  size: r.size,
  path: r.path,
  url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(r.path).data.publicUrl,
});

const partToRow = (part) => ({
  id: part.id,
  tipo_repuesto: part.tipoRepuesto,
  marca: part.marca || "",
  modelo: part.modelo,
  detalle: part.detalle || "",
  cantidad: part.cantidad,
  costo: part.costo === "" || part.costo === undefined ? null : part.costo,
  precio_venta: part.precioVenta === "" || part.precioVenta === undefined ? null : part.precioVenta,
  creado_en: part.creadoEn || new Date().toISOString(),
  actualizado_en: new Date().toISOString(),
});

const rowToPart = (r) => ({
  id: r.id,
  tipoRepuesto: r.tipo_repuesto,
  marca: r.marca,
  modelo: r.modelo,
  detalle: r.detalle,
  cantidad: Number(r.cantidad),
  costo: r.costo === null ? "" : Number(r.costo),
  precioVenta: r.precio_venta === null ? "" : Number(r.precio_venta),
  creadoEn: r.creado_en,
  actualizadoEn: r.actualizado_en,
});

const sanitizeName = (name) => (name || "archivo").replace(/[^a-zA-Z0-9._-]/g, "_");

async function uploadMedia(item) {
  const path = `${item.jobId}/${item.id}-${sanitizeName(item.name)}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, item.blob, {
    upsert: true,
    contentType: item.blob.type || undefined,
  });
  if (error) throw error;
  return path;
}

export const db = {
  async getAllJobs() {
    const { data, error } = await supabase.from("jobs").select("*").order("fecha", { ascending: false });
    if (error) throw error;
    return data.map(rowToJob);
  },

  async putJob(job) {
    const { error } = await supabase.from("jobs").upsert(jobToRow(job));
    if (error) throw error;
    return job;
  },

  async deleteJob(jobId) {
    const items = await db.getMediaForJob(jobId);
    if (items.length) {
      await supabase.storage.from(MEDIA_BUCKET).remove(items.map((m) => m.path));
    }
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) throw error;
  },

  async getMediaForJob(jobId) {
    const { data, error } = await supabase.from("media").select("*").eq("job_id", jobId).order("creado_en");
    if (error) throw error;
    return data.map(rowToMedia);
  },

  async getMediaForJobs(jobIds) {
    if (!jobIds.length) return [];
    const { data, error } = await supabase.from("media").select("*").in("job_id", jobIds).order("creado_en");
    if (error) throw error;
    return data.map(rowToMedia);
  },

  async getAllMedia() {
    const { data, error } = await supabase.from("media").select("*");
    if (error) throw error;
    return data.map(rowToMedia);
  },

  async putMedia(items) {
    for (const item of items) {
      const path = await uploadMedia(item);
      const { error } = await supabase.from("media").upsert({
        id: item.id,
        job_id: item.jobId,
        kind: item.kind,
        name: item.name || "",
        size: item.size || 0,
        path,
      });
      if (error) throw error;
    }
  },

  async deleteMedia(ids) {
    if (!ids.length) return;
    const { data, error: selErr } = await supabase.from("media").select("id, path").in("id", ids);
    if (selErr) throw selErr;
    if (data.length) await supabase.storage.from(MEDIA_BUCKET).remove(data.map((m) => m.path));
    const { error } = await supabase.from("media").delete().in("id", ids);
    if (error) throw error;
  },

  async getAllParts() {
    const { data, error } = await supabase.from("parts").select("*").order("creado_en", { ascending: false });
    if (error) throw error;
    return data.map(rowToPart);
  },

  async putPart(part) {
    const { error } = await supabase.from("parts").upsert(partToRow(part));
    if (error) throw error;
    return part;
  },

  async deletePart(partId) {
    const { error } = await supabase.from("parts").delete().eq("id", partId);
    if (error) throw error;
  },

  async clearAll() {
    const allMedia = await db.getAllMedia();
    if (allMedia.length) {
      await supabase.storage.from(MEDIA_BUCKET).remove(allMedia.map((m) => m.path));
    }
    await supabase.from("media").delete().neq("id", "");
    await supabase.from("jobs").delete().neq("id", "");
    await supabase.from("parts").delete().neq("id", "");
  },
};
