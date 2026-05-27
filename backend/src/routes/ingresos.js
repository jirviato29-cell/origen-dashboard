const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/ingresos?year=2026&month=5
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM ingresos';
    const params = [];

    if (year && month) {
      query += ' WHERE EXTRACT(YEAR FROM fecha) = $1 AND EXTRACT(MONTH FROM fecha) = $2';
      params.push(year, month);
    } else if (year) {
      query += ' WHERE EXTRACT(YEAR FROM fecha) = $1';
      params.push(year);
    }

    query += ' ORDER BY fecha DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ingresos/resumen-anual?year=2026
router.get('/resumen-anual', async (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();
    const { rows } = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM fecha)::INT AS mes,
        SUM(monto) AS total
      FROM ingresos
      WHERE EXTRACT(YEAR FROM fecha) = $1
      GROUP BY mes
      ORDER BY mes
    `, [y]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ingresos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ingresos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ingresos
router.post('/', async (req, res) => {
  try {
    const { concepto, monto, fecha, notas } = req.body;
    if (!concepto || !monto || !fecha) {
      return res.status(400).json({ error: 'concepto, monto y fecha son requeridos' });
    }
    const { rows } = await pool.query(
      'INSERT INTO ingresos (concepto, monto, fecha, notas) VALUES ($1, $2, $3, $4) RETURNING *',
      [concepto, monto, fecha, notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ingresos/:id
router.put('/:id', async (req, res) => {
  try {
    const { concepto, monto, fecha, notas } = req.body;
    const { rows } = await pool.query(
      `UPDATE ingresos SET concepto=$1, monto=$2, fecha=$3, notas=$4
       WHERE id=$5 RETURNING *`,
      [concepto, monto, fecha, notas || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ingresos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM ingresos WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
