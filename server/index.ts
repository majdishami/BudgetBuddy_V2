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
dotenv.config({ path: fs.existsSync(envPath) ? envPath : path.resolve(process.cwd(), '.env.example') });

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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
};

// Enhanced CORS configuration
const validateCorsOrigins = (): string[] => {
  const origins: string[] = [];
  
  if (process.env.VITE_PORT) {
    origins.push(`http://localhost:${process.env.VITE_PORT}`);
  }
  
  if (process.env.VITE_BACKEND_URL) {
    origins.push(process.env.VITE_BACKEND_URL);
  } else if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3001');
  }
  
  return origins.length > 0 ? origins : ['http://localhost:5174', 'http://localhost:3001'];
};

const corsOptions: CorsOptions = {
  origin: validateCorsOrigins(),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400
};

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    log(`Rate limit exceeded for IP: ${req.ip}`, 'SECURITY', 'warn');
    res.status(429).json({
      error: 'Too many requests',
      windowMs: '15 minutes',
      limit: process.env.NODE_ENV === 'production' ? 100 : 200,
      remaining: 0
    });
  }
});

// Initialize Express app
const app: Express = express();
const server = createServer(app);

// Database connection pool
const pool = new pg.Pool(databaseConfig);

// Test database connection with retry logic
async function testDatabaseConnection(retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT NOW()');
      log('Database connected successfully', 'DATABASE');
      return;
    } catch (err) {
      if (i === retries - 1) {
        log(`Database connection failed after ${retries} attempts: ${err instanceof Error ? err.message : 'Unknown error'}`, 'DATABASE', 'error');
        throw err;
      }
      log(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms...`, 'DATABASE', 'warn');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : [])],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", "data:", 'https://*.amazonaws.com'],
      connectSrc: [
        "'self'",
        `ws://localhost:${process.env.PORT || 3001}`,
        `http://localhost:${process.env.PORT || 3001}`,
        ...(process.env.VITE_BACKEND_URL ? [process.env.VITE_BACKEND_URL] : [])
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Additional security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cors(corsOptions));
app.use('/api/', apiLimiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, 'REQUEST');
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// API Endpoints
app.get('/api/expenses', async (req, res, next) => {
  try {
    const { year, month, category_id, limit = '100' } = req.query;
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

    query += ' ORDER BY date DESC LIMIT $' + (params.length + 1);
    params.push(Math.min(parseInt(limit as string, 10) || 100));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Error handling middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    log(`Error: ${err.message}\n${err.stack}`, 'ERROR', 'error');
    res.status(500).json({
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { 
        details: err.message,
        stack: err.stack 
      })
    });
  } else {
    log(`Unknown error occurred: ${JSON.stringify(err)}`, 'ERROR', 'error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 404 handler
app.use((req, res) => {
  const availableRoutes = [
    '/api/health',
    '/api/expenses',
  ];
  
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { availableRoutes })
  });
});

// Graceful shutdown
function shutdown() {
  log('Shutting down gracefully...', 'SERVER');
  
  const shutdownTimeout = setTimeout(() => {
    log('Forcing shutdown due to timeout', 'SERVER', 'warn');
    process.exit(1);
  }, 10000);

  server.close(async () => {
    try {
      await pool.end();
      clearTimeout(shutdownTimeout);
      log('Database pool closed', 'DATABASE');
      process.exit(0);
    } catch (err) {
      log(`Error closing database pool: ${err instanceof Error ? err.message : 'Unknown error'}`, 'DATABASE', 'error');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Vite development server setup
async function setupVite() {
  if (process.env.NODE_ENV === 'production') return;

  let retries = 3;
  
  while (retries > 0) {
    try {
      const vite = await createViteServer({
        ...viteConfig,
        configFile: false,
        server: { 
          middlewareMode: true,
          hmr: {
            port: 24678
          }
        },
        appType: 'custom'
      });
      
      app.use(vite.middlewares);
      log('Vite development server attached', 'VITE');
      return;
    } catch (err) {
      retries--;
      if (retries === 0) {
        log(`Vite setup failed after 3 attempts: ${err instanceof Error ? err.message : 'Unknown error'}`, 'VITE', 'error');
        throw err;
      }
      log(`Vite setup failed, ${retries} attempts remaining...`, 'VITE', 'warn');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && NODE_ENV !== 'test') {
  log(`Missing required environment variables: ${missingVars.join(', ')}`, 'CONFIG', 'error');
  process.exit(1);
}

// Main startup sequence
async function startServer() {
  try {
    await testDatabaseConnection();
    await setupVite();
    
    if (NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, '../dist/client');
      if (!fs.existsSync(distPath)) {
        throw new Error(`Production build not found at ${distPath}`);
      }
      
      app.use(express.static(distPath, { maxAge: '1y', immutable: true }));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
      log(`Serving production build from ${distPath}`, 'SERVER');
    }

    server.listen(PORT, () => {
      log(`Server running in ${NODE_ENV} mode on port ${PORT}`, 'SERVER');
      log(`Backend URL: ${process.env.VITE_BACKEND_URL || `http://localhost:${PORT}`}`, 'CONFIG');
      log(`Frontend Port: ${process.env.VITE_PORT || '5174'}`, 'CONFIG');
    });
    
    // Handle startup errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${PORT} is already in use`, 'SERVER', 'error');
      } else {
        log(`Server error: ${err.message}`, 'SERVER', 'error');
      }
      process.exit(1);
    });
  } catch (err) {
    log(`Server startup failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'SERVER', 'error');
    process.exit(1);
  }
}

startServer();