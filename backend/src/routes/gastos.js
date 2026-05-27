const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/gastos?year=2026&month=5
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = `
      SELECT g.*, c.nombre AS categoria_nombre
      FROM gastos g
      LEFT JOIN categorias c ON g.categoria_id = c.id
    `;
    const params = [];

    if (year && month) {
      query += ' WHERE EXTRACT(YEAR FROM g.fecha) = $1 AND EXTRACT(MONTH FROM g.fecha) = $2';
      params.push(year, month);
    } else if (year) {
      query += ' WHERE EXTRACT(YEAR FROM g.fecha) = $1';
      params.push(year);
    }

    query += ' ORDER BY g.fecha DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gastos/resumen-anual?year=2026
router.get('/resumen-anual', async (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();
    const { rows } = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM fecha)::INT AS mes,
        SUM(monto) AS total
      FROM gastos
      WHERE EXTRACT(YEAR FROM fecha) = $1
      GROUP BY mes
      ORDER BY mes
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
      SELECT c.nombre AS categoria, SUM(g.monto) AS total
      FROM gastos g
      LEFT JOIN categorias c ON g.categoria_id = c.id
      WHERE EXTRACT(YEAR FROM g.fecha) = $1
    `;
    const params = [y];

    if (month) {
      query += ' AND EXTRACT(MONTH FROM g.fecha) = $2';
      params.push(month);
    }

    query += ' GROUP BY c.nombre ORDER BY total DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gastos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*, c.nombre AS categoria_nombre FROM gastos g
       LEFT JOIN categorias c ON g.categoria_id = c.id
       WHERE g.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gastos
router.post('/', async (req, res) => {
  try {
    const { concepto, monto, fecha, categoria_id, notas } = req.body;
    if (!concepto || !monto || !fecha) {
      return res.status(400).json({ error: 'concepto, monto y fecha son requeridos' });
    }
    const { rows } = await pool.query(
      `INSERT INTO gastos (concepto, monto, fecha, categoria_id, notas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [concepto, monto, fecha, categoria_id || null, notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gastos/:id
router.put('/:id', async (req, res) => {
  try {
    const { concepto, monto, fecha, categoria_id, notas } = req.body;
    const { rows } = await pool.query(
      `UPDATE gastos SET concepto=$1, monto=$2, fecha=$3, categoria_id=$4, notas=$5
       WHERE id=$6 RETURNING *`,
      [concepto, monto, fecha, categoria_id || null, notas || null, req.params.id]
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
