import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Doctor } from '../types';
import '../styles/AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Doctor form
  const [doctorName, setDoctorName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');

  // Slot form
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState('30');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data.doctors);
    } catch (err: any) {
      setError('Failed to load doctors');
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/doctors', {
        name: doctorName,
        specialization,
        email,
        phone,
        experience_years: experience ? parseInt(experience) : undefined
      });

      setSuccess('Doctor created successfully!');
      setDoctorName('');
      setSpecialization('');
      setEmail('');
      setPhone('');
      setExperience('');
      setShowDoctorForm(false);
      fetchDoctors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create doctor');
    }
  };

  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/slots/bulk', {
        doctor_id: parseInt(selectedDoctor),
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: parseInt(duration),
        exclude_weekends: true
      });

      setSuccess(response.data.message);
      setShowSlotForm(false);
      setSelectedDoctor('');
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create slots');
    }
  };

  return (
    <div className="admin-dashboard-container">
      <h2>Admin Dashboard</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="admin-actions">
        <button
          className="btn-primary"
          onClick={() => setShowDoctorForm(!showDoctorForm)}
        >
          {showDoctorForm ? 'Hide' : 'Add New Doctor'}
        </button>

        <button
          className="btn-primary"
          onClick={() => setShowSlotForm(!showSlotForm)}
        >
          {showSlotForm ? 'Hide' : 'Create Appointment Slots'}
        </button>
      </div>

      {showDoctorForm && (
        <div className="form-card">
          <h3>Add New Doctor</h3>
          <form onSubmit={handleCreateDoctor}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Specialization *</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Years of Experience</label>
              <input
                type="number"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                min="0"
              />
            </div>

            <button type="submit" className="btn-primary">Create Doctor</button>
          </form>
        </div>
      )}

      {showSlotForm && (
        <div className="form-card">
          <h3>Create Appointment Slots</h3>
          <form onSubmit={handleCreateSlots}>
            <div className="form-group">
              <label>Select Doctor *</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
              >
                <option value="">Choose a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialization}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Duration (minutes) *</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            <button type="submit" className="btn-primary">Create Slots</button>
          </form>
        </div>
      )}

      <div className="doctors-section">
        <h3>Registered Doctors ({doctors.length})</h3>
        <div className="doctors-table">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="doctor-row">
              <div>
                <strong>{doctor.name}</strong>
                <p>{doctor.specialization}</p>
              </div>
              <div>
                <p>{doctor.email}</p>
                {doctor.experience_years && <p>{doctor.experience_years} years exp.</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
