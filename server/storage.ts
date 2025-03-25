import { Client, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { eq, sql } from 'drizzle-orm'; // Import eq and sql
import { drizzle } from 'drizzle-orm/neon-serverless'; // Correct import for drizzle with neon-serverless
import { expenses, categories, incomes, type Category, type Expense, type Income, type InsertCategory, type InsertExpense, type InsertIncome } from '../shared/schema'; // Update import path and types

// Only do this in Node.js environments where WebSocket is not defined globally
neonConfig.webSocketConstructor = ws;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(client);

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Incomes
  getIncomes(): Promise<Income[]>;
  getIncome(id: number): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: number, income: Partial<InsertIncome>): Promise<Income>;
  deleteIncome(id: number): Promise<void>;

  // Data Management
  clearAllData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    if (!updated) throw new Error('Category not found');
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    if (!result) throw new Error('Category not found');
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updated] = await db
      .update(expenses)
      .set(expense)
      .where(eq(expenses.id, id))
      .returning();
    if (!updated) throw new Error('Expense not found');
    return updated;
  }

  async deleteExpense(id: number): Promise<void> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    if (!result) throw new Error('Expense not found');
  }

  // Incomes
  async getIncomes(): Promise<Income[]> {
    return await db.select().from(incomes);
  }

  async getIncome(id: number): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income;
  }

  async createIncome(income: InsertIncome): Promise<Income> {
    const [newIncome] = await db.insert(incomes).values(income).returning();
    return newIncome;
  }

  async updateIncome(id: number, income: Partial<InsertIncome>): Promise<Income> {
    const [updated] = await db
      .update(incomes)
      .set(income)
      .where(eq(incomes.id, id))
      .returning();
    if (!updated) throw new Error('Income not found');
    return updated;
  }

  async deleteIncome(id: number): Promise<void> {
    const result = await db.delete(incomes).where(eq(incomes.id, id));
    if (!result) throw new Error('Income not found');
  }

  // Data Management
  async clearAllData(): Promise<void> {
    await db.execute(sql`TRUNCATE TABLE categories CASCADE`);
    await db.execute(sql`TRUNCATE TABLE expenses CASCADE`);
    await db.execute(sql`TRUNCATE TABLE incomes CASCADE`);
  }
}

export const storage = new DatabaseStorage();