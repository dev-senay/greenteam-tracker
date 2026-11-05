export async function sendTelegram(chatId, text) {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.description || 'Telegram send failed');
    }
}