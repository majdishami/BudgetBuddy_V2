-- PostgreSQL Database Setup Script for Financial Management Application

-- Drop statements (commented out for safety - uncomment if needed)
-- WARNING: Uncommenting these will DELETE ALL YOUR DATA! Use with caution!
-- DROP DATABASE IF EXISTS financial_management;
-- DROP TABLE IF EXISTS expenses;
-- DROP TABLE IF EXISTS incomes;
-- DROP TABLE IF EXISTS categories;

-- Create the database if it doesn't exist
CREATE DATABASE financial_management;

-- Connect to the database
\c financial_management;

-- Drop tables if they exist
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS incomes;
DROP TABLE IF EXISTS categories;

-- Create Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,  -- Hex color code
    icon VARCHAR(50) NOT NULL
);

-- Create Expenses Table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'YEARLY', 'ONCE')),
    category_id INTEGER REFERENCES categories(id) NOT NULL
);

-- Create Incomes Table
CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'BIWEEKLY', 'TWICE_MONTHLY', 'ONCE')),
    source VARCHAR(50) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);

-- Insert initial categories
INSERT INTO categories (name, color, icon) VALUES
('Rent', '#3B93F5', 'home'),
('Groceries', '#4CAF50', 'shopping-cart'),
('Loans', '#FF5722', 'credit-card'),
('Car Insurance', '#9C27B0', 'car'),
('House Cleaning', '#795548', 'trash'),
('Credit Cards', '#F44336', 'credit-card'),
('Entertainment', '#2196F3', 'tv'),
('Internet', '#00BCD4', 'wifi'),
('Phone', '#E91E63', 'phone'),
('Utilities', '#FFC107', 'zap'),
('Insurance', '#673AB7', 'shield'),
('Other', '#607D8B', 'more-horizontal');

-- Insert Categories Data from Backup
INSERT INTO categories (id, name, color, icon) VALUES
(1, 'Rent', '#3B93F5', 'home'),
(2, 'Groceries', '#4CAF50', 'shopping-cart'),
(3, 'Loans', '#FF5722', 'credit-card'),
(4, 'Car Insurance', '#9C27B0', 'car'),
(5, 'House Cleaning', '#795548', 'trash'),
(6, 'Credit Cards', '#F44336', 'credit-card'),
(7, 'Entertainment', '#2196F3', 'tv'),
(8, 'Internet', '#00BCD4', 'wifi'),
(11, 'Phone', '#E91E63', 'phone'),
(13, 'Utilities', '#FFC107', 'zap'),
(14, 'Insurance', '#673AB7', 'shield'),
(15, 'Other', '#607D8B', 'more-horizontal')
ON CONFLICT DO NOTHING;

-- Insert Expenses Data from Backup
INSERT INTO expenses (id, name, amount, date, frequency, category_id) VALUES
(1, 'Rent', 3750.00, '2025-01-01', 'MONTHLY', 1),
(2, 'ATT Phone Bill ($115 Rund Roaming)', 429.00, '2025-01-01', 'MONTHLY', 11),
(3, 'Maid Service - Beginning of Month Payment', 120.00, '2025-01-01', 'MONTHLY', 5),
(4, 'Sling TV (CC 9550)', 75.00, '2025-01-03', 'MONTHLY', 7),
(5, 'Cox Internet', 81.00, '2025-01-06', 'MONTHLY', 8),
(6, 'Water Bill', 80.00, '2025-01-07', 'MONTHLY', 13),
(7, 'NV Energy Electrical ($100 winter months)', 250.00, '2025-01-07', 'MONTHLY', 13),
(8, 'TransAmerica Life Insurance', 188.00, '2025-01-09', 'MONTHLY', 14),
(9, 'Credit Card minimum payment', 225.00, '2025-01-14', 'MONTHLY', 6),
(10, 'Apple/Google/YouTube/etc 150+450 (CC 9550)', 600.00, '2025-01-14', 'MONTHLY', 6),
(11, 'Maid Service - Mid-Month Payment', 120.00, '2025-01-17', 'MONTHLY', 5),
(12, 'SoFi Personal Loan', 1915.00, '2025-01-17', 'MONTHLY', 3),
(13, 'Southwest Gas ($200 in winter/$45 in summer)', 75.00, '2025-01-17', 'MONTHLY', 13),
(14, 'Car Insurance- GEICO for 3 cars ($268 + $169 + $303 + $21)', 704.00, '2025-01-28', 'MONTHLY', 4),
(15, 'Expenses & Groceries charged on (CC 2647)', 3000.00, '2025-01-28', 'MONTHLY', 2),
(16, 'Cars annual registration', 650.00, '2025-07-16', 'YEARLY', 15),
(17, 'Jewelry Insurance 1st payment', 188.00, '2025-06-02', 'YEARLY', 14),
(18, 'Jewelry Insurance 2nd payment', 188.00, '2025-12-02', 'YEARLY', 14),
(19, 'Test expence1 only once', 100.00, '2025-01-14', 'ONCE', 15),
(20, 'Test expence2 only once', 100.00, '2025-01-15', 'ONCE', 15);

-- Insert Incomes Data from Backup
INSERT INTO incomes (id, name, amount, date, frequency, source) VALUES
(4, 'Salary - Beginning of Month', 4785.00, '2025-01-01', 'MONTHLY', 'MAJDI'),
(5, 'Salary - End of Month', 4785.00, '2025-01-31', 'MONTHLY', 'MAJDI'),
(6, 'Bi-weekly Salary', 2168.00, '2025-01-10', 'BIWEEKLY', 'RUBA');

-- Set the sequence values to continue after the existing data
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('expenses_id_seq', (SELECT MAX(id) FROM expenses));
SELECT setval('incomes_id_seq', (SELECT MAX(id) FROM incomes));

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