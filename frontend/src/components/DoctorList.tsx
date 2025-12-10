import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Doctor } from '../types';
import '../styles/DoctorList.css';

const DoctorList: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data.doctors);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading doctors...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="doctor-list-container">
      <h2>Our Doctors</h2>
      <p className="subtitle">Choose a doctor to book an appointment</p>

      {doctors.length === 0 ? (
        <div className="empty-state">No doctors available</div>
      ) : (
        <div className="doctor-grid">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="doctor-card">
              <div className="doctor-avatar">
                {doctor.name.charAt(0)}
              </div>
              <h3>{doctor.name}</h3>
              <p className="specialization">{doctor.specialization}</p>
              {doctor.experience_years && (
                <p className="experience">{doctor.experience_years} years experience</p>
              )}
              <button
                className="btn-primary"
                onClick={() => navigate(`/booking/${doctor.id}`)}
              >
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorList;
