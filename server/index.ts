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

// Enhanced logging function with production file logging
function log(message: string, source = "SERVER", level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const levelMap = {
    info: '\x1b[36m', // cyan
    warn: '\x1b[33m', // yellow
    error: '\x11b[31m' // red
  };
  const logMessage = `${levelMap[level]}[${timestamp}] [${source}] ${message}\x1b[0m`;
  console.log(logMessage);
  
  if (process.env.NODE_ENV === 'production') {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    fs.appendFileSync(path.join(logDir, 'app.log'), `${timestamp} [${source}] ${message}\n`);
  }
}

// Database configuration with enhanced settings
const databaseConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 20, // max connections
  min: 2 // min connections
};

// Enhanced CORS configuration with validation
const getCorsOrigins = (): string[] => {
  const origins = new Set<string>();
  
  // Add development origins
  if (process.env.NODE_ENV !== 'production') {
    origins.add(`http://localhost:${process.env.VITE_PORT || 5174}`);
    origins.add(`http://localhost:${process.env.PORT || 3001}`);
  }

  // Add production origins
  if (process.env.VITE_BACKEND_URL) origins.add(process.env.VITE_BACKEND_URL);
  if (process.env.VITE_FRONTEND_URL) origins.add(process.env.VITE_FRONTEND_URL);

  return Array.from(origins);
};

const corsOptions: CorsOptions = {
  origin: getCorsOrigins(),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Rate limiting with enhanced configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 500, // Higher limit in development
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Track all requests for analytics
  handler: (req, res) => {
    const maxRequests = process.env.NODE_ENV === 'production' ? 200 : 500;
    log(`Rate limit exceeded for IP: ${req.ip} Path: ${req.path}`, 'SECURITY', 'warn');
    res.status(429).json({
      error: 'Too many requests',
      window: '15 minutes',
      maxRequests: maxRequests,
      remaining: 0
    });
  }
});

// Initialize Express app
const app: Express = express();
const server = createServer(app);

// Database connection pool with error handling
const pool = new pg.Pool(databaseConfig);

// Enhanced database connection test with retries
async function testDatabaseConnection(retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT NOW()');
      log('Database connected successfully', 'DATABASE');
      return;
    } catch (err) {
      if (attempt === retries) {
        log(`Database connection failed after ${retries} attempts: ${err instanceof Error ? err.message : 'Unknown error'}`, 'DATABASE', 'error');
        throw err;
      }
      log(`Database connection attempt ${attempt} failed, retrying in ${delay}ms...`, 'DATABASE', 'warn');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Security middleware with enhanced CSP
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
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disabled for Vite compatibility
  crossOriginResourcePolicy: { policy: "same-site" }
}));

// Additional security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
  });
  next();
});

// Body parsing middleware with size limits
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cors(corsOptions));
app.use('/api/', apiLimiter);

// Enhanced request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    log(`${method} ${originalUrl} - ${res.statusCode} (${duration.toFixed(2)}ms) from ${ip}`, 'REQUEST');
  });
  
  next();
});

// Health check endpoint with DB verification
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown database error'
    });
  }
});

// API Endpoints with enhanced error handling
app.get('/api/expenses', async (req, res, next) => {
  try {
    const { year, month, category_id, limit = '100' } = req.query;
    let query = 'SELECT * FROM expenses';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    // Parameter validation
    if (year && !/^\d{4}$/.test(year as string)) {
      return res.status(400).json({ error: 'Invalid year format' });
    }
    if (month && !/^(0?[1-9]|1[0-2])$/.test(month as string)) {
      return res.status(400).json({ error: 'Invalid month format' });
    }

    // Build query conditions
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

    // Add pagination
    const limitValue = Math.min(parseInt(limit as string, 10) || 100);
    query += ' ORDER BY date DESC LIMIT $' + (params.length + 1);
    params.push(limitValue);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      meta: {
        count: result.rows.length,
        limit: limitValue
      }
    });
  } catch (err) {
    next(err);
  }
});

