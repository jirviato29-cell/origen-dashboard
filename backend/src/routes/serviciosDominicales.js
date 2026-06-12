const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/servicios-dominicales?year=2026
router.get('/', async (req, res) => {
  try {
    const { year } = req.query;
    let query = 'SELECT * FROM servicios_dominicales';
    const params = [];
    if (year) {
      query += ' WHERE EXTRACT(YEAR FROM fecha)=$1';
      params.push(year);
    }
    query += ' ORDER BY fecha ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/servicios-dominicales — upsert por fecha
router.post('/', async (req, res) => {
  try {
    const { fecha, predica, nota } = req.body;
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });
    const { rows } = await pool.query(
      `INSERT INTO servicios_dominicales (fecha, predica, nota)
       VALUES ($1, $2, $3)
       ON CONFLICT (fecha) DO UPDATE
         SET predica = EXCLUDED.predica,
             nota    = EXCLUDED.nota
       RETURNING *`,
      [fecha, predica || null, nota || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/servicios-dominicales/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM servicios_dominicales WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
