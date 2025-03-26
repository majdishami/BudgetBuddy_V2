import express, { type Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import viteConfig from "./vite.config"; // Ensure the path is correct
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

// Database configuration
const databaseConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Enhanced CORS configuration
const corsOptions: CorsOptions = {
  origin: [
    `http://localhost:${process.env.VITE_PORT || 5174}`,
    'http://localhost:3001' // Ensure this points to http://localhost:3001
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Rate limiting with improved security
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Reduced from 200
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
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

// Security middleware with enhanced CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: [
        "'self'",
        'http://localhost:3001' // Ensure this points to http://localhost:3001
      ]
    }
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cors(corsOptions));
app.use('/api/', apiLimiter);

// Request logging middleware
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

// Root path endpoint
app.get('/', (req, res) => {
  log('Root path accessed', 'REQUEST');
  res.status(200).send('Welcome to BudgetBuddy API');
});

// API Endpoints (keep your existing endpoints exactly as they were)
app.get('/api/expenses', async (req, res, next) => {
  try {
    const { year, month, category_id } = req.query;
    let query = 'SELECT * FROM expenses';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM date) = $${conditions.length + 1}`);
      params.push(year as string);
    }
    if (month) {
      conditions.push(`EXTRACT(MONTH FROM date) = $${conditions.length + 1}`);
      params.push(month as string);
    }
    if (category_id) {
      conditions.push(`category_id = $${conditions.length + 1}`);
      params.push(category_id as string);
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

// Keep all your existing API endpoints exactly as they were
// (incomes, categories, etc.)

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
      .catch(err => log(`Error closing database pool: ${err.message}`, 'DATABASE', 'error'))
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
const PORT = 3001; // Ensure this is set to 3001
const NODE_ENV = process.env.NODE_ENV || 'development';

setupVite()
  .then(() => {
    if (NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, '../dist/client');
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