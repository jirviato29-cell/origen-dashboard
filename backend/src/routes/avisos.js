const express = require('express');
const jwt     = require('jsonwebtoken');
const webpush = require('web-push');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');

const router = express.Router();

// ── Configuración VAPID ───────────────────────────────────────────────────────
// Mismas claves de entorno que routes/push.js. Se leen del entorno (Render),
// nunca del código. web-push guarda las claves en un singleton, así que volver a
// llamar setVapidDetails aquí es idempotente y deja este router autocontenido.
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     || 'mailto:origen@example.com';
const vapidConfigurado = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (vapidConfigurado) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

// ── Auth: SOLO stewardship, verificado del TOKEN (nunca del body) ─────────────
function requireStewardship(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.rol !== 'stewardship') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.authUsuario = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
router.use(requireStewardship);

// ── Constantes de validación y filtros ────────────────────────────────────────
const MAX_TITULO  = 60;
const MAX_MENSAJE = 180;
const CAMPUS_VALIDOS = ['ags', 'gdl', 'todos'];
const TIPOS_VALIDOS  = ['lideres', 'voluntarios', 'todos'];

// tipo_destinatario → roles de usuarios que reciben.
function rolesDeTipo(tipo) {
  if (tipo === 'lideres')    return ['lider_ministerio'];
  if (tipo === 'voluntarios') return ['voluntario'];
  return ['lider_ministerio', 'voluntario']; // 'todos'
}

// Construye el WHERE de suscripciones según los filtros. Devuelve { where, params }.
// - campus 'todos' → se ignora el filtro de campus.
// - ministerio_id null → todos los ministerios.
function filtroSuscripciones({ campus, ministerioId, tipo }) {
  const params = [];
  const cond = ['u.activo = true'];

  params.push(rolesDeTipo(tipo));
  cond.push(`u.rol = ANY($${params.length}::text[])`);

  if (campus !== 'todos') {
    params.push(campus);
    cond.push(`u.campus = $${params.length}`);
  }
  if (ministerioId !== null) {
    params.push(ministerioId);
    cond.push(`u.ministerio_id = $${params.length}`);
  }
  return { where: cond.join(' AND '), params };
}

