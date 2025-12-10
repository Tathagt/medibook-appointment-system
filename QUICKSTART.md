# Quick Start Guide

Get MediBook running locally in 5 minutes!

## Prerequisites

- Node.js v16+ installed
- PostgreSQL v12+ installed
- Git installed

## Step 1: Clone Repository

```bash
git clone https://github.com/Tathagt/medibook-appointment-system.git
cd medibook-appointment-system
```

## Step 2: Setup Database

```bash
# Create database
createdb medibook

# Run schema
psql -d medibook -f backend/migrations/schema.sql
```

## Step 3: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=medibook
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your_secret_key

# Start server
npm run dev
```

Backend will run on `http://localhost:5000`

## Step 4: Setup Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env
# REACT_APP_API_URL=http://localhost:5000/api

# Start development server
npm start
```

Frontend will run on `http://localhost:3000`

## Step 5: Test the Application

1. Open browser to `http://localhost:3000`
2. Register a new account
3. Browse doctors
4. Book an appointment!

## Default Admin Credentials

- Email: `admin@medibook.com`
- Password: `admin123`

## Common Issues

**Database connection failed**
```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env
```

**Port already in use**
```bash
# Change PORT in backend/.env
PORT=5001

# Update REACT_APP_API_URL in frontend/.env
REACT_APP_API_URL=http://localhost:5001/api
```

**Module not found**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Check [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for architecture details
- Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) to deploy to production
- Use [POSTMAN_COLLECTION.json](POSTMAN_COLLECTION.json) to test APIs

## Need Help?

- Check the logs in terminal
- Verify environment variables
- Ensure database is running
- Check GitHub issues

Happy coding! 🚀
