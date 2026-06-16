const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/categorias — devuelve las categorías únicas de gastos del campus activo
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT categoria AS nombre FROM gastos WHERE campus=$1 ORDER BY categoria',
      [req.campus]
    );
    res.json(rows.map(r => r.nombre));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
