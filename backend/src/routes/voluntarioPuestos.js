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

    return res.json({ puestos: rows });
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

module.exports = router;
