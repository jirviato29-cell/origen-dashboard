const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/gastos?year=2026&month=5
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM gastos';
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

// GET /api/gastos/resumen-anual?year=2026
router.get('/resumen-anual', async (req, res) => {
  try {
    const y = req.query.year || new Date().getFullYear();
    const { rows } = await pool.query(`
      SELECT EXTRACT(MONTH FROM fecha)::INT AS mes, SUM(monto) AS total
      FROM gastos WHERE EXTRACT(YEAR FROM fecha)=$1
      GROUP BY mes ORDER BY mes
    `, [y]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gastos/por-categoria?year=2026&month=5
router.get('/por-categoria', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    let query = `
      SELECT categoria, SUM(monto) AS total
      FROM gastos WHERE EXTRACT(YEAR FROM fecha)=$1
    `;
    const params = [y];

    if (month) {
      query += ' AND EXTRACT(MONTH FROM fecha)=$2';
      params.push(month);
    }

    query += ' GROUP BY categoria ORDER BY total DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gastos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM gastos WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gastos
router.post('/', async (req, res) => {
  try {
    const { fecha, concepto, categoria, monto } = req.body;
    if (!fecha || !concepto || !categoria || !monto) {
      return res.status(400).json({ error: 'fecha, concepto, categoria y monto son requeridos' });
    }
    const { rows } = await pool.query(
      'INSERT INTO gastos (fecha, concepto, categoria, monto) VALUES ($1,$2,$3,$4) RETURNING *',
      [fecha, concepto, categoria, monto]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gastos/:id
router.put('/:id', async (req, res) => {
  try {
    const { fecha, concepto, categoria, monto } = req.body;
    const { rows } = await pool.query(
      'UPDATE gastos SET fecha=$1, concepto=$2, categoria=$3, monto=$4 WHERE id=$5 RETURNING *',
      [fecha, concepto, categoria, monto, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gastos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM gastos WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
