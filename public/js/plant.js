import { applyI18n, setupLangButton, t, getLang } from './i18n.js';
import { api } from './api.js';

if (!localStorage.getItem('token')) location.href = '/index.html';

const $ = (id) => document.getElementById(id);
let plant = null;

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function healthLabel(h) {
    return h === 'critical' ? t('critical_status') : t(h);
}

function render() {
    if (!plant) return;
    const locale = getLang() === 'am' ? 'am-ET' : 'en-GB';
    $('plantName').textContent = plant.name;
    $('plantInfo').innerHTML = `
    <p><strong>${esc(plant.species)}</strong></p>
    <p>${t('owner')}: ${esc(plant.owner)}</p>
    <p>${t('planted')}: ${new Date(plant.planted_on).toLocaleDateString(locale)}</p>`;

    $('history').innerHTML = plant.history.length
        ? plant.history.map(h => `
      <div class="history-item">
        <strong>${new Date(h.watered_at).toLocaleString(locale)}</strong>
        · ${healthLabel(h.health)}
        <small style="display:block;color:#666">${t('by')} ${esc(h.watered_by)}</small>
        ${h.note ? `<p>${esc(h.note)}</p>` : ''}
        ${h.photo_url && h.photo_url.startsWith('https://')
                ? `<img loading="lazy" src="${esc(h.photo_url)}" alt="">` : ''}
      </div>`).join('')
        : `<p>${t('no_history')}</p>`;
}

async function init() {
    applyI18n();
    setupLangButton(render);
    const id = new URLSearchParams(location.search).get('id');
    try {
        plant = await api(`/api/plants/${id}`);
        render();
    } catch (err) {
        $('history').textContent = err instanceof TypeError ? t('network') : err.message;
    }
}

init();