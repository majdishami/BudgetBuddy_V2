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

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

const app: Express = express();
const server = new Server(app);

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'financial_management',
  port: 5432,
});

// Enhanced CORS configuration
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Expenses endpoints with year filtering
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
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { name, amount, date, frequency, category_id } = req.body;
    const result = await pool.query(
      'INSERT INTO expenses (name, amount, date, frequency, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, amount, date, frequency, category_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.patch('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, date, frequency, category_id } = req.body;
    const result = await pool.query(
      'UPDATE expenses SET name = $1, amount = $2, date = $3, frequency = $4, category_id = $5 WHERE id = $6 RETURNING *',
      [name, amount, date, frequency, category_id, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Incomes endpoints with year filtering
app.get('/api/incomes', async (req, res) => {
  try {
    const { year } = req.query;
    let query = 'SELECT * FROM incomes';
    const params = [];

    if (year) {
      query += ' WHERE EXTRACT(YEAR FROM date::DATE) = $1';
      params.push(year);
    }

    query += ' ORDER BY date::DATE DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching incomes:', err);
    res.status(500).json({ error: 'Failed to fetch incomes' });
  }
});

app.post('/api/incomes', async (req, res) => {
  try {
    const { name, amount, date, frequency, source } = req.body;
    const result = await pool.query(
      'INSERT INTO incomes (name, amount, date, frequency, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, amount, date, frequency, source]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating income:', err);
    res.status(500).json({ error: 'Failed to create income' });
  }
});

app.patch('/api/incomes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, date, frequency, source } = req.body;
    const result = await pool.query(
      'UPDATE incomes SET name = $1, amount = $2, date = $3, frequency = $4, source = $5 WHERE id = $6 RETURNING *',
      [name, amount, date, frequency, source, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating income:', err);
    res.status(500).json({ error: 'Failed to update income' });
  }
});

app.delete('/api/incomes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM incomes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }
    
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting income:', err);
    res.status(500).json({ error: 'Failed to delete income' });
  }
});

// Categories endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories/restore', async (req, res) => {
  try {
    const { categories } = req.body;
    await pool.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE');
    
    for (const category of categories) {
      await pool.query(
        'INSERT INTO categories (name, color, icon) VALUES ($1, $2, $3)',
        [category.name, category.color, category.icon]
      );
    }
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error restoring categories:', err);
    res.status(500).json({ error: 'Failed to restore categories' });
  }
});

// Register additional routes
registerRoutes(app);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
setupVite(app, server).then(() => {
  serveStatic(app);

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});