# Video Submission Script Guide

This script will help you record a comprehensive video covering both deployment and product demonstration.

**Total Duration**: 15-20 minutes  
**Recording Tool**: OBS Studio / Loom / Zoom

---

## Part A: Deployment Explanation (8-10 minutes)

### 1. Introduction (30 seconds)

**Script**:
> "Hello! I'm [Your Name], and this is my submission for the Modex Assessment. I've built MediBook, a healthcare-focused doctor appointment booking system with robust concurrency handling. Let me walk you through the deployment process."

### 2. Project Overview (1 minute)

**Show**: GitHub repository

**Script**:
> "Here's the GitHub repository structure. We have a backend folder with Node.js/Express/PostgreSQL, and a frontend folder with React and TypeScript. The project includes comprehensive documentation, system design, and deployment configurations."

**Show on screen**:
- Folder structure
- README.md
- SYSTEM_DESIGN.md

### 3. Database Setup (2 minutes)

**Show**: Neon/Supabase dashboard

**Script**:
> "First, I set up the PostgreSQL database on Neon. I created a new project and ran the schema.sql file which creates four main tables: users, doctors, appointment_slots, and bookings. The schema includes indexes for performance and sample data for testing."

**Demonstrate**:
1. Show Neon dashboard
2. Open SQL editor
3. Show schema.sql content
4. Run a simple query: `SELECT * FROM doctors;`
5. Copy connection string

### 4. Backend Deployment (3 minutes)

**Show**: Render dashboard

**Script**:
> "For the backend, I'm using Render. I connected my GitHub repository and configured it to deploy from the backend folder. The build command is 'npm install' and start command is 'npm start'."

**Demonstrate**:
1. Show Render dashboard
2. Click through deployment settings
3. Show environment variables:
   - `NODE_ENV=production`
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET`
   - `CORS_ORIGIN`
4. Show deployment logs
5. Test API endpoint: `https://your-backend.onrender.com/health`
6. Show response in browser/Postman

### 5. Frontend Deployment (2 minutes)

**Show**: Vercel dashboard

**Script**:
> "For the frontend, I'm using Vercel. I imported the repository, set the root directory to 'frontend', and configured the build settings. The only environment variable needed is REACT_APP_API_URL pointing to our backend."

**Demonstrate**:
1. Show Vercel dashboard
2. Show deployment settings
3. Show environment variable: `REACT_APP_API_URL`
4. Show build logs
5. Open deployed frontend URL

### 6. Connecting Frontend & Backend (1 minute)

**Script**:
> "To connect the frontend and backend, I updated the CORS_ORIGIN in the backend to match the Vercel URL, and set the API URL in the frontend environment variables. Let me verify the connection works."

**Demonstrate**:
1. Open browser Network tab
2. Navigate to frontend
3. Show API calls in Network tab
4. Show successful responses

### 7. Final Validation (30 seconds)

**Script**:
> "Everything is deployed and working. The frontend is live at [URL], backend at [URL], and the database is hosted on Neon. All features are functional in the production environment."

---

## Part B: Product Demonstration (8-10 minutes)

### 1. Product Objective (1 minute)

**Script**:
> "MediBook solves the problem of appointment booking in healthcare. Patients can easily find doctors, view available slots, and book appointments. The system prevents double-booking even under high concurrency, which is critical for healthcare."

### 2. Architecture Overview (2 minutes)

**Show**: Draw.io diagram or SYSTEM_DESIGN.md

**Script**:
> "The architecture consists of three layers: React frontend with TypeScript and Context API for state management, Express.js backend with JWT authentication, and PostgreSQL database with optimized indexes. The key innovation is the hybrid concurrency control using both pessimistic and optimistic locking."

**Explain**:
- Frontend: React + TypeScript + Context API
- Backend: Express.js + PostgreSQL
- Concurrency: Pessimistic locking (SELECT FOR UPDATE) + Optimistic locking (version field)
- Why this architecture: Scalable, maintainable, production-ready

### 3. User Flow Demo (3 minutes)

**Demonstrate**:

**A. Registration & Login**
> "Let me register as a new user. I'll enter my email and password. The system hashes the password with bcrypt and returns a JWT token."

1. Go to /register
2. Fill form
3. Show successful registration
4. Show redirect to home page

**B. Browse Doctors**
> "Now I can see all available doctors with their specializations and experience. Let me select Dr. Sarah Johnson, a cardiologist."

1. Show doctor list
2. Hover over cards
3. Click "Book Appointment"

**C. Book Appointment**
> "Here are the available time slots. I can see the date, time, and duration. Let me select a slot for tomorrow at 10 AM."

1. Show slot grid
2. Click on a slot (show selection highlight)
3. Fill patient information form
4. Click "Confirm Booking"
5. Show success message

**D. View Bookings**
> "I can view all my appointments here, filter by status, and cancel if needed."

1. Navigate to "My Appointments"
2. Show booking details
3. Demonstrate filter dropdown
4. Show cancel functionality

### 4. Admin Flow Demo (2 minutes)

