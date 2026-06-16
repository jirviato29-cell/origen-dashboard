const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/eventos?year=2026&tipo=especial
router.get('/', async (req, res) => {
  try {
    const { year, tipo } = req.query;
    const params = [req.campus];
    const conds  = ['campus=$1'];

    if (year && tipo) {
      conds.push(`EXTRACT(YEAR FROM fecha)=$${params.length+1} AND tipo=$${params.length+2}`);
      params.push(year, tipo);
    } else if (year) {
      conds.push(`EXTRACT(YEAR FROM fecha)=$${params.length+1}`);
      params.push(year);
    } else if (tipo) {
      conds.push(`tipo=$${params.length+1}`);
      params.push(tipo);
    }

    const query = `SELECT * FROM eventos WHERE ${conds.join(' AND ')} ORDER BY fecha ASC`;
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
      `SELECT * FROM eventos WHERE campus=$1 AND fecha >= CURRENT_DATE ORDER BY fecha ASC LIMIT 10`,
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/eventos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM eventos WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
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
      'INSERT INTO eventos (nombre, fecha, tipo, campus) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, fecha, tipo || 'servicio', req.campus]
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
      'UPDATE eventos SET nombre=$1, fecha=$2, tipo=$3 WHERE id=$4 AND campus=$5 RETURNING *',
      [nombre, fecha, tipo || 'servicio', req.params.id, req.campus]
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
    const { rows } = await pool.query(
      'DELETE FROM eventos WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
