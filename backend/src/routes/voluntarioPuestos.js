const express = require('express');
const pool    = require('../db/pool');
// Reusa el MISMO middleware de autenticación del voluntario que
// voluntarioDisponibilidad: exige token + rol 'voluntario' + voluntario_id, y
// deja el payload en req.authVoluntario. El voluntario_id SIEMPRE sale del token,
// nunca del body/query.
const { requireVoluntario } = require('./voluntarioDisponibilidad');

const router = express.Router();
router.use(requireVoluntario);

// "Mis puestos" (PASO 5, parte 4): SOLO LECTURA. El voluntario ve las posiciones
// que su líder le asignó (tabla `asignaciones`), de hoy en adelante, con una
// alerta (visto_por_voluntario) cuando le asignan algo nuevo. Aquí NO confirma
// nada: la confirmación irá después por WhatsApp. No toca el catálogo ni asigna.

// ── "Hoy" en la zona de la iglesia, NO en la del servidor ─────────────────────
// Render corre en UTC, así que un `new Date()` directo se corre de día. Misma
// lógica EXACTA que voluntarioDisponibilidad.js / liderProgramar.js (hoyMexico no
// es exportable desde ahí). 'en-CA' formatea YYYY-MM-DD, comparable como string.
const TZ = 'America/Mexico_City';
const fmtMx = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});
const hoyMexico = () => fmtMx.format(new Date());

// ── Cierre del cambio: MISMA regla que voluntarioDisponibilidad.js ────────────
// El voluntario puede confirmar/rechazar hasta 1 dia antes (el sabado para el
// domingo). Bloqueado si hoy (en Mexico) ya alcanzo esa fecha limite. La
// aritmetica va en UTC (sin horario de verano, nunca corre un dia) y comparar
// strings 'YYYY-MM-DD' es comparacion cronologica correcta. Estos helpers no son
// exportables desde voluntarioDisponibilidad, por eso se replican aqui.
const aUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
const desdeUTC = (ms) => new Date(ms).toISOString().slice(0, 10);
const restaDias = (iso, n) => desdeUTC(aUTC(iso) - n * 86400000);
const estaBloqueada = (iso, hoy) => hoy >= restaDias(iso, 1);

const esFechaISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const ESTADOS_CONFIRMACION = ['confirmado', 'rechazado'];

