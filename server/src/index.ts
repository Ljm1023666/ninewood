import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as Sentry from '@sentry/node';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import { globalLimiter } from './middleware/rate-limit.js';
import { setupSocket } from './utils/socket.js';
import { startAllCronJobs } from './cron/index.js';
import { setupSwagger } from './swagger.js';
import { connectRedis } from './lib/redis.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { demandRouter } from './routes/demand.js';
import { orderRouter } from './routes/order.js';
import { circleRouter } from './routes/circle.js';
import { depositRouter } from './routes/deposit.js';
import { messageRouter } from './routes/message.js';
import { shortsRouter } from './routes/shorts.js';
import { complaintRouter } from './routes/complaint.js';
import { adminRouter } from './routes/admin.js';
import { aiRouter } from './routes/ai.js';
import { agentRouter } from './routes/agent.js';
import { reviewRouter } from './routes/review.js';
import { captchaRouter } from './routes/captcha.js';
import { regionRouter } from './routes/region.js';
import { tagRouter } from './routes/tag.js';
import { certificationRouter } from './routes/certification.js';
import { registerNinewoodTools } from './services/agent/tools.js';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0,
  integrations: [Sentry.expressIntegration()],
});

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins, methods: ['GET', 'POST'] },
});

app.set('io', io);

// Logging
app.use(requestLogger);

// Sentry request handler — added via integrations[] in Sentry.init() above

// Rate limiting — applied to all /api routes
app.use('/api', globalLimiter);

// Security
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files
app.use('/uploads', express.static(config.uploadDir));

// Swagger docs
setupSwagger(app);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/demands', demandRouter);
app.use('/api/orders', orderRouter);
app.use('/api/regions', regionRouter);
app.use('/api/tags', tagRouter);
app.use('/api/certification', certificationRouter);
app.use('/api/circles', circleRouter);
app.use('/api/deposits', depositRouter);
app.use('/api/messages', messageRouter);
app.use('/api/shorts', shortsRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);
app.use('/api/agent', agentRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/captcha', captchaRouter);

// 注册 Ninewood 业务工具
registerNinewoodTools();

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Sentry error handler (must be before generic error handler)
Sentry.setupExpressErrorHandler(app);

// Error handler
app.use(errorHandler);

// Socket
setupSocket(io);

// Cron
startAllCronJobs();

// Redis
connectRedis();

httpServer.listen(config.port, () => {
  console.log(`[Ninewood] Server running on http://localhost:${config.port}`);
});
