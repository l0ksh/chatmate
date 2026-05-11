import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import listenersRoutes from './routes/listeners.js';
import bookingsRoutes from './routes/bookings.js';
import paymentsRoutes from './routes/payments.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('ChatMate API is running. Use /api/health to verify service status.');
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'ChatMate API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/listeners', listenersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`ChatMate API running on port ${port}`);
});
