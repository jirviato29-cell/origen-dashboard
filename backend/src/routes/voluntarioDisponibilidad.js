const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');

const router = express.Router();

// Disponibilidad del voluntario: marca por domingo y por evento del mes.
//
// La tabla `disponibilidad` distingue los dos casos con evento_id: NULL es un
// domingo normal, no-NULL es un evento. Por eso tiene dos indices unicos
// parciales, y por eso un evento que cae en domingo son DOS filas distintas.

const ESTADOS = ['disponible', 'no_disponible'];

// ── Fechas ───────────────────────────────────────────────────────────────────
// Todo se maneja como string 'YYYY-MM-DD' y la aritmetica va en UTC, que no
// tiene horario de verano y por tanto nunca corre un dia.

// "Hoy" en la zona de la iglesia, NO en la del servidor: Render corre en UTC,
// asi que un `new Date()` directo adelanta el bloqueo unas horas (de 18:00 de
// Mexico en adelante, UTC ya es el dia siguiente). 'en-CA' formatea YYYY-MM-DD.
const TZ = 'America/Mexico_City';
const fmtMx = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});
const hoyMexico = () => fmtMx.format(new Date());

const esFechaISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

const aUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
const desdeUTC = (ms) => new Date(ms).toISOString().slice(0, 10);
const restaDias = (iso, n) => desdeUTC(aUTC(iso) - n * 86400000);

// 0 = domingo
const diaSemana = (iso) => new Date(aUTC(iso)).getUTCDay();
const esDomingo = (iso) => diaSemana(iso) === 0;

// Regla de cierre: el cambio se cierra 2 dias antes (el viernes para el
// domingo). Bloqueado si hoy (en Mexico) ya alcanzo esa fecha limite.
// Comparar strings 'YYYY-MM-DD' es comparacion cronologica correcta.
const estaBloqueada = (iso, hoy) => hoy >= restaDias(iso, 2);

