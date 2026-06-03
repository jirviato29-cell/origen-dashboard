const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/eventos?year=2026&tipo=especial
router.get('/', async (req, res) => {
  try {
    const { year, tipo } = req.query;
    let query = 'SELECT * FROM eventos';
    const params = [];

    if (year && tipo) {
      query += ' WHERE EXTRACT(YEAR FROM fecha)=$1 AND tipo=$2';
      params.push(year, tipo);
    } else if (year) {
      query += ' WHERE EXTRACT(YEAR FROM fecha)=$1';
      params.push(year);
    } else if (tipo) {
      query += ' WHERE tipo=$1';
      params.push(tipo);
    }

    query += ' ORDER BY fecha ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/eventos/proximos — eventos a partir de hoy
router.get('/proximos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM eventos WHERE fecha >= CURRENT_DATE ORDER BY fecha ASC LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/eventos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM eventos WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/eventos
router.post('/', async (req, res) => {
  try {
    const { nombre, fecha, tipo } = req.body;
    if (!nombre || !fecha) return res.status(400).json({ error: 'nombre y fecha son requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO eventos (nombre, fecha, tipo) VALUES ($1,$2,$3) RETURNING *',
      [nombre, fecha, tipo || 'servicio']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/eventos/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, fecha, tipo } = req.body;
    const { rows } = await pool.query(
      'UPDATE eventos SET nombre=$1, fecha=$2, tipo=$3 WHERE id=$4 RETURNING *',
      [nombre, fecha, tipo || 'servicio', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/eventos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM eventos WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
