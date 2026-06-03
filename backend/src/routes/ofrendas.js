const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/ofrendas?year=2026&month=5
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM ofrendas';
    const params = [];

    if (year && month) {
      query += ' WHERE EXTRACT(YEAR FROM fecha)=$1 AND EXTRACT(MONTH FROM fecha)=$2';
      params.push(year, month);
    } else if (year) {
      query += ' WHERE EXTRACT(YEAR FROM fecha)=$1';
      params.push(year);
    }

    query += ' ORDER BY fecha DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ofrendas/resumen-anual?year=2026
router.get('/resumen-anual', async (req, res) => {
  try {
    const y = req.query.year || new Date().getFullYear();
    const { rows } = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM fecha)::INT AS mes,
        SUM(efectivo)         AS efectivo,
        SUM(terminal)         AS terminal,
        SUM(total_ofrenda)    AS total_ofrenda,
        SUM(ofrenda_especial) AS ofrenda_especial,
        ROUND(AVG(ofrendas),1)      AS promedio_ofrendantes,
        ROUND(AVG(participacion),1) AS promedio_participacion
      FROM ofrendas
      WHERE EXTRACT(YEAR FROM fecha)=$1
      GROUP BY mes ORDER BY mes
    `, [y]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ofrendas/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ofrendas WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ofrendas
router.post('/', async (req, res) => {
  try {
    const { fecha, efectivo, terminal, total_ofrenda, ofrendas, participacion, ofrenda_especial } = req.body;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });
    const { rows } = await pool.query(
      `INSERT INTO ofrendas (fecha, efectivo, terminal, total_ofrenda, ofrendas, participacion, ofrenda_especial)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fecha, efectivo||0, terminal||0, total_ofrenda||0, ofrendas||0, participacion||0, ofrenda_especial||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ofrendas/:id
router.put('/:id', async (req, res) => {
  try {
    const { fecha, efectivo, terminal, total_ofrenda, ofrendas, participacion, ofrenda_especial } = req.body;
    const { rows } = await pool.query(
      `UPDATE ofrendas SET fecha=$1, efectivo=$2, terminal=$3, total_ofrenda=$4,
       ofrendas=$5, participacion=$6, ofrenda_especial=$7 WHERE id=$8 RETURNING *`,
      [fecha, efectivo||0, terminal||0, total_ofrenda||0, ofrendas||0, participacion||0, ofrenda_especial||0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ofrendas/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM ofrendas WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
