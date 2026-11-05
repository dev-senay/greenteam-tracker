import { Router } from 'express';
import AppError from '../utils/AppError.js';
import { sendOverdueReminders } from '../utils/reminders.js';

const router = Router();

// POST /api/cron/reminders   header: x-cron-secret
router.post('/reminders', async (req, res) => {
    if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
        throw new AppError('Forbidden', 403);
    }
    res.json(await sendOverdueReminders());
});

export default router;