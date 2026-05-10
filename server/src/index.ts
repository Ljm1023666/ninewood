import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import { setupSocket } from './utils/socket.js';
import { startAllCronJobs } from './cron/index.js';
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

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins, methods: ['GET', 'POST'] },
});

app.set('io', io);

// Logging
app.use(requestLogger);

// Security
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Static files
app.use('/uploads', express.static(config.uploadDir));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/demands', demandRouter);
app.use('/api/orders', orderRouter);
app.use('/api/circles', circleRouter);
app.use('/api/deposits', depositRouter);
app.use('/api/messages', messageRouter);
app.use('/api/shorts', shortsRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/admin', adminRouter);

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Socket
setupSocket(io);

// Cron
startAllCronJobs();

httpServer.listen(config.port, () => {
  console.log(`[Ninewood] Server running on http://localhost:${config.port}`);
});
