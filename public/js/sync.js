import { api, uploadPhoto } from './api.js';
import { getAll, removeItem, updateItem } from './queue.js';

let running = false;

export async function pendingCount() {
    return (await getAll()).filter(i => !i.failed).length;
}

export async function flushQueue() {
    if (running || !navigator.onLine) return { sent: 0, failed: 0 };
    running = true;
    let sent = 0, failed = 0;

    try {
        const items = (await getAll()).filter(i => !i.failed);
        for (const item of items) {
            try {
                let photo_url;
                if (item.photo) photo_url = await uploadPhoto(item.photo);
                await api('/api/waterings', {
                    method: 'POST',
                    body: JSON.stringify({ ...item.data, photo_url })
                });
                await removeItem(item.id);
                sent++;
            } catch (err) {
                if (err instanceof TypeError) break;       // still offline: try later
                item.failed = err.message;                 // rejected by the server: keep, don't retry
                await updateItem(item);
                failed++;
            }
        }
    } finally {
        running = false;
    }
    return { sent, failed };
}