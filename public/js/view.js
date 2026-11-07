import { applyI18n, setupLangButton, t, getLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
let report = [], plants = [];

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
async function get(path) {
    const res = await fetch(path);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Error');
    return data;
}
const days = (d) => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : null;
const hLabel = (h) => h === 'critical' ? t('critical_status') : t(h);

function renderReport() {
    const am = getLang() === 'am';
    $('reportTable').innerHTML =
        `<tr><th>${t('group')}</th><th>${t('total')}</th><th>✅</th><th>⚠️</th><th>🔴</th><th>${t('overdue')}</th></tr>` +
        report.map(r => `<tr><td>${esc(am ? r.name_am : r.name_en)}</td><td>${r.total}</td>
      <td>${r.healthy}</td><td>${r.needs_attention}</td><td>${r.critical}</td>
      <td class="${r.overdue ? 'r' : ''}">${r.overdue}</td></tr>`).join('');
}

function buildFilters() {
    const am = getLang() === 'am';
    const keepG = $('groupSelect').value;
    $('groupSelect').innerHTML = report
        .map(g => `<option value="${g.id}">${esc(am ? g.name_am : g.name_en)}</option>`).join('');
    if (keepG) $('groupSelect').value = keepG;

    const keepS = $('statusFilter').value;
    $('statusFilter').innerHTML = `<option value="">${t('all_status')}</option>` +
        ['healthy', 'needs_attention', 'critical']
            .map(s => `<option value="${s}">${hLabel(s)}</option>`).join('');
    $('statusFilter').value = keepS;
}

function renderPlants() {
    const s = $('statusFilter').value;
    const list = s ? plants.filter(p => p.last_health === s) : plants;
    $('plantList').innerHTML = list.length ? list.map(p => {
        const d = days(p.last_watered);
        const when = d === null ? t('never') : d === 0 ? t('today') : `${d} ${t('days_ago')}`;
        const cls = { healthy: 'ok', needs_attention: 'warn', critical: 'bad' }[p.last_health] || 'none';
        const label = p.last_health ? hLabel(p.last_health) : t('never');
        return `<div class="plant" data-id="${p.id}" style="cursor:pointer;flex-wrap:wrap">
      <div><strong>${esc(p.name)}</strong> · ${esc(p.species)}
        <small>${t('owner')}: ${esc(p.owner)} · ${when}</small></div>
      <span class="badge ${cls}">${label}</span>
      <div class="hist" style="width:100%"></div></div>`;
    }).join('') : `<p>${t('nothing')}</p>`;
}

$('plantList').addEventListener('click', async (e) => {
    const row = e.target.closest('.plant');
    if (!row) return;
    const box = row.querySelector('.hist');
    if (box.innerHTML) { box.innerHTML = ''; return; }
    const locale = getLang() === 'am' ? 'am-ET' : 'en-GB';
    const hist = await get(`/api/public/plants/${row.dataset.id}`);
    box.innerHTML = hist.length ? hist.map(h => `
    <div class="history-item"><strong>${new Date(h.watered_at).toLocaleString(locale)}</strong>
      · ${hLabel(h.health)}
      <small style="display:block;color:#666">${t('by')} ${esc(h.watered_by)}</small>
      ${h.note ? `<p>${esc(h.note)}</p>` : ''}
      ${h.photo_url && h.photo_url.startsWith('https://')
            ? `<img loading="lazy" src="${esc(h.photo_url)}" alt="">` : ''}</div>`).join('')
        : `<p>${t('no_history')}</p>`;
});

async function loadPlants() {
    plants = await get(`/api/public/plants?group_id=${$('groupSelect').value}`);
    renderPlants();
}

function refresh() { renderReport(); buildFilters(); renderPlants(); }

async function init() {
    applyI18n();
    setupLangButton(refresh);
    try {
        report = await get('/api/public/report');
        renderReport();
        buildFilters();
        await loadPlants();
    } catch (err) {
        $('plantList').textContent = err.message;
    }
}
$('groupSelect').onchange = loadPlants;
$('statusFilter').onchange = renderPlants;
init();