function domingosDelMes(anio, mes) {
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= dias; d++) {
    const iso = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (esDomingo(iso)) out.push(iso);
  }
  return out;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function requireVoluntario(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Sin voluntario_id no hay ficha que marcar: la cuenta existe pero no
    // apunta a nadie del directorio.
    if (payload.rol !== 'voluntario' || !payload.voluntario_id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.authVoluntario = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

router.use(requireVoluntario);

// SEGURIDAD: el campus sale de la ficha del voluntario en la BD, buscada por el
// voluntario_id del token. Nunca del cliente ni del header X-Campus: si no, un
// voluntario podria marcarse en los eventos de otro campus.
// Devuelve null y ya respondió si no hay contexto válido.
async function contextoVoluntario(req, res) {
  const { rows } = await pool.query(
    'SELECT id, campus FROM voluntarios WHERE id = $1',
    [req.authVoluntario.voluntario_id]
  );
  if (rows.length === 0) {
    res.status(403).json({ error: 'Tu ficha de voluntario ya no existe' });
    return null;
  }
  return { voluntarioId: rows[0].id, campus: rows[0].campus || 'ags' };
}

// ── GET /api/voluntario/disponibilidad?mes=YYYY-MM ────────────────────────────
router.get('/', async (req, res) => {
  const mes = req.query.mes;
  if (typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes)) {
    return res.status(400).json({ error: 'Falta el mes en formato YYYY-MM' });
  }
  const [anio, nMes] = mes.split('-').map(Number);
  if (nMes < 1 || nMes > 12) {
    return res.status(400).json({ error: 'Mes inválido' });
  }

  try {
    const ctx = await contextoVoluntario(req, res);
    if (!ctx) return;

    const diasEnMes = new Date(Date.UTC(anio, nMes, 0)).getUTCDate();
    const primerDia = `${mes}-01`;
    const ultimoDia = `${mes}-${String(diasEnMes).padStart(2, '0')}`;
    const hoy = hoyMexico();

    // Eventos del mes, solo de su campus. to_char evita que el driver convierta
    // el DATE a un Date de JS y lo corra de dia por zona horaria.
    const { rows: eventos } = await pool.query(
      `SELECT id, nombre, to_char(fecha, 'YYYY-MM-DD') AS fecha
         FROM calendario_eventos
        WHERE campus = $1 AND fecha >= $2 AND fecha <= $3
        ORDER BY fecha, id`,
      [ctx.campus, primerDia, ultimoDia]
    );

    // Lo ya respondido por este voluntario en el mes.
    const { rows: marcas } = await pool.query(
      `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, evento_id, estado
         FROM disponibilidad
        WHERE voluntario_id = $1 AND fecha >= $2 AND fecha <= $3`,
      [ctx.voluntarioId, primerDia, ultimoDia]
    );

    const estadoDomingo = new Map();
    const estadoEvento  = new Map();
    for (const m of marcas) {
      if (m.evento_id === null) estadoDomingo.set(m.fecha, m.estado);
      else estadoEvento.set(m.evento_id, m.estado);
    }

    const dias = [
      ...domingosDelMes(anio, nMes).map((fecha) => ({
        fecha,
        tipo: 'domingo',
        nombre: 'Domingo',
        evento_id: null,
        estado: estadoDomingo.get(fecha) ?? null,
        bloqueado: estaBloqueada(fecha, hoy),
      })),
      ...eventos.map((e) => ({
        fecha: e.fecha,
        tipo: 'evento',
        nombre: e.nombre,
        evento_id: e.id,
        estado: estadoEvento.get(e.id) ?? null,
        bloqueado: estaBloqueada(e.fecha, hoy),
      })),
    ].sort((a, b) => (a.fecha === b.fecha ? (a.tipo === 'domingo' ? -1 : 1) : a.fecha < b.fecha ? -1 : 1));

    return res.json({
      mes,
      primerDia,
      diasEnMes,
      // 0 = domingo. Con esto el front sabe cuántos huecos van antes del día 1.
      diaSemanaPrimero: diaSemana(primerDia),
      hoy,
      dias,
    });
  } catch (err) {
    console.error('[voluntario/disponibilidad] GET:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/voluntario/disponibilidad ───────────────────────────────────────
router.post('/', async (req, res) => {
  const fecha  = req.body?.fecha;
  const estado = req.body?.estado;
  const eventoId = req.body?.evento_id ?? null;

  if (!esFechaISO(fecha)) {
    return res.status(400).json({ error: 'Falta la fecha en formato YYYY-MM-DD' });
  }
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  if (eventoId !== null && !Number.isInteger(eventoId)) {
    return res.status(400).json({ error: 'evento_id inválido' });
  }

  try {
    const ctx = await contextoVoluntario(req, res);
    if (!ctx) return;

    if (eventoId === null) {
      // Domingo normal: la fecha tiene que ser realmente un domingo.
      if (!esDomingo(fecha)) {
        return res.status(400).json({ error: 'Esa fecha no es un domingo' });
      }
    } else {
      // Evento: tiene que existir, ser de su campus y caer en esa fecha.
      const { rows } = await pool.query(
        `SELECT 1 FROM calendario_eventos
          WHERE id = $1 AND campus = $2 AND to_char(fecha, 'YYYY-MM-DD') = $3`,
        [eventoId, ctx.campus, fecha]
      );
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Ese evento no existe en tu campus en esa fecha' });
      }
    }

    // El bloqueo se valida en el servidor, no solo en la pantalla: el front
    // podria estar desactualizado o alguien podria llamar al endpoint directo.
    if (estaBloqueada(fecha, hoyMexico())) {
      return res.status(403).json({ error: 'Ya cerró el cambio para esta fecha' });
    }

    // UPSERT contra el índice único parcial que corresponda. La inferencia
    // necesita repetir el WHERE del índice para saber cuál usar.
    const sql = eventoId === null
      ? `INSERT INTO disponibilidad (voluntario_id, fecha, evento_id, estado, campus)
         VALUES ($1, $2, NULL, $3, $4)
         ON CONFLICT (voluntario_id, fecha) WHERE evento_id IS NULL
         DO UPDATE SET estado = EXCLUDED.estado, updated_at = now()
         RETURNING id, to_char(fecha, 'YYYY-MM-DD') AS fecha, evento_id, estado`
      : `INSERT INTO disponibilidad (voluntario_id, fecha, evento_id, estado, campus)
         VALUES ($1, $2, $5, $3, $4)
         ON CONFLICT (voluntario_id, evento_id) WHERE evento_id IS NOT NULL
         DO UPDATE SET estado = EXCLUDED.estado, fecha = EXCLUDED.fecha, updated_at = now()
         RETURNING id, to_char(fecha, 'YYYY-MM-DD') AS fecha, evento_id, estado`;

    const params = eventoId === null
      ? [ctx.voluntarioId, fecha, estado, ctx.campus]
      : [ctx.voluntarioId, fecha, estado, ctx.campus, eventoId];

    const { rows } = await pool.query(sql, params);
    return res.json(rows[0]);
  } catch (err) {
    console.error('[voluntario/disponibilidad] POST:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
