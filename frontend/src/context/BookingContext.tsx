import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '../services/api';
import { Booking, BookingContextType } from '../types';

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
};

interface BookingProviderProps {
  children: ReactNode;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async (filters?: { status?: string; patient_email?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.patient_email) params.append('patient_email', filters.patient_email);
      
      const response = await api.get(`/bookings?${params.toString()}`);
      setBookings(response.data.bookings);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch bookings');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (data: {
    slot_id: number;
    patient_name: string;
    patient_email: string;
    patient_phone?: string;
  }): Promise<Booking> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/bookings', data);
      const newBooking = response.data.booking;
      setBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Booking failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, status: 'CANCELLED' as const } : booking
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: BookingContextType = {
    bookings,
    loading,
    error,
    fetchBookings,
    createBooking,
    cancelBooking,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};
