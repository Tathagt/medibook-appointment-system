import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useBooking } from '../context/BookingContext';
import { AppointmentSlot, Doctor } from '../types';
import '../styles/BookingPage.css';

const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createBooking } = useBooking();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [success, setSuccess] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  useEffect(() => {
    if (id) {
      fetchDoctorAndSlots();
    }
  }, [id]);

  const fetchDoctorAndSlots = async () => {
    try {
      const [doctorRes, slotsRes] = await Promise.all([
        api.get(`/doctors/${id}`),
        api.get(`/slots?doctor_id=${id}`)
      ]);
      
      setDoctor(doctorRes.data.doctor);
      setSlots(slotsRes.data.slots);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load booking information');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slotId: number) => {
    setSelectedSlot(slotId);
    setBookingError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setBookingError('Please select a time slot');
      return;
    }

    setBookingError('');
    setLoading(true);

    try {
      await createBooking({
        slot_id: selectedSlot,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone
      });
      
      setSuccess(true);
      setTimeout(() => navigate('/my-bookings'), 2000);
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !doctor) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (success) return <div className="success-message">Booking confirmed! Redirecting...</div>;

  return (
    <div className="booking-page-container">
      {doctor && (
        <div className="doctor-info">
          <h2>Book Appointment with {doctor.name}</h2>
          <p className="specialization">{doctor.specialization}</p>
        </div>
      )}

      <div className="booking-content">
        <div className="slots-section">
          <h3>Available Time Slots</h3>
          {slots.length === 0 ? (
            <div className="empty-state">No available slots</div>
          ) : (
            <div className="slots-grid">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`slot-card ${selectedSlot === slot.id ? 'selected' : ''}`}
                  onClick={() => handleSlotClick(slot.id)}
                >
                  <div className="slot-time">
                    {new Date(slot.slot_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="slot-duration">{slot.duration_minutes} min</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="booking-form-section">
          <h3>Patient Information</h3>
          {bookingError && <div className="error-message">{bookingError}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !selectedSlot}>
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
