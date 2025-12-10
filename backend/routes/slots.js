const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Get available slots
router.get('/', async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    
    let query = `
      SELECT s.id, s.doctor_id, s.slot_time, s.duration_minutes, s.is_booked,
             d.name as doctor_name, d.specialization
      FROM appointment_slots s
      JOIN doctors d ON s.doctor_id = d.id
      WHERE s.is_booked = FALSE AND s.slot_time > NOW()
    `;
    const params = [];
    
    if (doctor_id) {
      params.push(doctor_id);
      query += ` AND s.doctor_id = $${params.length}`;
    }
    
    if (date) {
      params.push(date);
      query += ` AND DATE(s.slot_time) = $${params.length}`;
    }
    
    query += ' ORDER BY s.slot_time';
    
    const result = await pool.query(query, params);
    res.json({ slots: result.rows });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Create appointment slot (admin only)
router.post('/',
  auth,
  adminAuth,
  [
    body('doctor_id').isInt(),
    body('slot_time').isISO8601(),
    body('duration_minutes').optional().isInt({ min: 15, max: 120 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { doctor_id, slot_time, duration_minutes = 30 } = req.body;

      const result = await pool.query(
        `INSERT INTO appointment_slots (doctor_id, slot_time, duration_minutes) 
         VALUES ($1, $2, $3) 
         RETURNING id, doctor_id, slot_time, duration_minutes, is_booked`,
        [doctor_id, slot_time, duration_minutes]
      );

      res.status(201).json({ slot: result.rows[0] });
    } catch (error) {
      console.error('Create slot error:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Slot already exists for this doctor at this time' });
      }
      res.status(500).json({ error: 'Failed to create slot' });
    }
  }
);

// Bulk create slots (admin only)
router.post('/bulk',
  auth,
  adminAuth,
  [
    body('doctor_id').isInt(),
    body('start_date').isISO8601(),
    body('end_date').isISO8601(),
    body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('duration_minutes').optional().isInt({ min: 15, max: 120 }),
    body('exclude_weekends').optional().isBoolean()
  ],
  async (req, res) => {
    const client = await pool.connect();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        doctor_id, 
        start_date, 
        end_date, 
        start_time, 
        end_time, 
        duration_minutes = 30,
        exclude_weekends = true 
      } = req.body;

      await client.query('BEGIN');

      const slots = [];
      const currentDate = new Date(start_date);
      const endDateObj = new Date(end_date);

      while (currentDate <= endDateObj) {
        const dayOfWeek = currentDate.getDay();
        
        if (!exclude_weekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
          const [startHour, startMinute] = start_time.split(':').map(Number);
          const [endHour, endMinute] = end_time.split(':').map(Number);
          
          let currentTime = new Date(currentDate);
          currentTime.setHours(startHour, startMinute, 0, 0);
          
          const endTime = new Date(currentDate);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          while (currentTime < endTime) {
            const result = await client.query(
              `INSERT INTO appointment_slots (doctor_id, slot_time, duration_minutes) 
               VALUES ($1, $2, $3) 
               ON CONFLICT (doctor_id, slot_time) DO NOTHING
               RETURNING id`,
              [doctor_id, currentTime.toISOString(), duration_minutes]
            );
            
            if (result.rows.length > 0) {
              slots.push(result.rows[0]);
            }
            
            currentTime = new Date(currentTime.getTime() + duration_minutes * 60000);
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      await client.query('COMMIT');
      res.status(201).json({ 
        message: `Created ${slots.length} appointment slots`,
        count: slots.length 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Bulk create slots error:', error);
      res.status(500).json({ error: 'Failed to create slots' });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
