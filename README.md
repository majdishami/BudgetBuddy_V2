# Financial Management Application

A comprehensive financial management application that empowers users with advanced reporting, data visualization, and intelligent financial insights.

## Features

- Advanced date-based transaction tracking
- Intelligent transaction state management
- PDF and Excel report generation
- Responsive and accessible design
- AI-powered financial insights
- Secure data management with clear data functionality

## Local Development Setup

1. **Prerequisites**
   - Node.js 20.x or later
   - PostgreSQL 16.x
   - Git

2. **Clone the Repository**
   ```bash
   git clone <your-repository-url>
   cd <repository-name>
   ```

3. **Environment Setup**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your PostgreSQL credentials
   # DATABASE_URL="postgresql://username:password@localhost:5432/financedb"
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Database Setup**
   ```bash
   # Create the database
   createdb financedb

   # Push the schema to the database
   npm run db:push
   ```

6. **Start the Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Deployment on Replit

1. Create a new Repl and import this repository
2. The application will automatically:
   - Install required dependencies
   - Set up the PostgreSQL database
   - Start the development server

Note: On Replit, the database connection and environment variables are automatically configured. You don't need to set up a .env file.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production application
- `npm run db:push` - Push schema changes to the database
- `npm run db:studio` - Open Drizzle Studio for database management

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Application environment (development/production)
- `PORT` - Server port (defaults to 5000)

## Tech Stack

- React with TypeScript
- PostgreSQL with Drizzle ORM
- Vite build system
- Express.js backend
- TanStack Query for data fetching
- shadcn/ui for components

## Database Backup and Restore

The application includes built-in functionality for data management:

1. **Backup Data**
   - Use the "Backup" option in the Data Sync menu
   - Downloads a JSON file containing all your data

2. **Restore Data**
   - Use the "Restore" option in the Data Sync menu
   - Select a previously created backup file
   - The application will validate and restore your data

3. **Clear Data**
   - Use the "Clear Database" option to reset all data
   - Make sure to create a backup before clearing data

## Troubleshooting

### Local Development
- Ensure PostgreSQL is running and accessible
- Verify your DATABASE_URL in .env is correct
- Check that port 5000 is available

### Replit Development
- The database and environment are automatically configured
- No additional setup is required
- Use the built-in console for debugging