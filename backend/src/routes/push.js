const express = require('express');
const jwt     = require('jsonwebtoken');
const webpush = require('web-push');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');

const router = express.Router();

// ── Configuración VAPID ───────────────────────────────────────────────────────
// Las claves NUNCA van en el código: se leen del entorno (Render). La pública
// también vive en el frontend (VITE_VAPID_PUBLIC_KEY) para pedir la suscripción.
//   VAPID_PUBLIC_KEY   → clave pública (la misma que el front)
//   VAPID_PRIVATE_KEY  → clave privada (SOLO backend)
//   VAPID_SUBJECT      → 'mailto:tu-correo@dominio.com' (contacto del emisor)
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     || 'mailto:origen@example.com';

const vapidConfigurado = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (vapidConfigurado) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn('[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configuradas: el envío de push está deshabilitado.');
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// Acepta CUALQUIER usuario autenticado (voluntario, líder o staff): todos pueden
// recibir avisos. Reutiliza el MISMO secreto/verificación de JWT del proyecto
// (lib/session). El usuario SIEMPRE sale del token (payload.id = usuarios.id),
// nunca del body.
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

// ── Envío a UNA suscripción, con limpieza de suscripciones muertas ────────────
// Devuelve 'ok' | 'gone' | 'error'. Si el push service responde 404/410, el
// dispositivo ya no existe: se BORRA la fila para no acumular basura. Si sale
// bien, se refresca ultimo_ok. Ningún fallo individual tumba el resto del envío.
async function enviarAUnaSuscripcion(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    await pool.query('UPDATE push_suscripciones SET ultimo_ok = now() WHERE id = $1', [sub.id])
      .catch(() => { /* no crítico */ });
    return 'ok';
  } catch (err) {
    const code = err?.statusCode;
    if (code === 404 || code === 410) {
      await pool.query('DELETE FROM push_suscripciones WHERE id = $1', [sub.id])
        .catch(() => { /* no crítico */ });
      return 'gone';
    }
    console.error('[push] envío falló:', code, err?.body || err?.message);
    return 'error';
  }
}

// ── Helper reutilizable (lo usará la parte B: avisos de stewardship) ──────────
// Manda una notificación a TODAS las suscripciones de los usuarios dados. Maneja
// cada envío por separado (Promise.allSettled implícito con try/catch por fila),
// limpia las muertas y nunca lanza: devuelve un resumen con el conteo.
async function enviarPushAUsuarios(usuarioIds, { titulo, cuerpo, url } = {}) {
  const resumen = { suscripciones: 0, enviadas: 0, eliminadas: 0, fallidas: 0 };
  if (!vapidConfigurado) return resumen;

  const ids = [...new Set((Array.isArray(usuarioIds) ? usuarioIds : [usuarioIds]).filter(Boolean))];
  if (ids.length === 0) return resumen;

  const { rows } = await pool.query(
    `SELECT id, endpoint, p256dh, auth
       FROM push_suscripciones
      WHERE usuario_id = ANY($1::int[])`,
    [ids]
  );
  resumen.suscripciones = rows.length;
  if (rows.length === 0) return resumen;

  const payload = JSON.stringify({
    titulo: titulo || 'Origen',
    cuerpo: cuerpo || '',
    url:    url    || '/',
  });

  const resultados = await Promise.all(rows.map((s) => enviarAUnaSuscripcion(s, payload)));
  for (const r of resultados) {
    if (r === 'ok') resumen.enviadas++;
    else if (r === 'gone') resumen.eliminadas++;
    else resumen.fallidas++;
  }
  return resumen;
}

// ── POST /api/push/suscribir ──────────────────────────────────────────────────
// Guarda la suscripción del navegador ligada al usuario del TOKEN. El endpoint
// tiene índice único: si ya existe (mismo dispositivo), se ACTUALIZA —incluido el
// usuario_id, por si otra persona inició sesión en el mismo teléfono.
router.post('/suscribir', async (req, res) => {
  try {
    const usuarioId = req.authUsuario.id;          // del TOKEN, nunca del body
    const { endpoint, keys } = req.body || {};
    const p256dh = keys?.p256dh;
    const authKey = keys?.auth;

    if (typeof endpoint !== 'string' || !endpoint || !p256dh || !authKey) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }

    const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
    const campus    = req.authUsuario.campus || 'ags';

    await pool.query(
      `INSERT INTO push_suscripciones (usuario_id, endpoint, p256dh, auth, user_agent, campus)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE
         SET usuario_id = EXCLUDED.usuario_id,
             p256dh     = EXCLUDED.p256dh,
             auth       = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent,
             campus     = EXCLUDED.campus`,
      [usuarioId, endpoint, p256dh, authKey, userAgent, campus]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('[push] POST /suscribir:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── DELETE /api/push/suscribir ────────────────────────────────────────────────
// Borra la suscripción del endpoint enviado, SOLO si es del usuario del token.
router.delete('/suscribir', async (req, res) => {
  try {
    const usuarioId = req.authUsuario.id;
    const { endpoint } = req.body || {};
    if (typeof endpoint !== 'string' || !endpoint) {
      return res.status(400).json({ error: 'Falta el endpoint' });
    }
    await pool.query(
      'DELETE FROM push_suscripciones WHERE endpoint = $1 AND usuario_id = $2',
      [endpoint, usuarioId]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[push] DELETE /suscribir:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/push/estado ──────────────────────────────────────────────────────
// ¿El usuario del token ya tiene al menos una suscripción activa?
router.get('/estado', async (req, res) => {
  try {
    const usuarioId = req.authUsuario.id;
    const { rows } = await pool.query(
      'SELECT 1 FROM push_suscripciones WHERE usuario_id = $1 LIMIT 1',
      [usuarioId]
    );
    return res.json({ activo: rows.length > 0, soportado: vapidConfigurado });
  } catch (err) {
    console.error('[push] GET /estado:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/push/prueba ─────────────────────────────────────────────────────
// Manda una notificación de PRUEBA a TODAS las suscripciones del PROPIO usuario
// del token (a nadie más). Valida la plomería de punta a punta.
router.post('/prueba', async (req, res) => {
  if (!vapidConfigurado) {
    return res.status(503).json({ error: 'El servidor no tiene configuradas las claves VAPID' });
  }
  try {
    const usuarioId = req.authUsuario.id;
    const resumen = await enviarPushAUsuarios([usuarioId], {
      titulo: 'Origen',
      cuerpo: 'Notificación de prueba',
      url: '/',
    });
    if (resumen.suscripciones === 0) {
      return res.status(404).json({ error: 'No tienes notificaciones activadas en este dispositivo' });
    }
    return res.json({ ok: true, ...resumen });
  } catch (err) {
    console.error('[push] POST /prueba:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
module.exports.enviarPushAUsuarios = enviarPushAUsuarios;