**Demonstrate**:

**A. Admin Login**
> "Now let me log in as an admin. Admins have additional capabilities."

1. Logout
2. Login with admin credentials
3. Show admin menu item

**B. Add Doctor**
> "I can add new doctors to the system with their details."

1. Click "Add New Doctor"
2. Fill form (name, specialization, email, etc.)
3. Submit
4. Show doctor added to list

**C. Create Slots**
> "The bulk slot creation feature lets me create a week's worth of appointments in seconds."

1. Click "Create Appointment Slots"
2. Select doctor
3. Set date range (e.g., next week)
4. Set time range (9 AM - 5 PM)
5. Set duration (30 minutes)
6. Submit
7. Show success message with count

### 5. Innovation Highlights (1 minute)

**Script**:
> "What makes this unique? First, the healthcare focus with doctor-patient workflow. Second, the robust concurrency handling - I use a hybrid approach with database-level locks and version checking. Third, the bulk slot creation saves admins hours of work. Fourth, clean TypeScript architecture with proper error handling and validation."

**Show**:
- Open `backend/routes/bookings.js`
- Highlight concurrency code:
  ```javascript
  BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  SELECT * FROM appointment_slots WHERE id = $1 FOR UPDATE;
  // ... booking logic
  UPDATE appointment_slots SET is_booked = TRUE, version = version + 1
  WHERE id = $1 AND version = $2;
  ```

### 6. Concurrency Test (1 minute)

**Script**:
> "Let me demonstrate the concurrency handling. I'll open two browser tabs and try to book the same slot simultaneously."

**Demonstrate**:
1. Open two browser tabs side by side
2. Navigate both to same doctor
3. Select same slot in both
4. Fill forms in both
5. Click submit in both at the same time
6. Show: One succeeds, one fails with "Slot already booked"

### 7. Error Handling Demo (30 seconds)

**Script**:
> "The system handles errors gracefully. Let me show what happens with invalid inputs."

**Demonstrate**:
1. Try booking without selecting slot
2. Try invalid email format
3. Try booking past slot
4. Show user-friendly error messages

### 8. Closing (30 seconds)

**Script**:
> "That's MediBook - a production-ready appointment booking system with healthcare focus, robust concurrency handling, and clean architecture. The code is well-documented, fully deployed, and ready for scale. Thank you for watching!"

---

## Recording Tips

### Before Recording

- [ ] Test all features work in production
- [ ] Prepare browser tabs in advance
- [ ] Clear browser cache and cookies
- [ ] Close unnecessary tabs/applications
- [ ] Test microphone and screen recording
- [ ] Have a glass of water nearby

### During Recording

- [ ] Speak clearly and at moderate pace
- [ ] Zoom in on important code sections
- [ ] Use cursor to highlight what you're discussing
- [ ] Pause briefly between sections
- [ ] Show enthusiasm and confidence
- [ ] If you make a mistake, pause and continue (edit later)

### After Recording

- [ ] Review the video
- [ ] Add timestamps in description (optional)
- [ ] Upload to YouTube (unlisted) or Google Drive
- [ ] Test the link works
- [ ] Add link to README.md

---

## Video Checklist

### Deployment Section
- [ ] Showed GitHub repository
- [ ] Explained folder structure
- [ ] Demonstrated database setup
- [ ] Showed backend deployment on Render
- [ ] Showed frontend deployment on Vercel
- [ ] Explained environment variables
- [ ] Tested deployed URLs
- [ ] Showed API calls working

### Product Section
- [ ] Explained product objective
- [ ] Showed architecture diagram
- [ ] Demonstrated user registration/login
- [ ] Showed doctor browsing
- [ ] Demonstrated booking flow
- [ ] Showed booking management
- [ ] Demonstrated admin features
- [ ] Highlighted concurrency handling
- [ ] Showed error handling
- [ ] Demonstrated concurrent booking test

### Quality
- [ ] Audio is clear
- [ ] Screen is visible
- [ ] Duration is 15-20 minutes
- [ ] No long pauses or dead air
- [ ] Professional presentation
- [ ] Covered all required points

---

## Sample Video Description

```
MediBook - Doctor Appointment Booking System | Modex Assessment

This video demonstrates the complete deployment and functionality of MediBook, a healthcare-focused appointment booking platform with robust concurrency handling.

Timestamps:
0:00 - Introduction
0:30 - Project Overview
1:30 - Database Setup (Neon)
3:30 - Backend Deployment (Render)
6:30 - Frontend Deployment (Vercel)
8:30 - Product Demonstration
10:30 - Admin Features
12:30 - Concurrency Handling Demo
14:00 - Innovation Highlights
15:00 - Closing

Tech Stack:
- Frontend: React, TypeScript, Context API
- Backend: Node.js, Express.js, PostgreSQL
- Deployment: Vercel, Render, Neon

GitHub: https://github.com/Tathagt/medibook-appointment-system
Live Demo: [Your deployed URL]

Built by: Tathagat
Email: ttb7271945@gmail.com
```

---

**Good luck with your recording! 🎥**
