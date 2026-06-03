const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/asistencia?year=2026&month=5
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM asistencia';
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

// GET /api/asistencia/resumen-anual?year=2026
router.get('/resumen-anual', async (req, res) => {
  try {
    const y = req.query.year || new Date().getFullYear();
    const { rows } = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM fecha)::INT AS mes,
        SUM(total)   AS total,
        ROUND(AVG(total),1) AS promedio,
        SUM(adultos) AS adultos,
        SUM(voluntarios) AS voluntarios,
        SUM(ninos)   AS ninos,
        SUM(bebes)   AS bebes,
        SUM(nuevos)  AS nuevos
      FROM asistencia
      WHERE EXTRACT(YEAR FROM fecha)=$1
      GROUP BY mes ORDER BY mes
    `, [y]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/asistencia/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM asistencia WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/asistencia/upsert — inserta o actualiza por fecha
router.post('/upsert', async (req, res) => {
  try {
    const { fecha, adultos, voluntarios, ninos, bebes, nuevos, total } = req.body;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });
    const tot = total ?? (adultos||0) + (voluntarios||0) + (ninos||0) + (bebes||0);

    const { rows: existing } = await pool.query(
      'SELECT id FROM asistencia WHERE fecha=$1', [fecha]
    );

    let result;
    if (existing.length > 0) {
      const { rows } = await pool.query(
        `UPDATE asistencia SET adultos=$1, voluntarios=$2, ninos=$3, bebes=$4, nuevos=$5, total=$6
         WHERE fecha=$7 RETURNING *`,
        [adultos||0, voluntarios||0, ninos||0, bebes||0, nuevos||0, tot, fecha]
      );
      result = rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO asistencia (fecha, adultos, voluntarios, ninos, bebes, nuevos, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [fecha, adultos||0, voluntarios||0, ninos||0, bebes||0, nuevos||0, tot]
      );
      result = rows[0];
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/asistencia
router.post('/', async (req, res) => {
  try {
    const { fecha, adultos, voluntarios, ninos, bebes, nuevos, total } = req.body;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });
    const tot = total ?? (adultos||0) + (voluntarios||0) + (ninos||0) + (bebes||0);
    const { rows } = await pool.query(
      `INSERT INTO asistencia (fecha, adultos, voluntarios, ninos, bebes, nuevos, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fecha, adultos||0, voluntarios||0, ninos||0, bebes||0, nuevos||0, tot]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/asistencia/:id
router.put('/:id', async (req, res) => {
  try {
    const { fecha, adultos, voluntarios, ninos, bebes, nuevos, total } = req.body;
    const tot = total ?? (adultos||0) + (voluntarios||0) + (ninos||0) + (bebes||0);
    const { rows } = await pool.query(
      `UPDATE asistencia SET fecha=$1, adultos=$2, voluntarios=$3, ninos=$4,
       bebes=$5, nuevos=$6, total=$7 WHERE id=$8 RETURNING *`,
      [fecha, adultos||0, voluntarios||0, ninos||0, bebes||0, nuevos||0, tot, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/asistencia/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM asistencia WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
