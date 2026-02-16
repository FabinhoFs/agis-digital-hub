import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/error.middleware';
import { requestId } from './middlewares/requestId.middleware';
import { globalRateLimit } from './middlewares/rateLimit.middleware';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';

const app = express();

// Request ID
app.use(requestId);

// Segurança HTTP
app.use(helmet());
app.disable('x-powered-by');
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Rate limit global
app.use(globalRateLimit);

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url, request_id: (req as any).requestId }, 'incoming request');
  next();
});

// Healthcheck
const startedAt = Date.now();
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ status: 404, message: 'Rota não encontrada' });
});

// Handler global de erros
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info({ port: config.port, timezone: config.appTimezone, env: config.nodeEnv }, '🚀 AGIS Digital API started');
});

export default app;
