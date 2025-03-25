import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertExpenseSchema, insertIncomeSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Categories routes
  app.get("/api/categories", async (_req, res) => {
    console.log("Handling /api/categories GET");
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    console.log("Handling /api/categories POST");
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const category = await storage.createCategory(parsed.data);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    console.log("Handling /api/categories PATCH");
    const parsed = insertCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const category = await storage.updateCategory(Number(req.params.id), parsed.data);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(404).json({ error: "Category not found" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    console.log("Handling /api/categories DELETE");
    try {
      await storage.deleteCategory(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(404).json({ error: "Category not found" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", async (_req, res) => {
    console.log("Handling /api/expenses GET");
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    console.log("Handling /api/expenses POST");
    const parsed = insertExpenseSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error,
        message: "Invalid expense data",
        details: parsed.error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
      return;
    }

    try {
      const expense = await storage.createExpense(parsed.data);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({
        error: "Failed to create expense",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    console.log("Handling /api/expenses PATCH");
    const parsed = insertExpenseSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const expense = await storage.updateExpense(Number(req.params.id), parsed.data);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(404).json({ error: "Expense not found" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    console.log("Handling /api/expenses DELETE");
    try {
      await storage.deleteExpense(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(404).json({ error: "Expense not found" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    console.log("Handling /api/expenses GET by ID");
    try {
      const expense = await storage.getExpense(Number(req.params.id));
      if (expense) {
        res.json(expense);
      } else {
        res.status(404).json({ error: "Expense not found" });
      }
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  // Incomes routes
  app.get("/api/incomes", async (_req, res) => {
    console.log("Handling /api/incomes GET");
    try {
      const incomes = await storage.getIncomes();
      res.json(incomes);
    } catch (error) {
      console.error("Error fetching incomes:", error);
      res.status(500).json({ error: "Failed to fetch incomes" });
    }
  });

  app.post("/api/incomes", async (req, res) => {
    console.log("Handling /api/incomes POST");
    const parsed = insertIncomeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const income = await storage.createIncome(parsed.data);
      res.json(income);
    } catch (error) {
      console.error("Error creating income:", error);
      res.status(500).json({ error: "Failed to create income" });
    }
  });

  app.patch("/api/incomes/:id", async (req, res) => {
    console.log("Handling /api/incomes PATCH");
    const parsed = insertIncomeSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const income = await storage.updateIncome(Number(req.params.id), parsed.data);
      res.json(income);
    } catch (error) {
      console.error("Error updating income:", error);
      res.status(404).json({ error: "Income not found" });
    }
  });

  app.delete("/api/incomes/:id", async (req, res) => {
    console.log("Handling /api/incomes DELETE");
    try {
      await storage.deleteIncome(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting income:", error);
      res.status(404).json({ error: "Income not found" });
    }
  });

  // Clear all data endpoint
  app.post("/api/clear-data", async (_req, res) => {
    console.log("Handling /api/clear-data POST");
    try {
      await storage.clearAllData();
      res.status(200).json({ message: "All data cleared successfully" });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}