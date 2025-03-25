import express, { type Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer, Server } from "http";
import { createServer as createViteServer, createLogger } from "vite";
import viteConfig from "../vite.config";
import { registerRoutes } from "./routes";
import dotenv from "dotenv";
import cors from 'cors';
import pg from 'pg';
import rateLimit from 'express-rate-limit';
import type { CorsOptions } from 'cors';

// Initialize environment variables
dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viteLogger = createLogger();

// Enhanced logging function
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// CORS configuration
const corsOptions: CorsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.PRODUCTION_URL as string] 
    : ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Security headers middleware
const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
};

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: ["*"],
    server: {
      port: 5000,
    },
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Initialize Express app
const app: Express = express();
const server = createServer(app);

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'financial_management',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// Test database connection
pool.query('SELECT NOW()')
  .then(() => log('Database connected successfully', 'database'))
  .catch((err: Error) => {
    log(`Database connection error: ${err.message}`, 'database');
    process.exit(1);
  });

// Middleware pipeline
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use('/api/', apiLimiter);

// Handle preflight requests
app.options('*', cors(corsOptions));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Expenses endpoints
app.get('/api/expenses', async (req, res) => {
  try {
    const { year } = req.query;
    let query = 'SELECT * FROM expenses';
    const params = [];

    if (year) {
      query += ' WHERE EXTRACT(YEAR FROM date::DATE) = $1';
      params.push(year);
    }

    query += ' ORDER BY date::DATE DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    const error = err as Error;
    log(`Error fetching expenses: ${error.message}`, 'database');
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// [Keep all your existing route handlers...]
// (Include all your existing POST, PATCH, DELETE endpoints here)

// Register additional routes
registerRoutes(app);

// Global error handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const error = err as Error;
  log(`Unhandled error: ${error.message}`, 'error');
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received. Shutting down gracefully...');
  pool.end()
    .then(() => {
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    })
    .catch((err: Error) => {
      log(`Error during shutdown: ${err.message}`, 'error');
      process.exit(1);
    });
});

// Start server
const PORT = process.env.PORT || 3001;

setupVite(app, server)
  .then(() => {
    serveStatic(app);
    server.listen(PORT, () => {
      log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err: Error) => {
    log(`Failed to start server: ${err.message}`, 'error');
    process.exit(1);
  });