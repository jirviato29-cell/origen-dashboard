const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
// Acepta CUALQUIER usuario autenticado (voluntario, líder o staff). El usuario
// SIEMPRE sale del token (payload.id = usuarios.id), nunca del body. Mismo patrón
// que routes/push.js: se monta antes del middleware de campus.
function requireUsuario(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return res.status(403).json({ error: 'Acceso denegado' });
    req.authUsuario = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
router.use(requireUsuario);

// ── GET /api/mi-perfil ────────────────────────────────────────────────────────
// Datos de solo lectura del usuario del token para la pestaña Configuración:
// nombre de acceso, campus y ministerio. El ministerio se resuelve por
// usuarios.ministerio_id → ministerios.nombre (null si no tiene asignado).
router.get('/', async (req, res) => {
  try {
    const usuarioId = req.authUsuario.id;
    const { rows } = await pool.query(
      `SELECT u.nombre,
              u.campus,
              m.nombre AS ministerio
         FROM usuarios u
         LEFT JOIN ministerios m ON m.id = u.ministerio_id
        WHERE u.id = $1`,
      [usuarioId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const { nombre, campus, ministerio } = rows[0];
    return res.json({
      nombre:     nombre || '',
      campus:     campus || 'ags',
      ministerio: ministerio || null,
    });
  } catch (err) {
    console.error('[mi-perfil] GET:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
