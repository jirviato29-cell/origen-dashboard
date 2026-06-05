const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/calendario?year=2026
router.get('/', async (req, res) => {
  try {
    const { year } = req.query;
    let query = 'SELECT * FROM calendario_eventos';
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

// GET /api/calendario/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM calendario_eventos WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendario
router.post('/', async (req, res) => {
  try {
    const { nombre, fecha, tipo, nota } = req.body;
    if (!nombre || !fecha) return res.status(400).json({ error: 'nombre y fecha son requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO calendario_eventos (nombre, fecha, tipo, nota) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, fecha, tipo || 'General', nota || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calendario/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, fecha, tipo, nota } = req.body;
    const { rows } = await pool.query(
      'UPDATE calendario_eventos SET nombre=$1, fecha=$2, tipo=$3, nota=$4 WHERE id=$5 RETURNING *',
      [nombre, fecha, tipo || 'General', nota || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendario/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM calendario_eventos WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
