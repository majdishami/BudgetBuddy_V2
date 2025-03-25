-- Budget Tracking Application Database Schema
-- Generated on March 16, 2025

-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL,  -- Hex color code
    icon VARCHAR(255) NOT NULL
);

-- Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('Monthly', 'Yearly', 'Once')),
    category_id INTEGER REFERENCES categories(id)
);

-- Create Incomes Table
CREATE TABLE IF NOT EXISTS incomes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'BIWEEKLY', 'TWICE_MONTHLY', 'ONCE')),
    source VARCHAR(255) NOT NULL
);

-- Insert Categories Data
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
(15, 'Other', '#607D8B', 'more-horizontal');

-- Insert Expenses Data
INSERT INTO expenses (id, name, amount, date, frequency, category_id) VALUES
(1, 'Rent', 3750.00, '2025-01-01', 'Monthly', 1),
(2, 'ATT Phone Bill ($115 Rund Roaming)', 429.00, '2025-01-01', 'Monthly', 11),
(3, 'Maid Service - Beginning of Month Payment', 120.00, '2025-01-01', 'Monthly', 5),
(4, 'Sling TV (CC 9550)', 75.00, '2025-01-03', 'Monthly', 7),
(5, 'Cox Internet', 81.00, '2025-01-06', 'Monthly', 8),
(6, 'Water Bill', 80.00, '2025-01-07', 'Monthly', 13),
(7, 'NV Energy Electrical ($100 winter months)', 250.00, '2025-01-07', 'Monthly', 13),
(8, 'TransAmerica Life Insurance', 188.00, '2025-01-09', 'Monthly', 14),
(9, 'Credit Card minimum payment', 225.00, '2025-01-14', 'Monthly', 6),
(10, 'Apple/Google/YouTube/etc 150+450 (CC 9550)', 600.00, '2025-01-14', 'Monthly', 6),
(11, 'Maid Service - Mid-Month Payment', 120.00, '2025-01-17', 'Monthly', 5),
(12, 'SoFi Personal Loan', 1915.00, '2025-01-17', 'Monthly', 3),
(13, 'Southwest Gas ($200 in winter/$45 in summer)', 75.00, '2025-01-17', 'Monthly', 13),
(14, 'Car Insurance- GEICO for 3 cars ($268 + $169 + $303 + $21)', 704.00, '2025-01-28', 'Monthly', 4),
(15, 'Expenses & Groceries charged on (CC 2647)', 3000.00, '2025-01-28', 'Monthly', 2),
(16, 'Cars annual registration', 650.00, '2025-07-16', 'Yearly', 15),
(17, 'Jewelry Insurance 1st payment', 188.00, '2025-06-02', 'Yearly', 14),
(18, 'Jewelry Insurance 2nd payment', 188.00, '2025-12-02', 'Yearly', 14),
(19, 'Test expence1 only once', 100.00, '2025-01-14', 'Once', 15),
(20, 'Test expence2 only once', 100.00, '2025-01-15', 'Once', 15);

-- Insert Incomes Data
INSERT INTO incomes (id, name, amount, date, frequency, source) VALUES
(4, 'Salary - Beginning of Month', 4785.00, '2025-01-01', 'MONTHLY', 'MAJDI'),
(5, 'Salary - End of Month', 4785.00, '2025-01-31', 'MONTHLY', 'MAJDI'),
(6, 'Bi-weekly Salary', 2168.00, '2025-01-10', 'BIWEEKLY', 'RUBA');

-- Set the sequence values to continue after the existing data
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('expenses_id_seq', (SELECT MAX(id) FROM expenses));
SELECT setval('incomes_id_seq', (SELECT MAX(id) FROM incomes));
