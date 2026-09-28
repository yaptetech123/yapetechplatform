// Base de datos local en el navegador (IndexedDB).
// Se usa IndexedDB en lugar de localStorage porque permite guardar
// fotos y videos (localStorage tiene un límite de ~5 MB).

const DB_NAME = "yapetech";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("jobs")) {
        db.createObjectStore("jobs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("media")) {
        const media = db.createObjectStore("media", { keyPath: "id" });
        media.createIndex("jobId", "jobId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run(storeNames, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeNames, mode);
        let result;
        Promise.resolve(fn(tx)).then((r) => (result = r));
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

const reqToPromise = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const db = {
  getAllJobs() {
    return run(["jobs"], "readonly", (tx) => reqToPromise(tx.objectStore("jobs").getAll()));
  },

  putJob(job) {
    return run(["jobs"], "readwrite", (tx) => {
      tx.objectStore("jobs").put(job);
    });
  },

  async deleteJob(jobId) {
    return run(["jobs", "media"], "readwrite", async (tx) => {
      tx.objectStore("jobs").delete(jobId);
      const store = tx.objectStore("media");
      const keys = await reqToPromise(store.index("jobId").getAllKeys(jobId));
      keys.forEach((k) => store.delete(k));
    });
  },

  getMediaForJob(jobId) {
    return run(["media"], "readonly", (tx) =>
      reqToPromise(tx.objectStore("media").index("jobId").getAll(jobId))
    );
  },

  getAllMedia() {
    return run(["media"], "readonly", (tx) => reqToPromise(tx.objectStore("media").getAll()));
  },

  putMedia(items) {
    return run(["media"], "readwrite", (tx) => {
      const store = tx.objectStore("media");
      items.forEach((m) => store.put(m));
    });
  },

  deleteMedia(ids) {
    return run(["media"], "readwrite", (tx) => {
      const store = tx.objectStore("media");
      ids.forEach((id) => store.delete(id));
    });
  },

  clearAll() {
    return run(["jobs", "media"], "readwrite", (tx) => {
      tx.objectStore("jobs").clear();
      tx.objectStore("media").clear();
    });
  },
};
