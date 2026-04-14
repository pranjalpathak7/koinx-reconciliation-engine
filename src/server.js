import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import reconciliationRoutes from './routes/reconciliationRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware (Optional but great for debugging)
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', reconciliationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Reconciliation Engine is running' });
});

// Global Error Handler (Must be the last middleware)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
});