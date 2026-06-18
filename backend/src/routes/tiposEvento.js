const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/tipos-evento
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tipos_evento WHERE campus=$1 ORDER BY nombre',
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tipos-evento
router.post('/', async (req, res) => {
  try {
    const { nombre, color, color_dark, bg, cell_bg } = req.body;
    if (!nombre || !color) {
      return res.status(400).json({ error: 'nombre y color son requeridos' });
    }
    const { rows } = await pool.query(
      `INSERT INTO tipos_evento (nombre, color, color_dark, bg, cell_bg, campus)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        nombre.trim(),
        color,
        color_dark || null,
        bg        || null,
        cell_bg   || null,
        req.campus,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un tipo con ese nombre' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tipos-evento/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM tipos_evento WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
