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
      'SELECT * FROM voluntarios ORDER BY nombre ASC'
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
      `INSERT INTO voluntarios (nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
       ministerio1, ministerio2 || null, ministerio3 || null, otra_area?.trim() || null]
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
       WHERE id=$8
       RETURNING *`,
      [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
       ministerio1, ministerio2 || null, ministerio3 || null,
       otra_area?.trim() || null, req.params.id]
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
    const { rowCount } = await pool.query('DELETE FROM voluntarios WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Voluntario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[voluntarios] DELETE:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
