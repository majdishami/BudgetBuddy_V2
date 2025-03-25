-- PostgreSQL Database Setup Script for Financial Management Application
-- This script will create the necessary database and tables for the application.
-- To use this script:
-- 1. Ensure PostgreSQL is installed and running
-- 2. Run this script as a PostgreSQL superuser: psql -U postgres -f database_setup.sql
-- 3. The script will create a new database and all required tables

-- Drop statements (commented out for safety - uncomment if needed)
-- WARNING: Uncommenting these will DELETE ALL YOUR DATA! Use with caution!
-- DROP DATABASE IF EXISTS financial_management;
-- DROP TABLE IF EXISTS expenses;
-- DROP TABLE IF EXISTS incomes;
-- DROP TABLE IF EXISTS categories;

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS financial_management;

-- Connect to the database
\c financial_management;

-- Create the categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,     -- Stores hex color codes (#FFFFFF)
    icon VARCHAR(50) NOT NULL      -- Stores icon identifiers
);

-- Create the expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- Supports up to 99,999,999.99
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- Valid values: MONTHLY, YEARLY, ONCE
    category_id INTEGER NOT NULL,   -- References categories(id), NOT NULL to match schema.ts
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Create the incomes table
CREATE TABLE IF NOT EXISTS incomes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- Supports up to 99,999,999.99
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- Valid values: BIWEEKLY, TWICE_MONTHLY, MONTHLY, ONCE
    source VARCHAR(50) NOT NULL     -- Source of income (e.g., 'Salary', 'Freelance')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);

-- Add some default categories
-- These categories provide a starting point for expense tracking
INSERT INTO categories (name, color, icon) VALUES
    ('Housing', '#FF5733', 'home'),
    ('Transportation', '#33FF57', 'car'),
    ('Food', '#3357FF', 'utensils'),
    ('Utilities', '#FF33F5', 'bolt'),
    ('Healthcare', '#33FFF5', 'heart'),
    ('Entertainment', '#F5FF33', 'music')
ON CONFLICT DO NOTHING;

-- Add comments for reference
COMMENT ON TABLE categories IS 'Stores expense categories with their visual properties';
COMMENT ON TABLE expenses IS 'Stores all expenses with their frequency and category';
COMMENT ON TABLE incomes IS 'Stores all income sources and their frequency';

COMMENT ON COLUMN expenses.frequency IS 'Valid values: MONTHLY, YEARLY, ONCE';
COMMENT ON COLUMN incomes.frequency IS 'Valid values: BIWEEKLY, TWICE_MONTHLY, MONTHLY, ONCE';

-- Installation completed successfully
SELECT 'Database setup completed successfully.' as status;

-- Next steps after installation:
-- 1. Set up your environment variables in .env file
-- Example DATABASE_URL format:
--   DATABASE_URL=postgres://username:password@localhost:5432/financial_management
-- 2. Update DATABASE_URL with your local database connection string
-- 3. Start the application using npm run dev

-- Note: The frequency values in expenses and incomes tables are strictly enforced 
-- by the application through TypeScript enums. Make sure to use only the valid values
-- listed in the column comments above.