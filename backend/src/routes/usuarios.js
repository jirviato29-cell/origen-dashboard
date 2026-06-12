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

// GET /api/usuarios — lista todos (sin clave_hash)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, rol, activo, created_at FROM usuarios ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[usuarios] GET:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/usuarios — crea usuario (hashea la clave)
router.post('/', requireAdmin, async (req, res) => {
  const { rol, clave } = req.body || {};
  if (!rol || !clave) {
    return res.status(400).json({ error: 'Faltan campos: rol y clave' });
  }
  try {
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM usuarios WHERE rol = $1', [rol]
    );
    const nombre     = `${rol}_${parseInt(count[0].count, 10) + 1}`;
    const clave_hash = await bcrypt.hash(clave, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, rol, clave_hash, activo)
       VALUES ($1, $2, $3, true)
       RETURNING id, nombre, rol, activo, created_at`,
      [nombre, rol, clave_hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[usuarios] POST:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/usuarios/:id/nombre — actualiza el nombre visible del usuario
router.patch('/:id/nombre', requireAdmin, async (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Falta el nombre' });
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET nombre = $1 WHERE id = $2
       RETURNING id, nombre, rol, activo, created_at`,
      [nombre.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[usuarios] PATCH nombre:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/usuarios/:id/toggle — alterna activo/inactivo
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET activo = NOT activo WHERE id = $1
       RETURNING id, nombre, rol, activo, created_at`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[usuarios] PATCH toggle:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/usuarios/:id/clave — cambia la clave (re-hashea)
router.patch('/:id/clave', requireAdmin, async (req, res) => {
  const { clave } = req.body || {};
  if (!clave) return res.status(400).json({ error: 'Falta la nueva clave' });
  try {
    const clave_hash = await bcrypt.hash(clave, 10);
    const { rows } = await pool.query(
      `UPDATE usuarios SET clave_hash = $1 WHERE id = $2
       RETURNING id, nombre, rol, activo, created_at`,
      [clave_hash, req.params.id]
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
    const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[usuarios] DELETE:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
