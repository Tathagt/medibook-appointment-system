import React, { useEffect, useState } from 'react';
import { useBooking } from '../context/BookingContext';
import '../styles/MyBookings.css';

const MyBookings: React.FC = () => {
  const { bookings, loading, error, fetchBookings, cancelBooking } = useBooking();
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadBookings();
  }, [filter]);

  const loadBookings = () => {
    const filters = filter !== 'all' ? { status: filter } : undefined;
    fetchBookings(filters);
  };

  const handleCancel = async (id: number) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await cancelBooking(id);
      } catch (err) {
        console.error('Cancel failed:', err);
      }
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'status-confirmed';
      case 'PENDING': return 'status-pending';
      case 'FAILED': return 'status-failed';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="my-bookings-container">
      <h2>My Appointments</h2>

      <div className="filter-section">
        <label>Filter by status:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {loading && <div className="loading">Loading bookings...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && bookings.length === 0 && (
        <div className="empty-state">No bookings found</div>
      )}

      <div className="bookings-list">
        {bookings.map((booking) => (
          <div key={booking.id} className="booking-card">
            <div className="booking-header">
              <h3>{booking.doctor_name}</h3>
              <span className={`status-badge ${getStatusClass(booking.status)}`}>
                {booking.status}
              </span>
            </div>

            <div className="booking-details">
              <p><strong>Specialization:</strong> {booking.specialization}</p>
              <p><strong>Patient:</strong> {booking.patient_name}</p>
              <p><strong>Email:</strong> {booking.patient_email}</p>
              {booking.patient_phone && (
                <p><strong>Phone:</strong> {booking.patient_phone}</p>
              )}
              {booking.slot_time && (
                <p><strong>Appointment Time:</strong> {new Date(booking.slot_time).toLocaleString()}</p>
              )}
              <p><strong>Booked On:</strong> {new Date(booking.booking_time).toLocaleString()}</p>
            </div>

            {booking.status === 'CONFIRMED' && (
              <button
                className="btn-cancel"
                onClick={() => handleCancel(booking.id)}
              >
                Cancel Appointment
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyBookings;
