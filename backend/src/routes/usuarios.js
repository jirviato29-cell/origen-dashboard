const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

const router = express.Router();

function requireAdmin(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_dev_secret');
    if (!['stewardship', 'administracion'].includes(payload.rol)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.authUsuario = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// GET /api/usuarios — lista usuarios del campus activo (sin clave_hash)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, rol, activo, campus, acceso_global, created_at FROM usuarios WHERE campus=$1 ORDER BY created_at ASC',
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    console.error('[usuarios] GET:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/usuarios — crea usuario en el campus activo (hashea la clave)
router.post('/', requireAdmin, async (req, res) => {
  const { nombre: nombreBody, rol, clave } = req.body || {};
  if (!rol || !clave) {
    return res.status(400).json({ error: 'Faltan campos: rol y clave' });
  }
  try {
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM usuarios WHERE rol = $1 AND campus = $2', [rol, req.campus]
    );
    const nombre = nombreBody?.trim() || `${rol}_${parseInt(count[0].count, 10) + 1}`;
    const clave_hash = await bcrypt.hash(clave, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, rol, clave_hash, activo, campus)
       VALUES ($1, $2, $3, true, $4)
       RETURNING id, nombre, rol, activo, campus, acceso_global, created_at`,
      [nombre, rol, clave_hash, req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[usuarios] POST:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/usuarios/:id/nombre
router.patch('/:id/nombre', requireAdmin, async (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Falta el nombre' });
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET nombre = $1 WHERE id = $2 AND campus = $3
       RETURNING id, nombre, rol, activo, campus, acceso_global, created_at`,
      [nombre.trim(), req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[usuarios] PATCH nombre:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/usuarios/:id/toggle
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET activo = NOT activo WHERE id = $1 AND campus = $2
       RETURNING id, nombre, rol, activo, campus, acceso_global, created_at`,
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[usuarios] PATCH toggle:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/usuarios/:id/clave
router.patch('/:id/clave', requireAdmin, async (req, res) => {
  const { clave } = req.body || {};
  if (!clave) return res.status(400).json({ error: 'Falta la nueva clave' });
  try {
    const clave_hash = await bcrypt.hash(clave, 10);
    const { rows } = await pool.query(
      `UPDATE usuarios SET clave_hash = $1 WHERE id = $2 AND campus = $3
       RETURNING id, nombre, rol, activo, campus, acceso_global, created_at`,
      [clave_hash, req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[usuarios] PATCH clave:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 AND campus = $2',
      [req.params.id, req.campus]
    );
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[usuarios] DELETE:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
