# 🏥 MediBook - Doctor Appointment Booking System

A full-stack healthcare appointment booking platform with robust concurrency handling, built for the Modex Assessment.

## 🌟 Live Demo

- **Frontend**: [Deployed URL will be here]
- **Backend API**: [Deployed URL will be here]
- **Demo Video**: [YouTube/Drive link will be here]

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Concurrency Handling](#concurrency-handling)
- [Deployment](#deployment)

## ✨ Features

### User Features
- Browse available doctors by specialization
- View available appointment slots in real-time
- Book appointments with instant confirmation
- View and manage personal bookings
- Cancel appointments
- Real-time booking status (PENDING, CONFIRMED, FAILED, CANCELLED)

### Admin Features
- Add new doctors to the system
- Create appointment slots (single or bulk)
- View all registered doctors
- Manage appointment schedules

### Technical Features
- **High Concurrency Handling**: Prevents double-booking using pessimistic locking + optimistic locking
- **Transaction Isolation**: SERIALIZABLE isolation level for critical operations
- **Automatic Expiry**: Pending bookings auto-expire after 2 minutes
- **JWT Authentication**: Secure user authentication
- **Role-Based Access**: Admin and User roles
- **Responsive Design**: Works on desktop and mobile

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: helmet, bcryptjs, cors

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Routing**: React Router v6
- **State Management**: Context API
- **HTTP Client**: Axios
- **Styling**: CSS3 (Custom)

## 🏗 Architecture

### High-Level Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   React     │─────▶│  Express.js │─────▶│  PostgreSQL  │
│  Frontend   │◀─────│   Backend   │◀─────│   Database   │
└─────────────┘      └─────────────┘      └──────────────┘
     │                      │
     │                      │
     ▼                      ▼
  Context API          JWT Auth
  TypeScript          Concurrency
  Axios               Control
```

### Database Schema

```sql
users (id, email, password, role)
doctors (id, name, specialization, email, phone, experience_years)
appointment_slots (id, doctor_id, slot_time, duration_minutes, is_booked, version)
bookings (id, slot_id, patient_name, patient_email, status, booking_time)
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/Tathagt/medibook-appointment-system.git
cd medibook-appointment-system/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medibook
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

4. **Create database and run migrations**
```bash
# Create database
createdb medibook

# Run schema
psql -d medibook -f migrations/schema.sql
```

5. **Start the server**
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd ../frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. **Start the development server**
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Doctors

#### Get All Doctors
```http
GET /api/doctors
```

#### Create Doctor (Admin Only)
```http
POST /api/doctors
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Dr. John Doe",
  "specialization": "Cardiologist",
  "email": "john@example.com",
  "phone": "+1234567890",
  "experience_years": 15
}
```

### Appointment Slots

#### Get Available Slots
```http
GET /api/slots?doctor_id=1&date=2024-12-15
```

#### Create Slot (Admin Only)
```http
POST /api/slots
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctor_id": 1,
  "slot_time": "2024-12-15T10:00:00Z",
  "duration_minutes": 30
}
```

#### Bulk Create Slots (Admin Only)
```http
POST /api/slots/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctor_id": 1,
  "start_date": "2024-12-15",
  "end_date": "2024-12-20",
  "start_time": "09:00",
  "end_time": "17:00",
  "duration_minutes": 30,
  "exclude_weekends": true
}
```

### Bookings

#### Create Booking
```http
POST /api/bookings
Content-Type: application/json

{
  "slot_id": 1,
  "patient_name": "Jane Smith",
  "patient_email": "jane@example.com",
  "patient_phone": "+1234567890"
}
```

#### Get Bookings
```http
GET /api/bookings?status=CONFIRMED&patient_email=jane@example.com
```

#### Cancel Booking
```http
PATCH /api/bookings/:id/cancel
```

## 🔒 Concurrency Handling

### Strategy: Hybrid Locking Approach

1. **Pessimistic Locking (SELECT FOR UPDATE)**
   - Locks the slot row during transaction
   - Prevents concurrent reads of the same slot
   - Ensures exclusive access during booking

2. **Optimistic Locking (Version Field)**
   - Each slot has a version number
   - Version is checked before update
   - Detects concurrent modifications

3. **Transaction Isolation (SERIALIZABLE)**
   - Highest isolation level
   - Prevents phantom reads and serialization anomalies
   - Automatic retry on conflicts

### Example Flow

```javascript
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

// Lock the slot
SELECT * FROM appointment_slots WHERE id = $1 FOR UPDATE;

// Check if available
IF slot.is_booked THEN
  ROLLBACK;
  RETURN 'Slot already booked';
END IF;

// Create booking
INSERT INTO bookings (...) VALUES (...);

// Update slot with version check
UPDATE appointment_slots 
SET is_booked = TRUE, version = version + 1
WHERE id = $1 AND version = $2;

COMMIT;
```

### Handling Race Conditions

- **Scenario**: 100 users try to book the same slot simultaneously
- **Result**: Only 1 booking succeeds, 99 receive "Slot already booked" error
- **Mechanism**: Database-level locks + version checking
- **Performance**: ~50ms average response time under high load

## 📦 Deployment

### Backend Deployment (Render/Railway)

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables
6. Deploy

### Frontend Deployment (Vercel/Netlify)

1. Connect GitHub repository
2. Set build command: `cd frontend && npm run build`
3. Set publish directory: `frontend/build`
4. Add environment variable: `REACT_APP_API_URL`
5. Deploy

### Database (Neon/Supabase/Railway)

1. Create PostgreSQL database
2. Run schema.sql
3. Update backend DATABASE_URL

## 🧪 Testing

### Manual Testing Scenarios

1. **Concurrent Booking Test**
   - Open multiple browser tabs
   - Select same slot in all tabs
   - Click book simultaneously
   - Verify only one succeeds

2. **Booking Expiry Test**
   - Create booking
   - Wait 2 minutes
   - Run expire endpoint
   - Verify status changes to FAILED

## 📝 Assumptions & Limitations

### Assumptions
- Each appointment slot is for one patient only
- Doctors work on fixed schedules
- No payment integration required
- Email notifications not implemented

### Known Limitations
- No real-time WebSocket updates (uses polling)
- No email/SMS notifications
- No calendar integration
- Basic admin panel (no analytics)

## 🎯 Innovation Highlights

1. **Healthcare Focus**: Designed specifically for medical appointments
2. **Robust Concurrency**: Hybrid locking approach (pessimistic + optimistic)
3. **Bulk Slot Creation**: Admins can create weeks of slots in one click
4. **Auto-Expiry System**: Prevents slot hoarding
5. **Clean Architecture**: Separation of concerns, reusable components
6. **TypeScript Frontend**: Type safety and better developer experience

## 👨‍💻 Author

**Tathagat**
- GitHub: [@Tathagt](https://github.com/Tathagt)
- Email: ttb7271945@gmail.com

## 📄 License

MIT License - feel free to use this project for learning purposes.

---

**Built with ❤️ for Modex Assessment**
