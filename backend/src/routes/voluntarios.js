const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

const router = express.Router();

function requireAuth(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.authUsuario = jwt.verify(token, process.env.JWT_SECRET || 'fallback_dev_secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// GET /api/voluntarios
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM voluntarios WHERE campus=$1 ORDER BY nombre ASC',
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    console.error('[voluntarios] GET:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/voluntarios
router.post('/', requireAuth, async (req, res) => {
  const { nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area } = req.body || {};
  if (!nombre || !ministerio1) {
    return res.status(400).json({ error: 'Nombre y Ministerio 1 son obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO voluntarios (nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area, campus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
       ministerio1, ministerio2 || null, ministerio3 || null, otra_area?.trim() || null,
       req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[voluntarios] POST:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/voluntarios/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area } = req.body || {};
  if (!nombre || !ministerio1) {
    return res.status(400).json({ error: 'Nombre y Ministerio 1 son obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE voluntarios
       SET nombre=$1, cumpleanos=$2, whatsapp=$3, ministerio1=$4, ministerio2=$5, ministerio3=$6, otra_area=$7
       WHERE id=$8 AND campus=$9
       RETURNING *`,
      [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
       ministerio1, ministerio2 || null, ministerio3 || null,
       otra_area?.trim() || null, req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'Voluntario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[voluntarios] PUT:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/voluntarios/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM voluntarios WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!rowCount) return res.status(404).json({ error: 'Voluntario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[voluntarios] DELETE:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
