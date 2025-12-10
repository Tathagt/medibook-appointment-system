export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  email: string;
  phone?: string;
  experience_years?: number;
}

export interface AppointmentSlot {
  id: number;
  doctor_id: number;
  slot_time: string;
  duration_minutes: number;
  is_booked: boolean;
  doctor_name?: string;
  specialization?: string;
}

export interface Booking {
  id: number;
  slot_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  booking_time: string;
  confirmed_at?: string;
  slot_time?: string;
  duration_minutes?: number;
  doctor_name?: string;
  specialization?: string;
}

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export interface BookingContextType {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  fetchBookings: (filters?: { status?: string; patient_email?: string }) => Promise<void>;
  createBooking: (data: {
    slot_id: number;
    patient_name: string;
    patient_email: string;
    patient_phone?: string;
  }) => Promise<Booking>;
  cancelBooking: (id: number) => Promise<void>;
}
