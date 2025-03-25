import express, { type Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer, Server } from "http";
import { createServer as createViteServer } from "vite";
import viteConfig from "../vite.config";
import dotenv from "dotenv";
import cors from 'cors';
import pg from 'pg';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { CorsOptions } from 'cors';

// Initialize environment variables with proper path
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: fs.existsSync(envPath) ? envPath : undefined });

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced logging function
function log(message: string, source = "SERVER", level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const levelMap = {
    info: '\x1b[36m', // cyan
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m' // red
  };
  console.log(`${levelMap[level]}[${timestamp}] [${source}] ${message}\x1b[0m`);
}

// Database configuration using either URL or individual parameters
const databaseConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      user: 'postgres',
      host: 'localhost',
      database: 'financial_management',
      password: process.env.DB_PASSWORD || 'your_postgres_password',
      port: 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };

// CORS configuration
const corsOptions: CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.PRODUCTION_URL || '']
    : [`http://localhost:${process.env.VITE_PORT || 5174}`],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later'
});

// Initialize Express app
const app: Express = express();
const server = createServer(app);

// Database connection pool
const pool = new pg.Pool(databaseConfig);

// Test database connection
pool.query('SELECT NOW()')
  .then(() => log('Database connected successfully', 'DATABASE'))
  .catch((err: Error) => {
    log(`Database connection error: ${err.message}`, 'DATABASE', 'error');
    process.exit(1);
  });

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cors(corsOptions));
app.use('/api/', apiLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  log(`${req.method} ${req.originalUrl}`, 'REQUEST');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

// API Endpoints
app.get('/api/expenses', async (req, res, next) => {
  try {
    const { year, month, category_id } = req.query;
    let query = 'SELECT * FROM expenses';
    const params = [];
    const conditions = [];

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM date) = $${conditions.length + 1}`);
      params.push(year);
    }
    if (month) {
      conditions.push(`EXTRACT(MONTH FROM date) = $${conditions.length + 1}`);
      params.push(month);
    }
    if (category_id) {
      conditions.push(`category_id = $${conditions.length + 1}`);
      params.push(category_id);
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Categories endpoints
app.route('/api/categories')
  .get(async (req, res, next) => {
    try {
      const result = await pool.query('SELECT * FROM categories ORDER BY name');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    try {
      const { name, color, icon } = req.body;
      const result = await pool.query(
        'INSERT INTO categories (name, color, icon) VALUES ($1, $2, $3) RETURNING *',
        [name, color, icon]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

// Error handling middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const error = err as Error;
  log(`Error: ${error.message}\n${error.stack}`, 'ERROR', 'error');
  res.status(500).json({
    error: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Graceful shutdown
function shutdown() {
  log('Shutting down gracefully...', 'SERVER');
  server.close(() => {
    pool.end()
      .then(() => log('Database pool closed', 'DATABASE'))
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Vite development server setup
async function setupVite() {
  if (process.env.NODE_ENV === 'production') return;

  try {
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    log('Vite development server attached', 'VITE');
  } catch (err) {
    log(`Vite setup failed: ${(err as Error).message}`, 'VITE', 'error');
    process.exit(1);
  }
}

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

setupVite()
  .then(() => {
    if (NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, '../dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
      log(`Serving production build from ${distPath}`, 'SERVER');
    }

    server.listen(PORT, () => {
      log(`Server running in ${NODE_ENV} mode on port ${PORT}`, 'SERVER');
      log(`Backend URL: ${process.env.VITE_BACKEND_URL}`, 'CONFIG');
      log(`Frontend Port: ${process.env.VITE_PORT}`, 'CONFIG');
    });
  })
  .catch(err => {
    log(`Server startup failed: ${(err as Error).message}`, 'SERVER', 'error');
    process.exit(1);
  });