// ── GET /api/avisos/destinatarios ─────────────────────────────────────────────
// Conteo previo (para el modal de confirmación): a cuántas PERSONAS con
// notificaciones activas llegaría el aviso con los filtros dados.
router.get('/destinatarios', async (req, res) => {
  try {
    const campus = String(req.query.campus || '');
    const tipo   = String(req.query.tipo_destinatario || '');
    const ministerioId = req.query.ministerio_id ? Number(req.query.ministerio_id) : null;

    if (!CAMPUS_VALIDOS.includes(campus)) return res.status(400).json({ error: 'Campus inválido' });
    if (!TIPOS_VALIDOS.includes(tipo))    return res.status(400).json({ error: 'Tipo de destinatario inválido' });
    if (ministerioId !== null && !Number.isInteger(ministerioId)) {
      return res.status(400).json({ error: 'ministerio_id inválido' });
    }

    const { where, params } = filtroSuscripciones({ campus, ministerioId, tipo });
    // Una fila por PERSONA (agrupada por usuario, no por dispositivo), ordenada
    // alfabéticamente. El conteo es el número de personas; los nombres van para
    // el modal de confirmación. No cambia la lógica de resolución de filtros.
    const { rows } = await pool.query(
      `SELECT u.nombre
         FROM push_suscripciones ps
         JOIN usuarios u ON u.id = ps.usuario_id
        WHERE ${where}
        GROUP BY u.id, u.nombre
        ORDER BY lower(u.nombre) ASC`,
      params
    );
    const nombres = rows.map((r) => r.nombre).filter(Boolean);
    return res.json({ total: nombres.length, nombres });
  } catch (err) {
    console.error('[avisos] GET /destinatarios:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/avisos ──────────────────────────────────────────────────────────
// Envía un aviso push masivo a las suscripciones que cumplen los filtros y deja
// registro en `avisos`. El emisor (creado_por) sale del token, no del body.
router.post('/', async (req, res) => {
  if (!vapidConfigurado) {
    return res.status(503).json({ error: 'El servidor no tiene configuradas las claves VAPID' });
  }
  try {
    const titulo  = typeof req.body?.titulo  === 'string' ? req.body.titulo.trim()  : '';
    const mensaje = typeof req.body?.mensaje === 'string' ? req.body.mensaje.trim() : '';
    const campus  = req.body?.campus;
    const tipo    = req.body?.tipo_destinatario;
    const ministerioId = req.body?.ministerio_id == null ? null : Number(req.body.ministerio_id);

    // Validación estricta.
    if (!titulo)  return res.status(400).json({ error: 'El título es obligatorio' });
    if (!mensaje) return res.status(400).json({ error: 'El mensaje es obligatorio' });
    if (titulo.length  > MAX_TITULO)  return res.status(400).json({ error: `El título no puede pasar de ${MAX_TITULO} caracteres` });
    if (mensaje.length > MAX_MENSAJE) return res.status(400).json({ error: `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres` });
    if (!CAMPUS_VALIDOS.includes(campus)) return res.status(400).json({ error: 'Campus inválido' });
    if (!TIPOS_VALIDOS.includes(tipo))    return res.status(400).json({ error: 'Tipo de destinatario inválido' });
    if (ministerioId !== null && !Number.isInteger(ministerioId)) {
      return res.status(400).json({ error: 'ministerio_id inválido' });
    }

    // Suscripciones que cumplen los filtros (con su usuario para contar personas).
    const { where, params } = filtroSuscripciones({ campus, ministerioId, tipo });
    const { rows: subs } = await pool.query(
      `SELECT ps.id, ps.usuario_id, ps.endpoint, ps.p256dh, ps.auth
         FROM push_suscripciones ps
         JOIN usuarios u ON u.id = ps.usuario_id
        WHERE ${where}`,
      params
    );

    const totalPersonas = new Set(subs.map((s) => s.usuario_id)).size;
    const payload = JSON.stringify({ titulo, cuerpo: mensaje, url: '/' });

    // Envío en lotes de 100 con Promise.allSettled: un fallo individual nunca
    // detiene el resto. Las suscripciones muertas (404/410) se borran para que
    // la tabla no se llene de basura. "Entregado" se cuenta por PERSONA: basta
    // que uno de sus dispositivos reciba el push.
    const personasEntregadas = new Set();
    const idsMuertas = [];
    const LOTE = 100;

    for (let i = 0; i < subs.length; i += LOTE) {
      const lote = subs.slice(i, i + LOTE);
      const resultados = await Promise.allSettled(
        lote.map((s) => webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        ))
      );
      resultados.forEach((r, idx) => {
        const sub = lote[idx];
        if (r.status === 'fulfilled') {
          personasEntregadas.add(sub.usuario_id);
        } else {
          const code = r.reason?.statusCode;
          if (code === 404 || code === 410) idsMuertas.push(sub.id);
        }
      });
    }

    // Limpieza de suscripciones muertas (best-effort, no crítico).
    if (idsMuertas.length > 0) {
      await pool.query('DELETE FROM push_suscripciones WHERE id = ANY($1::bigint[])', [idsMuertas])
        .catch((e) => console.error('[avisos] limpieza de muertas falló:', e?.message));
    }
    // Refresca ultimo_ok de las que sí entregaron (best-effort).
    const idsOk = subs.filter((s) => personasEntregadas.has(s.usuario_id)).map((s) => s.id);
    if (idsOk.length > 0) {
      await pool.query('UPDATE push_suscripciones SET ultimo_ok = now() WHERE id = ANY($1::bigint[])', [idsOk])
        .catch(() => { /* no crítico */ });
    }

    const totalEntregados = personasEntregadas.size;
    const totalFallidos   = totalPersonas - totalEntregados;

    // Registro con los totales REALES y el emisor del token.
    await pool.query(
      `INSERT INTO avisos (titulo, texto, destinatarios, campus, ministerio_id, creado_por, total_destinatarios, total_entregados)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [titulo, mensaje, tipo, campus, ministerioId, req.authUsuario.id, totalPersonas, totalEntregados]
    );

    return res.json({
      total_destinatarios: totalPersonas,
      total_entregados:    totalEntregados,
      total_fallidos:      totalFallidos,
    });
  } catch (err) {
    console.error('[avisos] POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/avisos ───────────────────────────────────────────────────────────
// Historial: últimos 30 avisos, más recientes primero, con el nombre del
// ministerio (si aplica) para mostrarlo en la tabla.
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id,
              a.titulo,
              a.texto,
              a.destinatarios,
              a.campus,
              a.ministerio_id,
              m.nombre AS ministerio_nombre,
              a.total_destinatarios,
              a.total_entregados,
              a.created_at
         FROM avisos a
         LEFT JOIN ministerios m ON m.id = a.ministerio_id
        ORDER BY a.created_at DESC
        LIMIT 30`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[avisos] GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
