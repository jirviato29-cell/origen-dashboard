const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Columnas con alias de compatibilidad para páginas que esperan {monto, concepto, notas}
const BASE_SELECT = `
  SELECT id, fecha, efectivo, terminal, total_ofrenda, ofrendas, participacion,
         ofrenda_especial, created_at,
         total_ofrenda AS monto,
         'Ofrendas dominicales' AS concepto,
         NULL::text AS notas
  FROM ofrendas
`;

// GET /api/ingresos?year=2026&month=5
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    const params = [req.campus];
    const conds  = ['campus=$1'];

    if (year && month) {
      conds.push(`EXTRACT(YEAR FROM fecha)=$${params.length+1} AND EXTRACT(MONTH FROM fecha)=$${params.length+2}`);
      params.push(year, month);
    } else if (year) {
      conds.push(`EXTRACT(YEAR FROM fecha)=$${params.length+1}`);
      params.push(year);
    }

    const query = `${BASE_SELECT} WHERE ${conds.join(' AND ')} ORDER BY fecha DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ingresos/resumen-anual?year=2026
router.get('/resumen-anual', async (req, res) => {
  try {
    const y = req.query.year || new Date().getFullYear();
    const { rows } = await pool.query(`
      SELECT EXTRACT(MONTH FROM fecha)::INT AS mes, SUM(total_ofrenda) AS total
      FROM ofrendas WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2
      GROUP BY mes ORDER BY mes
    `, [req.campus, y]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ingresos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${BASE_SELECT} WHERE id=$1 AND campus=$2`,
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ingresos — acepta {monto} como alias de total_ofrenda
router.post('/', async (req, res) => {
  try {
    const { fecha, efectivo, terminal, total_ofrenda, monto, ofrendas, participacion, ofrenda_especial } = req.body;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });
    const tot = parseFloat(total_ofrenda || monto || 0);
    const { rows } = await pool.query(
      `INSERT INTO ofrendas (fecha, efectivo, terminal, total_ofrenda, ofrendas, participacion, ofrenda_especial, campus)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [fecha, parseFloat(efectivo||0), parseFloat(terminal||0), tot, parseInt(ofrendas||0), parseFloat(participacion||0), parseFloat(ofrenda_especial||0), req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ingresos/:id
router.put('/:id', async (req, res) => {
  try {
    const { fecha, efectivo, terminal, total_ofrenda, monto, ofrendas, participacion, ofrenda_especial } = req.body;
    const tot = parseFloat(total_ofrenda || monto || 0);
    const { rows } = await pool.query(
      `UPDATE ofrendas SET fecha=$1, efectivo=$2, terminal=$3, total_ofrenda=$4,
       ofrendas=$5, participacion=$6, ofrenda_especial=$7 WHERE id=$8 AND campus=$9 RETURNING *`,
      [fecha, parseFloat(efectivo||0), parseFloat(terminal||0), tot, parseInt(ofrendas||0), parseFloat(participacion||0), parseFloat(ofrenda_especial||0), req.params.id, req.campus]
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
    const { rows } = await pool.query(
      'DELETE FROM ofrendas WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
