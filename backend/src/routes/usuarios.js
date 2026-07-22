const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

const router = express.Router();

// Roles válidos que puede crear/gestionar stewardship desde Configuración.
// OJO: 'voluntario' NO va aquí: los voluntarios se dan de alta desde el panel
// del líder (con apodo + clave de 4 dígitos), no desde esta pantalla.
const ROLES_VALIDOS = [
  'stewardship', 'administracion', 'pastor', 'anfitriones', 'punto_encuentro', 'lider_ministerio',
];

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

// GET /api/usuarios — lista usuarios del campus activo (sin clave_hash).
// Incluye ministerio_id y el nombre del ministerio (LEFT JOIN) para poder
// mostrarlo en la lista de los líderes.
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.rol, u.activo, u.campus, u.acceso_global,
              u.ministerio_id, m.nombre AS ministerio_nombre, u.created_at
         FROM usuarios u
         LEFT JOIN ministerios m ON m.id = u.ministerio_id
        WHERE u.campus = $1
        ORDER BY u.created_at ASC`,
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    console.error('[usuarios] GET:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/usuarios — crea usuario en el campus activo (hashea la clave).
// Un lider_ministerio DEBE traer ministerio_id (existente y del mismo campus).
router.post('/', requireAdmin, async (req, res) => {
  const { nombre: nombreBody, rol, clave, ministerio_id } = req.body || {};
  if (!rol || !clave) {
    return res.status(400).json({ error: 'Faltan campos: rol y clave' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (rol === 'lider_ministerio' && !ministerio_id) {
    return res.status(400).json({ error: 'Un líder de ministerio necesita un ministerio asignado' });
  }

  try {
    // ministerio_id solo aplica a lider_ministerio; para otros roles queda null.
    // Se valida que exista y sea del MISMO campus (del contexto, no del body).
    let minId = null;
    if (rol === 'lider_ministerio') {
      const { rows: m } = await pool.query(
        'SELECT id FROM ministerios WHERE id = $1 AND campus = $2',
        [ministerio_id, req.campus]
      );
      if (m.length === 0) {
        return res.status(400).json({ error: 'El ministerio no existe o no es de este campus' });
      }
      minId = m[0].id;
    }

    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM usuarios WHERE rol = $1 AND campus = $2', [rol, req.campus]
    );
    const nombre = nombreBody?.trim() || `${rol}_${parseInt(count[0].count, 10) + 1}`;
    const clave_hash = await bcrypt.hash(clave, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, rol, clave_hash, activo, campus, ministerio_id)
       VALUES ($1, $2, $3, true, $4, $5)
       RETURNING id, nombre, rol, activo, campus, acceso_global, ministerio_id, created_at`,
      [nombre, rol, clave_hash, req.campus, minId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[usuarios] POST:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/usuarios/:id/ministerio — cambia el ministerio de un líder.
router.patch('/:id/ministerio', requireAdmin, async (req, res) => {
  const { ministerio_id } = req.body || {};
  if (!ministerio_id) return res.status(400).json({ error: 'Falta el ministerio' });
  try {
    // Mismo criterio que el POST: existe y es del campus del contexto.
    const { rows: m } = await pool.query(
      'SELECT id, nombre FROM ministerios WHERE id = $1 AND campus = $2',
      [ministerio_id, req.campus]
    );
    if (m.length === 0) {
      return res.status(400).json({ error: 'El ministerio no existe o no es de este campus' });
    }
    const { rows } = await pool.query(
      `UPDATE usuarios SET ministerio_id = $1 WHERE id = $2 AND campus = $3
       RETURNING id, nombre, rol, activo, campus, acceso_global, ministerio_id, created_at`,
      [ministerio_id, req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ...rows[0], ministerio_nombre: m[0].nombre });
  } catch (err) {
    console.error('[usuarios] PATCH ministerio:', err);
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
       RETURNING id, nombre, rol, activo, campus, acceso_global, ministerio_id, created_at`,
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
       RETURNING id, nombre, rol, activo, campus, acceso_global, ministerio_id, created_at`,
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
       RETURNING id, nombre, rol, activo, campus, acceso_global, ministerio_id, created_at`,
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
// Se exporta para reusar el MISMO guard (solo stewardship/administracion) en
// otras rutas de admin (p. ej. equipos), sin duplicar la lógica.
module.exports.requireAdmin = requireAdmin;
