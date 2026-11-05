import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import express from 'express';
import pool from './db.js';
import AppError from './utils/AppError.js';
import { errorHandler } from './middleware/errorHandler.js';
import groupsRouter from './routes/groups.js';
import plantsRouter from './routes/plants.js';
import wateringsRouter from './routes/waterings.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import uploadsRouter from './routes/uploads.js';
import cron from 'node-cron';
import reportsRouter from './routes/reports.js';
import cronRouter from './routes/cron.js';
import { sendOverdueReminders } from './utils/reminders.js';

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy
app.use(helmet({ contentSecurityPolicy: false }));
app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: { message: 'Too many attempts, try again later' }
}));

app.use(express.json());
app.use(express.static('public'));



app.use('/api/auth', authRouter);                       // public
app.use('/api/groups', requireAuth, groupsRouter);      // login required
app.use('/api/plants', requireAuth, plantsRouter);
app.use('/api/waterings', requireAuth, wateringsRouter);
app.use('/api/uploads', requireAuth, uploadsRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/cron', cronRouter);            // no login, protected by secret
// automatic reminder every Monday 08:00 (Addis Ababa time)
if (process.env.ENABLE_CRON === 'true') {
    cron.schedule('0 8 * * 1', () => {
        sendOverdueReminders().then(r => console.log('Reminders:', r)).catch(console.error);
    }, { timezone: 'Africa/Addis_Ababa' });
}
// Test: server + database
app.get('/api/ping', async (req, res) => {
    const result = await pool.query('SELECT NOW() AS time');
    res.json({ message: 'GreenTeam server + database connected 🌱', time: result.rows[0].time });
});

// Test: see the error handler working
app.get('/api/test-error', () => {
    throw new AppError('This is a test error', 400);
});

// Unknown API routes
app.use('/api', (req, res, next) => next(new AppError('Route not found', 404)));

// Must be LAST
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));