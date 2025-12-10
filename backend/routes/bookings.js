const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const { status, patient_email } = req.query;
    
    let query = `
      SELECT b.id, b.slot_id, b.patient_name, b.patient_email, b.patient_phone,
             b.status, b.booking_time, b.confirmed_at,
             s.slot_time, s.duration_minutes,
             d.name as doctor_name, d.specialization
      FROM bookings b
      JOIN appointment_slots s ON b.slot_id = s.id
      JOIN doctors d ON s.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }
    
    if (patient_email) {
      params.push(patient_email);
      query += ` AND b.patient_email = $${params.length}`;
    }
    
    query += ' ORDER BY b.booking_time DESC';
    
    const result = await pool.query(query, params);
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT b.id, b.slot_id, b.patient_name, b.patient_email, b.patient_phone,
             b.status, b.booking_time, b.confirmed_at,
             s.slot_time, s.duration_minutes,
             d.id as doctor_id, d.name as doctor_name, d.specialization
      FROM bookings b
      JOIN appointment_slots s ON b.slot_id = s.id
      JOIN doctors d ON s.doctor_id = d.id
      WHERE b.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create booking with concurrency control
router.post('/',
  [
    body('slot_id').isInt(),
    body('patient_name').notEmpty().trim(),
    body('patient_email').isEmail().normalizeEmail(),
    body('patient_phone').optional().trim()
  ],
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { slot_id, patient_name, patient_email, patient_phone } = req.body;

      // Start transaction with serializable isolation level for maximum concurrency safety
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // Lock the slot row using SELECT FOR UPDATE (pessimistic locking)
      const slotResult = await client.query(
        `SELECT id, is_booked, slot_time, version 
         FROM appointment_slots 
         WHERE id = $1 
         FOR UPDATE`,
        [slot_id]
      );

      if (slotResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Slot not found' });
      }

      const slot = slotResult.rows[0];

      // Check if slot is already booked
      if (slot.is_booked) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          error: 'Slot already booked',
          status: 'FAILED'
        });
      }

      // Check if slot is in the past
      if (new Date(slot.slot_time) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Cannot book past slots',
          status: 'FAILED'
        });
      }

      // Create booking with PENDING status
      const bookingResult = await client.query(
        `INSERT INTO bookings (slot_id, patient_name, patient_email, patient_phone, status) 
         VALUES ($1, $2, $3, $4, 'PENDING') 
         RETURNING id, slot_id, patient_name, patient_email, status, booking_time`,
        [slot_id, patient_name, patient_email, patient_phone]
      );

      const booking = bookingResult.rows[0];

      // Update slot to booked with optimistic locking (version check)
      const updateResult = await client.query(
        `UPDATE appointment_slots 
         SET is_booked = TRUE, version = version + 1, updated_at = NOW()
         WHERE id = $1 AND version = $2
         RETURNING id, version`,
        [slot_id, slot.version]
      );

      if (updateResult.rows.length === 0) {
        // Version mismatch - concurrent update detected
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          error: 'Slot was modified by another request. Please try again.',
          status: 'FAILED'
        });
      }

      // Confirm the booking
      await client.query(
        `UPDATE bookings 
         SET status = 'CONFIRMED', confirmed_at = NOW() 
         WHERE id = $1`,
        [booking.id]
      );

      await client.query('COMMIT');

      // Fetch complete booking details
      const finalResult = await client.query(`
        SELECT b.id, b.slot_id, b.patient_name, b.patient_email, b.patient_phone,
               b.status, b.booking_time, b.confirmed_at,
               s.slot_time, s.duration_minutes,
               d.name as doctor_name, d.specialization
        FROM bookings b
        JOIN appointment_slots s ON b.slot_id = s.id
        JOIN doctors d ON s.doctor_id = d.id
        WHERE b.id = $1
      `, [booking.id]);

      res.status(201).json({ 
        booking: finalResult.rows[0],
        message: 'Booking confirmed successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create booking error:', error);
      
      // Handle serialization failure (concurrent transaction conflict)
      if (error.code === '40001') {
        return res.status(409).json({ 
          error: 'Concurrent booking detected. Please try again.',
          status: 'FAILED'
        });
      }
      
      res.status(500).json({ 
        error: 'Booking failed',
        status: 'FAILED'
      });
    } finally {
      client.release();
    }
  }
);

// Cancel booking
router.patch('/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get booking details
    const bookingResult = await client.query(
      'SELECT id, slot_id, status FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Update booking status
    await client.query(
      `UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Free up the slot
    await client.query(
      `UPDATE appointment_slots 
       SET is_booked = FALSE, version = version + 1, updated_at = NOW() 
       WHERE id = $1`,
      [booking.slot_id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Booking cancelled successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

// Background job to expire pending bookings (would run via cron in production)
router.post('/expire-pending', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Find bookings pending for more than 2 minutes
    const expiredBookings = await client.query(`
      SELECT id, slot_id 
      FROM bookings 
      WHERE status = 'PENDING' 
      AND booking_time < NOW() - INTERVAL '2 minutes'
      FOR UPDATE
    `);

    if (expiredBookings.rows.length === 0) {
      await client.query('COMMIT');
      return res.json({ message: 'No expired bookings found', count: 0 });
    }

    // Update expired bookings to FAILED
    await client.query(`
      UPDATE bookings 
      SET status = 'FAILED', updated_at = NOW()
      WHERE status = 'PENDING' 
      AND booking_time < NOW() - INTERVAL '2 minutes'
    `);

    // Free up the slots
    const slotIds = expiredBookings.rows.map(b => b.slot_id);
    await client.query(`
      UPDATE appointment_slots 
      SET is_booked = FALSE, version = version + 1, updated_at = NOW()
      WHERE id = ANY($1::int[])
    `, [slotIds]);

    await client.query('COMMIT');

    res.json({ 
      message: `Expired ${expiredBookings.rows.length} pending bookings`,
      count: expiredBookings.rows.length 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Expire bookings error:', error);
    res.status(500).json({ error: 'Failed to expire bookings' });
  } finally {
    client.release();
  }
});

module.exports = router;