// Frontend route handling
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../dist/client');
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.redirect(`http://localhost:${process.env.VITE_PORT || 5174}`);
  }
});

// Error handling middleware with type safety
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof pg.DatabaseError) {
    log(`Database Error: ${err.message}\n${err.stack}`, 'DATABASE', 'error');
    res.status(500).json({
      error: 'Database Error',
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message,
        code: err.code
      })
    });
  } else if (err instanceof Error) {
    log(`Application Error: ${err.message}\n${err.stack}`, 'ERROR', 'error');
    res.status(500).json({
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message,
        stack: err.stack
      })
    });
  } else {
    log(`Unknown Error: ${JSON.stringify(err)}`, 'ERROR', 'error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 404 handler with SPA support
app.use((req, res) => {
  if (req.accepts('html')) {
    if (process.env.NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, '../dist/client');
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.redirect(`http://localhost:${process.env.VITE_PORT || 5174}${req.url}`);
    }
  } else if (req.accepts('json')) {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method,
      availableRoutes: ['/', '/api/health', '/api/expenses']
    });
  } else {
    res.status(404).send('Not Found');
  }
});

// Graceful shutdown with timeout
function shutdown() {
  log('Starting graceful shutdown...', 'SERVER');
  
  const shutdownTimeout = setTimeout(() => {
    log('Forcing shutdown due to timeout', 'SERVER', 'error');
    process.exit(1);
  }, 10000); // 10 second timeout

  server.close(async () => {
    try {
      log('Closing database pool...', 'SERVER');
      await pool.end();
      clearTimeout(shutdownTimeout);
      log('Shutdown complete', 'SERVER');
      process.exit(0);
    } catch (err) {
      log(`Error during shutdown: ${err instanceof Error ? err.message : 'Unknown error'}`, 'SERVER', 'error');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Vite development server setup with retries
async function setupVite() {
  if (process.env.NODE_ENV === 'production') return;

  let attempts = 0;
  const maxAttempts = 3;
  const retryDelay = 2000;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const vite = await createViteServer({
        ...viteConfig,
        configFile: false,
        server: {
          middlewareMode: true,
          hmr: {
            port: 24678,
            protocol: 'ws'
          },
          proxy: {
            '/api': {
              target: `http://localhost:${process.env.PORT || 3001}`,
              changeOrigin: true,
              secure: false
            }
          }
        },
        appType: 'custom'
      });

      app.use(vite.middlewares);
      log(`Vite development server attached (attempt ${attempts}/${maxAttempts})`, 'VITE');
      return;
    } catch (err) {
      if (attempts >= maxAttempts) {
        log(`Vite setup failed after ${maxAttempts} attempts: ${err instanceof Error ? err.message : 'Unknown error'}`, 'VITE', 'error');
        throw err;
      }
      log(`Vite setup attempt ${attempts} failed, retrying in ${retryDelay}ms...`, 'VITE', 'warn');
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Start server with validation
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Validate environment
    if (!process.env.DATABASE_URL && NODE_ENV !== 'test') {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Initialize services
    await testDatabaseConnection();
    await setupVite();

    // Production-specific setup
    if (NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, '../dist/client');
      if (!fs.existsSync(distPath)) {
        throw new Error(`Production build not found at ${distPath}`);
      }

      app.use(express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        index: false
      }));

      log(`Serving production build from ${distPath}`, 'SERVER');
    }

    // Start listening
    server.listen(PORT, () => {
      log(`Server running in ${NODE_ENV} mode on port ${PORT}`, 'SERVER');
      log(`Backend URL: http://localhost:${PORT}`, 'CONFIG');
      log(`Frontend URL: http://localhost:${process.env.VITE_PORT || 5174}`, 'CONFIG');
      log(`Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`, 'CONFIG');
    });

    // Handle server errors
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