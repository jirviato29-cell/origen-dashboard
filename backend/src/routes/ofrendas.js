const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const jwt = require('jsonwebtoken');

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
    const { fecha, efectivo, terminal, transferencia, ofrendas_sobres, ofrendas_terminal, participacion, ofrenda_especial } = req.body;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });
    const ef       = efectivo      || 0;
    const term     = terminal      || 0;
    const transf   = transferencia || 0;
    const total    = ef + term + transf;
    const sobres   = ofrendas_sobres   || 0;
    const termCnt  = ofrendas_terminal || 0;
    const ofrendas = sobres + termCnt;
    console.log('[POST /api/ofrendas] body:', req.body);
    const { rows } = await pool.query(
      `INSERT INTO ofrendas (fecha, efectivo, terminal, transferencia, total_ofrenda, ofrendas, ofrendas_sobres, ofrendas_terminal, participacion, ofrenda_especial)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [fecha, ef, term, transf, total, ofrendas, sobres, termCnt, participacion||0, ofrenda_especial||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /api/ofrendas] ERROR:', err);
    res.status(500).json({ error: err.message, detail: err.detail, code: err.code });
  }
});

// PUT /api/ofrendas/:id
router.put('/:id', async (req, res) => {
  try {
    // Leer campos_editables del usuario vía JWT para validación server-side
    let camposEditables = null;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_dev_secret');
        const { rows: userRows } = await pool.query(
          'SELECT permisos_extra FROM usuarios WHERE id = $1',
          [payload.id]
        );
        camposEditables = userRows[0]?.permisos_extra?.secciones?.ingresos?.campos_editables ?? null;
      } catch {
        camposEditables = null;
      }
    }

    if (camposEditables !== null) {
      // UPDATE parcial: solo los campos permitidos; recalcula total con valores existentes en BD
      const newTransferencia = parseFloat(req.body.transferencia) || 0;
      const { rows } = await pool.query(
        `UPDATE ofrendas
         SET transferencia = $1,
             total_ofrenda = efectivo + terminal + $1
         WHERE id = $2
         RETURNING *`,
        [newTransferencia, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
      return res.json(rows[0]);
    }

    // UPDATE completo — comportamiento existente sin cambios
    const { fecha, efectivo, terminal, transferencia, ofrendas_sobres, ofrendas_terminal, participacion, ofrenda_especial } = req.body;
    const ef       = efectivo      || 0;
    const term     = terminal      || 0;
    const transf   = transferencia || 0;
    const total    = ef + term + transf;
    const sobres   = ofrendas_sobres   || 0;
    const termCnt  = ofrendas_terminal || 0;
    const ofrendas = sobres + termCnt;
    const { rows } = await pool.query(
      `UPDATE ofrendas SET fecha=$1, efectivo=$2, terminal=$3, transferencia=$4, total_ofrenda=$5,
       ofrendas=$6, ofrendas_sobres=$7, ofrendas_terminal=$8, participacion=$9, ofrenda_especial=$10
       WHERE id=$11 RETURNING *`,
      [fecha, ef, term, transf, total, ofrendas, sobres, termCnt, participacion||0, ofrenda_especial||0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /api/ofrendas/:id] ERROR:', err);
    res.status(500).json({ error: err.message, detail: err.detail, code: err.code });
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
