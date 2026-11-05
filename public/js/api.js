// register the service worker (pages work offline)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
}

export function clearCache() {
    Object.keys(localStorage)
        .filter(k => k.startsWith('cache:'))
        .forEach(k => localStorage.removeItem(k));
}

export async function api(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const token = localStorage.getItem('token');

    let res;
    try {
        res = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        });
    } catch (err) {
        // offline: use the last saved copy of GET requests
        if (method === 'GET') {
            const cached = localStorage.getItem('cache:' + path);
            if (cached) return JSON.parse(cached);
        }
        throw err;
    }

    if (res.status === 401 && !path.startsWith('/api/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        location.href = '/index.html';
        return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Error');

    if (method === 'GET') {
        try { localStorage.setItem('cache:' + path, JSON.stringify(data)); } catch { }
    }
    return data;
}

export async function uploadPhoto(blob) {
    const form = new FormData();
    form.append('photo', blob, 'photo.jpg');
    const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data.url;
}