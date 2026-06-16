const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// GET /api/campus — lista de campus para la pantalla de selección
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, logo_url, activo FROM campus ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
