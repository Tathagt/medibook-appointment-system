const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, specialization, email, phone, experience_years FROM doctors ORDER BY name'
    );
    res.json({ doctors: result.rows });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, specialization, email, phone, experience_years FROM doctors WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    res.json({ doctor: result.rows[0] });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

// Create doctor (admin only)
router.post('/',
  auth,
  adminAuth,
  [
    body('name').notEmpty().trim(),
    body('specialization').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('experience_years').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, specialization, email, phone, experience_years } = req.body;

      const result = await pool.query(
        `INSERT INTO doctors (name, specialization, email, phone, experience_years) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, name, specialization, email, phone, experience_years`,
        [name, specialization, email, phone, experience_years]
      );

      res.status(201).json({ doctor: result.rows[0] });
    } catch (error) {
      console.error('Create doctor error:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Doctor with this email already exists' });
      }
      res.status(500).json({ error: 'Failed to create doctor' });
    }
  }
);

module.exports = router;
