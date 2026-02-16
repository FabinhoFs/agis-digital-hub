import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middlewares/error.middleware';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';

const app = express();

// Segurança e parsing
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timezone: config.appTimezone, timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Erro 404
app.use((_req, res) => {
  res.status(404).json({ status: 404, message: 'Rota não encontrada' });
});

// Handler global de erros
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 AGIS Digital API rodando na porta ${config.port}`);
  console.log(`📍 Timezone: ${config.appTimezone}`);
  console.log(`🌐 Ambiente: ${config.nodeEnv}`);
});

export default app;
