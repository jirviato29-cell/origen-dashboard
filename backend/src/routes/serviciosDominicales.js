const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/servicios-dominicales?year=2026
router.get('/', async (req, res) => {
  try {
    const { year } = req.query;
    const params = [req.campus];
    let query = 'SELECT * FROM servicios_dominicales WHERE campus=$1';
    if (year) {
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM fecha)=$${params.length}`;
    }
    query += ' ORDER BY fecha ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/servicios-dominicales — upsert por fecha+campus (sin depender de ON CONFLICT)
router.post('/', async (req, res) => {
  try {
    const { fecha, predica, nota } = req.body;
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });

    const { rows: existing } = await pool.query(
      'SELECT id FROM servicios_dominicales WHERE fecha=$1 AND campus=$2',
      [fecha, req.campus]
    );

    let rows;
    if (existing.length > 0) {
      ({ rows } = await pool.query(
        `UPDATE servicios_dominicales SET predica=$1, nota=$2
         WHERE fecha=$3 AND campus=$4 RETURNING *`,
        [predica || null, nota || null, fecha, req.campus]
      ));
    } else {
      ({ rows } = await pool.query(
        `INSERT INTO servicios_dominicales (fecha, predica, nota, campus)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [fecha, predica || null, nota || null, req.campus]
      ));
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/servicios-dominicales/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM servicios_dominicales WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
