import { applyI18n, setupLangButton, t } from './i18n.js';
import { api, clearCache } from './api.js';

if (localStorage.getItem('token')) location.href = '/dashboard.html';

applyI18n();
setupLangButton();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.getElementById('error');
    error.textContent = '';

    try {
        const data = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });
        clearCache();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        location.href = '/dashboard.html';
    } catch (err) {
        error.textContent = err instanceof TypeError ? t('network') : err.message;
    }
});