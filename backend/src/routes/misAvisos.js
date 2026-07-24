const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');
const { filtroAvisosParaUsuario } = require('../lib/avisosDestinatarios');

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
// Acepta CUALQUIER usuario autenticado (voluntario o líder). El usuario SIEMPRE
// sale del token (payload.id = usuarios.id), nunca del body ni de la URL. Mismo
// patrón que routes/push.js y routes/miPerfil.js: se monta antes del middleware
// de campus.
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

// Resuelve campus, ministerio y rol del usuario del TOKEN desde la base (no del
// body): son los datos con los que se decide qué avisos le corresponden.
async function perfilDelUsuario(usuarioId) {
  const { rows } = await pool.query(
    'SELECT campus, ministerio_id, rol FROM usuarios WHERE id = $1',
    [usuarioId]
  );
  if (rows.length === 0) return null;
  return {
    campus:       rows[0].campus,
    ministerioId: rows[0].ministerio_id,
    rol:          rows[0].rol,
  };
}

// ── GET /api/mis-avisos ───────────────────────────────────────────────────────
// Avisos que le corresponden al usuario del token (mismos filtros de campus,
// ministerio y tipo de destinatario que el envío), del más nuevo al más viejo,
// máximo 50, cada uno con `visto` = si ya lo abrió.
router.get('/', async (req, res) => {
  try {
    const perfil = await perfilDelUsuario(req.authUsuario.id);
    if (!perfil) return res.status(404).json({ error: 'Usuario no encontrado' });

    // $1 = usuario del token (para el LEFT JOIN de visto); los filtros empiezan en $2.
    const { where, params } = filtroAvisosParaUsuario(perfil, 1);
    const { rows } = await pool.query(
      `SELECT a.id,
              a.titulo,
              a.texto,
              a.campus,
              a.ministerio_id,
              m.nombre AS ministerio_nombre,
              a.created_at,
              (av.usuario_id IS NOT NULL) AS visto
         FROM avisos a
         LEFT JOIN ministerios m   ON m.id = a.ministerio_id
         LEFT JOIN avisos_vistos av ON av.aviso_id = a.id AND av.usuario_id = $1
        WHERE ${where}
        ORDER BY a.created_at DESC
        LIMIT 50`,
      [req.authUsuario.id, ...params]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[mis-avisos] GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/mis-avisos/:id ───────────────────────────────────────────────────
// Un aviso completo, SOLO si de verdad le corresponde al usuario del token. El
// permiso se decide con los filtros, nunca confiando en el id de la URL. Si no
// le corresponde → 404 (no se distingue de "no existe").
router.get('/:id', async (req, res) => {
  const avisoId = Number(req.params.id);
  if (!Number.isInteger(avisoId)) return res.status(400).json({ error: 'id inválido' });
  try {
    const perfil = await perfilDelUsuario(req.authUsuario.id);
    if (!perfil) return res.status(404).json({ error: 'Usuario no encontrado' });

    // $1 = usuario del token, $2 = aviso; los filtros empiezan en $3.
    const { where, params } = filtroAvisosParaUsuario(perfil, 2);
    const { rows } = await pool.query(
      `SELECT a.id,
              a.titulo,
              a.texto,
              a.campus,
              a.ministerio_id,
              m.nombre AS ministerio_nombre,
              a.created_at,
              (av.usuario_id IS NOT NULL) AS visto
         FROM avisos a
         LEFT JOIN ministerios m   ON m.id = a.ministerio_id
         LEFT JOIN avisos_vistos av ON av.aviso_id = a.id AND av.usuario_id = $1
        WHERE a.id = $2 AND ${where}`,
      [req.authUsuario.id, avisoId, ...params]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Aviso no encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[mis-avisos] GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/mis-avisos/:id/visto ────────────────────────────────────────────
// Registra la lectura en avisos_vistos. Primero verifica que el aviso de verdad
// le corresponde al usuario del token (mismos filtros); si no, 404. El insert usa
// ON CONFLICT DO NOTHING: abrirlo dos veces no falla ni pisa la fecha original.
router.post('/:id/visto', async (req, res) => {
  const avisoId = Number(req.params.id);
  if (!Number.isInteger(avisoId)) return res.status(400).json({ error: 'id inválido' });
  try {
    const usuarioId = req.authUsuario.id;
    const perfil = await perfilDelUsuario(usuarioId);
    if (!perfil) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Verifica pertenencia con los MISMOS filtros antes de registrar nada.
    const { where, params } = filtroAvisosParaUsuario(perfil, 1);
    const { rows } = await pool.query(
      `SELECT 1 FROM avisos a WHERE a.id = $1 AND ${where}`,
      [avisoId, ...params]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Aviso no encontrado' });

    await pool.query(
      `INSERT INTO avisos_vistos (aviso_id, usuario_id)
       VALUES ($1, $2)
       ON CONFLICT (aviso_id, usuario_id) DO NOTHING`,
      [avisoId, usuarioId]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[mis-avisos] POST /:id/visto:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