// ── GET /api/voluntario/puestos ───────────────────────────────────────────────
// Asignaciones del voluntario logueado, SOLO de hoy en adelante, ordenadas por
// fecha ascendente. El nombre de la fecha sigue la convención de liderProgramar:
// evento → su nombre; domingo sin evento → 'Servicio dominical'. La descripción
// de la posición sale del catálogo (posiciones); si la posición se borró del
// catálogo, cae al texto histórico de asignaciones.posicion (descripción null).
router.get('/', async (req, res) => {
  try {
    const voluntarioId = req.authVoluntario.voluntario_id;   // del TOKEN, no del cliente
    const hoy = hoyMexico();

    const { rows } = await pool.query(
      `SELECT
         a.id                                              AS asignacion_id,
         to_char(a.fecha, 'YYYY-MM-DD')                    AS fecha,
         a.evento_id                                       AS evento_id,
         CASE WHEN a.evento_id IS NULL THEN 'Servicio dominical'
              ELSE COALESCE(e.nombre, 'Servicio') END      AS nombre,
         CASE WHEN a.evento_id IS NULL THEN 'Servicio dominical'
              ELSE e.tipo END                              AS tipo_evento,
         t.color                                           AS tipo_color,
         COALESCE(p.nombre, a.posicion)                    AS posicion,
         p.descripcion                                     AS descripcion,
         m.nombre                                          AS ministerio,
         a.estado_confirmacion                             AS estado_confirmacion,
         a.visto_por_voluntario                            AS visto_por_voluntario
       FROM asignaciones a
       LEFT JOIN calendario_eventos e ON e.id = a.evento_id
       LEFT JOIN tipos_evento t
              ON t.campus = a.campus
             AND t.nombre = CASE WHEN a.evento_id IS NULL THEN 'Servicio dominical' ELSE e.tipo END
       LEFT JOIN posiciones   p ON p.id = a.posicion_id
       LEFT JOIN ministerios  m ON m.id = a.ministerio_id
       WHERE a.voluntario_id = $1 AND a.fecha >= $2
       ORDER BY a.fecha ASC, a.evento_id NULLS FIRST`,
      [voluntarioId, hoy]
    );

    // `bloqueado` por asignacion (misma regla de 1 dia antes): el front sabe si
    // aun puede mostrar los botones de confirmar. Se calcula en JS sobre la
    // fecha ya formateada 'YYYY-MM-DD'.
    const puestos = rows.map((p) => ({ ...p, bloqueado: estaBloqueada(p.fecha, hoy) }));

    return res.json({ puestos });
  } catch (err) {
    console.error('[voluntario/puestos] GET:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/voluntario/puestos/nuevos ────────────────────────────────────────
// Solo el conteo para el badge: asignaciones FUTURAS sin ver.
router.get('/nuevos', async (req, res) => {
  try {
    const voluntarioId = req.authVoluntario.voluntario_id;   // del TOKEN
    const hoy = hoyMexico();
    const { rows } = await pool.query(
      `SELECT count(*)::int AS nuevos
         FROM asignaciones
        WHERE voluntario_id = $1 AND fecha >= $2 AND visto_por_voluntario = false`,
      [voluntarioId, hoy]
    );
    return res.json({ nuevos: rows[0].nuevos });
  } catch (err) {
    console.error('[voluntario/puestos] GET /nuevos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/voluntario/puestos/marcar-vistos ────────────────────────────────
// Marca como vistas todas las asignaciones futuras del voluntario. Se llama al
// abrir la pestaña, para limpiar el badge.
router.post('/marcar-vistos', async (req, res) => {
  try {
    const voluntarioId = req.authVoluntario.voluntario_id;   // del TOKEN
    const hoy = hoyMexico();
    const { rowCount } = await pool.query(
      `UPDATE asignaciones
          SET visto_por_voluntario = true
        WHERE voluntario_id = $1 AND fecha >= $2 AND visto_por_voluntario = false`,
      [voluntarioId, hoy]
    );
    return res.json({ ok: true, marcados: rowCount });
  } catch (err) {
    console.error('[voluntario/puestos] POST /marcar-vistos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/voluntario/puestos/:asignacionId/confirmar ──────────────────────
// El voluntario responde a su asignacion: { estado: 'confirmado' | 'rechazado' }.
// Llena asignaciones.estado_confirmacion (la columna YA existe). Reglas:
//   · estado debe ser uno de los dos valores permitidos → si no, 400.
//   · SEGURIDAD: la asignacion debe pertenecer al voluntario del TOKEN. El
//     voluntario_id sale del token, NUNCA del body/param. Si no le pertenece
//     (o no existe), 404 — no se revela la existencia de asignaciones ajenas.
//   · BLOQUEO: no se puede cambiar la respuesta si ya cerro el cambio (misma
//     regla de 1 dia antes, zona America/Mexico_City) → 403.
router.post('/:asignacionId/confirmar', async (req, res) => {
  try {
    const voluntarioId = req.authVoluntario.voluntario_id;   // del TOKEN, no del cliente
    const asignacionId = Number.parseInt(req.params.asignacionId, 10);
    const { estado } = req.body || {};

    if (!Number.isInteger(asignacionId) || asignacionId <= 0) {
      return res.status(400).json({ error: 'Asignación inválida' });
    }
    if (!ESTADOS_CONFIRMACION.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    // Pertenencia: se busca por (id, voluntario_id del TOKEN). Si no casa, es de
    // otro voluntario o no existe → 404. Traemos la fecha para validar el cierre.
    const { rows: propias } = await pool.query(
      `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha
         FROM asignaciones
        WHERE id = $1 AND voluntario_id = $2`,
      [asignacionId, voluntarioId]
    );
    if (propias.length === 0) {
      return res.status(404).json({ error: 'No encontramos esa asignación' });
    }

    // El bloqueo se valida en el servidor, no solo en la pantalla: el front
    // podria estar desactualizado o alguien podria llamar al endpoint directo.
    const fecha = propias[0].fecha;
    if (!esFechaISO(fecha) || estaBloqueada(fecha, hoyMexico())) {
      return res.status(403).json({ error: 'Ya cerró el cambio para esta fecha' });
    }

    const { rows } = await pool.query(
      `UPDATE asignaciones
          SET estado_confirmacion = $1, updated_at = now()
        WHERE id = $2 AND voluntario_id = $3
        RETURNING id AS asignacion_id,
                  to_char(fecha, 'YYYY-MM-DD') AS fecha,
                  estado_confirmacion`,
      [estado, asignacionId, voluntarioId]
    );

    const asignacion = { ...rows[0], bloqueado: estaBloqueada(rows[0].fecha, hoyMexico()) };
    return res.json({ asignacion });
  } catch (err) {
    console.error('[voluntario/puestos] POST /:asignacionId/confirmar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
