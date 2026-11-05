import { applyI18n, setupLangButton, t, getLang } from './i18n.js';
import { api } from './api.js';
import { flushQueue } from './sync.js';

const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!user || !localStorage.getItem('token')) location.href = '/index.html';

const OVERDUE_DAYS = 7;
let plants = [];
let groups = [];

const $ = (id) => document.getElementById(id);

function daysSince(dateString) {
    if (!dateString) return null;
    return Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
}

function isOverdue(p) {
    const d = daysSince(p.last_watered);
    return d === null || d >= OVERDUE_DAYS;
}

function lastText(p) {
    const d = daysSince(p.last_watered);
    if (d === null) return t('never');
    if (d === 0) return t('today');
    return `${d} ${t('days_ago')}`;
}

function badge(p) {
    if (!p.last_health) return `<span class="badge none">${t('never')}</span>`;
    const cls = { healthy: 'ok', needs_attention: 'warn', critical: 'bad' }[p.last_health];
    const label = p.last_health === 'critical' ? t('critical_status') : t(p.last_health);
    return `<span class="badge ${cls}">${label}</span>`;
}

// escape text from the database before putting it into HTML
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function plantRow(p) {
    const canWater = user.role !== 'student';
    return `
    <div class="plant">
      <div>
        <strong>${esc(p.name)}</strong> · ${esc(p.species)}
        <small>${t('owner')}: ${esc(p.owner)} · ${lastText(p)}</small>
      </div>
      <div>
        ${badge(p)}
        ${canWater ? `<a class="btn-small" href="/water.html?plant=${p.id}">💧</a>` : ''}
      </div>
    </div>`;
}


function render() {
    const groupId = $('groupFilter').hidden ? '' : $('groupFilter').value;
    const status = $('statusFilter').value;

    const scoped = groupId ? plants.filter(p => String(p.group_id) === groupId) : plants;

    $('statTotal').textContent = scoped.length;
    $('statOverdue').textContent = scoped.filter(isOverdue).length;
    $('statCritical').textContent = scoped.filter(p => p.last_health === 'critical').length;

    const overdue = scoped.filter(isOverdue).slice(0, 30);
    $('overdueList').innerHTML = overdue.length
        ? overdue.map(plantRow).join('')
        : `<p>${t('nothing')}</p>`;

    const filtered = status ? scoped.filter(p => p.last_health === status) : scoped;
    $('plantList').innerHTML = filtered.length
        ? filtered.slice(0, 100).map(plantRow).join('')
        : `<p>${t('nothing')}</p>`;
}

function buildFilters() {
    const keepStatus = $('statusFilter').value;
    $('statusFilter').innerHTML =
        `<option value="">${t('all_status')}</option>` +
        ['healthy', 'needs_attention', 'critical']
            .map(s => `<option value="${s}">${s === 'critical' ? t('critical_status') : t(s)}</option>`)
            .join('');
    $('statusFilter').value = keepStatus;

    if (user.role === 'admin') {
        const keepGroup = $('groupFilter').value;
        $('groupFilter').hidden = false;
        $('groupFilter').innerHTML =
            `<option value="">${t('all_groups')}</option>` +
            groups.map(g => `<option value="${g.id}">${esc(getLang() === 'am' ? g.name_am : g.name_en)}</option>`).join('');
        $('groupFilter').value = keepGroup;
    }
}

function refreshTexts() {
    $('who').textContent = user.full_name;
    buildFilters();
    render();
}

async function init() {
    $('waterLink').hidden = user.role === 'student';
    applyI18n();
    setupLangButton(refreshTexts);
    $('who').textContent = user.full_name;
    await flushQueue().catch(() => { });
    window.addEventListener('online', () => flushQueue().then(() => location.reload()));

    $('logoutBtn').onclick = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        clearCache();
        location.href = '/index.html';
    };

    $('groupFilter').onchange = render;
    $('statusFilter').onchange = render;

    try {
        [plants, groups] = await Promise.all([api('/api/plants'), api('/api/groups')]);
        buildFilters();
        render();
    } catch (err) {
        $('plantList').textContent = err instanceof TypeError ? t('network') : err.message;
    }
}

init();