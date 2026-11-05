const DB = 'greenteam-queue';
const STORE = 'waterings';

function open() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () =>
            req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function run(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
    }));
}

export const addItem = (item) => run('readwrite', s => s.add(item));
export const getAll = () => run('readonly', s => s.getAll());
export const removeItem = (id) => run('readwrite', s => s.delete(id));
export const updateItem = (item) => run('readwrite', s => s.put(item));