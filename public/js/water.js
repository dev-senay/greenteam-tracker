import { applyI18n, setupLangButton, t } from './i18n.js';
import { api, uploadPhoto } from './api.js';
import { addItem } from './queue.js';
import { flushQueue, pendingCount } from './sync.js';

const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!user || !localStorage.getItem('token')) location.href = '/index.html';
if (user && user.role === 'student') location.href = '/dashboard.html';

const $ = (id) => document.getElementById(id);
let plants = [];
const membersCache = {};

// shrink a phone photo to max 1280px, JPEG 70%
async function compress(file, max = 1280, quality = 0.7) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function fillPlants(selectedId) {
    const q = $('plantSearch').value.trim().toLowerCase();
    const list = plants.filter(p =>
        !q || `${p.name} ${p.species} ${p.owner}`.toLowerCase().includes(q));

    const keep = selectedId ?? $('plantSelect').value;
    $('plantSelect').innerHTML = list
        .slice(0, 100)
        .map(p => `<option value="${p.id}">${p.name} · ${p.species} — ${p.owner}</option>`)
        .join('');
    if (keep && list.some(p => String(p.id) === String(keep))) $('plantSelect').value = keep;
}

async function loadMembers() {
    const plant = plants.find(p => String(p.id) === $('plantSelect').value);
    if (!plant) return;
    if (!membersCache[plant.group_id]) {
        membersCache[plant.group_id] = await api(`/api/groups/${plant.group_id}/members`);
    }
    const members = membersCache[plant.group_id];
    $('memberSelect').innerHTML = members
        .map(m => `<option value="${m.id}">${m.full_name}</option>`)
        .join('');
    // default: the plant's owner is usually the one who waters it
    const owner = members.find(m => m.full_name === plant.owner);
    $('memberSelect').value = owner ? owner.id : user.id;
}

function fillHealth() {
    const keep = $('health').value;
    $('health').innerHTML = ['healthy', 'needs_attention', 'critical']
        .map(h => `<option value="${h}">${h === 'critical' ? t('critical_status') : t(h)}</option>`)
        .join('');
    if (keep) $('health').value = keep;
}

function refreshTexts() {
    $('plantSearch').placeholder = t('search_plant');
    fillHealth();
}
async function showPending() {
    const n = await pendingCount();
    $('pending').textContent = n ? `⏳ ${n} ${t('pending')}` : '';
}

async function syncNow() {
    const r = await flushQueue();
    if (r.sent) $('success').textContent = `${t('synced')} ${r.sent}`;
    if (r.failed) $('error').textContent = `${t('sync_failed')} ${r.failed}`;
    await showPending();
}

window.addEventListener('online', syncNow);

$('plantSearch').addEventListener('input', () => { fillPlants(); loadMembers(); });
$('plantSelect').addEventListener('change', loadMembers);

$('photo').addEventListener('change', () => {
    const file = $('photo').files[0];
    const img = $('preview');
    if (!file) { img.style.display = 'none'; return; }
    img.src = URL.createObjectURL(file);
    img.style.display = 'block';
});

$('waterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('error').textContent = '';
    $('success').textContent = '';

    const plantId = Number($('plantSelect').value);
    if (!plantId) { $('error').textContent = t('choose_plant'); return; }

    $('saveBtn').disabled = true;
    $('saveBtn').textContent = t('saving');

    const data = {
        plant_id: plantId,
        watered_by: Number($('memberSelect').value) || undefined,
        health: $('health').value,
        note: $('note').value.trim() || undefined,
        watered_at: new Date().toISOString()
    };

    try {
        const file = $('photo').files[0];
        const photo = file ? await compress(file) : null;

        try {
            const photo_url = photo ? await uploadPhoto(photo) : undefined;
            await api('/api/waterings', { method: 'POST', body: JSON.stringify({ ...data, photo_url }) });
            $('success').textContent = t('saved');
        } catch (err) {
            if (!(err instanceof TypeError)) throw err;   // real error: show it
            await addItem({ data, photo });               // no internet: keep on the phone
            $('success').textContent = t('saved_offline');
            await showPending();
        }

        $('note').value = '';
        $('photo').value = '';
        $('preview').style.display = 'none';
        $('health').value = 'healthy';
    } catch (err) {
        $('error').textContent = err.message;
    } finally {
        $('saveBtn').disabled = false;
        $('saveBtn').textContent = t('save');
    }
});

async function init() {
    applyI18n();
    setupLangButton(refreshTexts);
    refreshTexts();
    showPending();

    try {
        plants = await api('/api/plants');
        const wanted = new URLSearchParams(location.search).get('plant');
        fillPlants(wanted);
        if (!$('plantSelect').value && $('plantSelect').options.length) $('plantSelect').selectedIndex = 0;
        await loadMembers();
        await syncNow();
    } catch (err) {
        $('error').textContent = err instanceof TypeError ? t('network') : err.message;
    }
}

init();