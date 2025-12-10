# Deployment Guide

This guide walks you through deploying the MediBook application to production.

## Prerequisites

- GitHub account
- Render account (for backend)
- Vercel account (for frontend)
- PostgreSQL database (Neon/Supabase/Railway)

## Step 1: Database Setup

### Option A: Neon (Recommended)

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Run the schema:
```bash
psql "your-connection-string" -f backend/migrations/schema.sql
```

### Option B: Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor
4. Paste and run the contents of `backend/migrations/schema.sql`
5. Copy the connection details from Settings > Database

### Option C: Railway

1. Go to [railway.app](https://railway.app)
2. Create new project > Add PostgreSQL
3. Copy connection details
4. Connect via psql and run schema

## Step 2: Backend Deployment (Render)

### Method 1: Using Render Dashboard

1. Go to [render.com](https://render.com)
2. Click "New +" > "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: medibook-backend
   - **Root Directory**: backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or Starter for production)

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   DB_HOST=<your-db-host>
   DB_PORT=5432
   DB_NAME=<your-db-name>
   DB_USER=<your-db-user>
   DB_PASSWORD=<your-db-password>
   JWT_SECRET=<generate-random-string>
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Copy the deployed URL (e.g., `https://medibook-backend.onrender.com`)

### Method 2: Using render.yaml

1. The `backend/render.yaml` file is already configured
2. Go to Render Dashboard > "New +" > "Blueprint"
3. Connect repository and select `backend/render.yaml`
4. Update environment variables
5. Deploy

## Step 3: Frontend Deployment (Vercel)

### Method 1: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: build

5. Add Environment Variable:
   ```
   REACT_APP_API_URL=https://medibook-backend.onrender.com/api
   ```

6. Click "Deploy"
7. Wait for deployment (2-5 minutes)
8. Copy the deployed URL (e.g., `https://medibook.vercel.app`)

### Method 2: Using Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

## Step 4: Update CORS

1. Go back to Render dashboard
2. Update `CORS_ORIGIN` environment variable with your Vercel URL
3. Redeploy the backend

## Step 5: Test the Deployment

1. Visit your frontend URL
2. Register a new account
3. Try logging in
4. Test booking flow

### Common Issues

**Issue**: CORS errors
- **Solution**: Ensure CORS_ORIGIN in backend matches frontend URL exactly

**Issue**: Database connection failed
- **Solution**: Check database credentials and ensure database is accessible

**Issue**: 404 on refresh
- **Solution**: Ensure `vercel.json` rewrites are configured

**Issue**: API calls failing
- **Solution**: Check REACT_APP_API_URL is set correctly

## Step 6: Create Admin User

Since the schema includes a default admin, you can use:
- Email: `admin@medibook.com`
- Password: `admin123`

Or create a new admin via API:
```bash
curl -X POST https://your-backend-url/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password",
    "role": "admin"
  }'
```

## Step 7: Monitoring

### Render Monitoring
- Go to your service dashboard
- Check "Logs" tab for errors
- Monitor "Metrics" for performance

### Vercel Monitoring
- Go to your project dashboard
- Check "Deployments" for build logs
- Monitor "Analytics" for usage

## Production Checklist

- [ ] Database backups enabled
- [ ] Environment variables secured
- [ ] HTTPS enabled (automatic on Render/Vercel)
- [ ] CORS configured correctly
- [ ] Error logging set up
- [ ] Rate limiting enabled
- [ ] Admin account created
- [ ] Sample doctors added
- [ ] Test bookings working
- [ ] Mobile responsive tested

## Scaling Considerations

### When to Scale

Scale when you notice:
- Response times > 1 second
- Database connection pool exhausted
- High CPU/memory usage
- Frequent 503 errors

### How to Scale

**Render**:
- Upgrade to Starter/Standard plan
- Enable auto-scaling
- Add more instances

**Database**:
- Upgrade to larger instance
- Add read replicas
- Enable connection pooling

**Vercel**:
- Automatically scales
- Upgrade plan for more bandwidth

## Cost Estimates

### Free Tier (Development)
- Render: Free (with limitations)
- Vercel: Free (hobby plan)
- Neon: Free (1 project)
- **Total**: $0/month

### Production (Small Scale)
- Render: $7/month (Starter)
- Vercel: $20/month (Pro)
- Neon: $19/month (Pro)
- **Total**: $46/month

### Production (Medium Scale)
- Render: $25/month (Standard)
- Vercel: $20/month (Pro)
- Neon: $69/month (Business)
- **Total**: $114/month

## Support

If you encounter issues:
1. Check the logs in Render/Vercel dashboard
2. Verify environment variables
3. Test database connection
4. Check GitHub repository for updates

---

**Last Updated**: December 2024
