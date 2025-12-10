-- MediBook Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS appointment_slots CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (for authentication)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  experience_years INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointment slots table with optimistic locking
CREATE TABLE appointment_slots (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  is_booked BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(doctor_id, slot_time)
);

-- Bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES appointment_slots(id) ON DELETE CASCADE,
  patient_name VARCHAR(255) NOT NULL,
  patient_email VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(20),
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
  booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_slots_doctor_time ON appointment_slots(doctor_id, slot_time);
CREATE INDEX idx_slots_booked ON appointment_slots(is_booked);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, password, role) VALUES 
('admin@medibook.com', '$2a$10$rQZ9vXJ5xKZ5YqZ5YqZ5YeZ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5Y', 'admin');

-- Insert sample doctors
INSERT INTO doctors (name, specialization, email, phone, experience_years) VALUES
('Dr. Sarah Johnson', 'Cardiologist', 'sarah.johnson@medibook.com', '+1-555-0101', 15),
('Dr. Michael Chen', 'Dermatologist', 'michael.chen@medibook.com', '+1-555-0102', 10),
('Dr. Emily Rodriguez', 'Pediatrician', 'emily.rodriguez@medibook.com', '+1-555-0103', 12),
('Dr. James Wilson', 'Orthopedic Surgeon', 'james.wilson@medibook.com', '+1-555-0104', 20),
('Dr. Priya Sharma', 'General Physician', 'priya.sharma@medibook.com', '+1-555-0105', 8);
