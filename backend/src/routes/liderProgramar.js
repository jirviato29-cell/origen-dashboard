const express = require('express');
const pool    = require('../db/pool');
// Reusa la MISMA autenticación y contexto del líder que liderVoluntarios: el
// ministerio_id y el campus salen de la fila del usuario en la BD (por el id del
// token), NUNCA del cliente.
const { requireLider, contextoLider } = require('./liderVoluntarios');

const router = express.Router();
router.use(requireLider);

// Programar servicio (PASO 5, parte 2): el líder ve las fechas donde sirve su
// ministerio, y a los voluntarios que dijeron "sí sirvo" les asigna una POSICIÓN
// elegida de su catálogo (tabla posiciones). Llena la tabla `asignaciones`
// (posicion_id + posicion como historial).

// ── Fechas (mismo criterio UTC que voluntarioDisponibilidad) ──────────────────
// "Hoy" en la zona de la iglesia, NO en la del servidor: Render corre en UTC,
// así que un `new Date()` directo se corre de día. Misma lógica exacta que
// voluntarioDisponibilidad.js (hoyMexico no es exportable desde ahí). 'en-CA'
// formatea YYYY-MM-DD, comparable como string.
const TZ = 'America/Mexico_City';
const fmtMx = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});
const hoyMexico = () => fmtMx.format(new Date());

const esFechaISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const aUTC = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const esDomingo = (iso) => new Date(aUTC(iso)).getUTCDay() === 0;
function domingosDelMes(anio, mes) {
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= dias; d++) {
    const iso = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (esDomingo(iso)) out.push(iso);
  }
  return out;
}

// evento_id del cliente → int válido o null (domingo); `false` si es basura.
function parseEventoId(v) {
  if (v === undefined || v === null || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : false;
}

// Valida que la fecha/evento sea una fecha donde SÍ sirve el ministerio (y por
// tanto donde el líder puede programar). Domingo: solo tiene que ser domingo.
// Evento: existe, del campus, en esa fecha, de servicio y (abierto O el
// ministerio está en evento_ministerios). Devuelve descriptor o null.
async function fechaProgramable(client, ctx, fecha, eventoId) {
  if (eventoId === null) {
    if (!esDomingo(fecha)) return null;
    return { fecha, evento_id: null, tipo: 'domingo', nombre: 'Domingo' };
  }
  const { rows } = await client.query(
    `SELECT e.id, e.nombre, to_char(e.fecha, 'YYYY-MM-DD') AS fecha
       FROM calendario_eventos e
      WHERE e.id = $1 AND e.campus = $2
        AND to_char(e.fecha, 'YYYY-MM-DD') = $3
        AND e.para_voluntarios = true
        AND (
          e.evento_abierto = true
          OR EXISTS (SELECT 1 FROM evento_ministerios em
                      WHERE em.evento_id = e.id AND em.ministerio_id = $4)
        )`,
    [eventoId, ctx.campus, fecha, ctx.ministerioId]
  );
  if (rows.length === 0) return null;
  return { fecha: rows[0].fecha, evento_id: rows[0].id, tipo: 'evento', nombre: rows[0].nombre };
}

// ── GET /api/lider/programar/fechas?mes=YYYY-MM ───────────────────────────────
router.get('/fechas', async (req, res) => {
  const mes = req.query.mes;
  if (typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes)) {
    return res.status(400).json({ error: 'Falta el mes en formato YYYY-MM' });
  }
  const [anio, nMes] = mes.split('-').map(Number);
  if (nMes < 1 || nMes > 12) return res.status(400).json({ error: 'Mes inválido' });

  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const diasEnMes = new Date(Date.UTC(anio, nMes, 0)).getUTCDate();
    const primerDia = `${mes}-01`;
    const ultimoDia = `${mes}-${String(diasEnMes).padStart(2, '0')}`;

    // Eventos de servicio del mes donde sirve este ministerio (abiertos o suyos).
    const { rows: eventos } = await pool.query(
      `SELECT e.id, e.nombre, to_char(e.fecha, 'YYYY-MM-DD') AS fecha, e.tipo,
              t.color AS tipo_color
         FROM calendario_eventos e
         LEFT JOIN tipos_evento t ON t.nombre = e.tipo AND t.campus = e.campus
        WHERE e.campus = $1 AND e.fecha >= $2 AND e.fecha <= $3
          AND e.para_voluntarios = true
          AND (
            e.evento_abierto = true
            OR EXISTS (SELECT 1 FROM evento_ministerios em
                        WHERE em.evento_id = e.id AND em.ministerio_id = $4)
          )
        ORDER BY e.fecha, e.id`,
      [ctx.campus, primerDia, ultimoDia, ctx.ministerioId]
    );

    // Para nombrar/colorear los DOMINGOS: el primer evento (por id) de cada
    // fecha del campus, con el color de su tipo (mismo LEFT JOIN a tipos_evento).
    // Si un domingo tiene un evento (p. ej. "Servicio dominical"), la tarjeta usa
    // su nombre y color; si hay varios ese día se toma el de menor id.
    const { rows: evPorFecha } = await pool.query(
      `SELECT DISTINCT ON (e.fecha)
              to_char(e.fecha, 'YYYY-MM-DD') AS fecha, e.nombre, e.tipo,
              t.color AS tipo_color
         FROM calendario_eventos e
         LEFT JOIN tipos_evento t ON t.nombre = e.tipo AND t.campus = e.campus
        WHERE e.campus = $1 AND e.fecha >= $2 AND e.fecha <= $3
        ORDER BY e.fecha, e.id`,
      [ctx.campus, primerDia, ultimoDia]
    );
    const mapEvFecha = new Map(evPorFecha.map(r => [r.fecha, r]));

    // Total de voluntarios del ministerio (para calcular "sin responder").
    const { rows: totalRows } = await pool.query(
      `SELECT count(*)::int AS n FROM usuarios
        WHERE rol = 'voluntario' AND ministerio_id = $1`,
      [ctx.ministerioId]
    );
    const totalVol = totalRows[0].n;

    // Respuestas de MIS voluntarios por fecha/evento.
    const { rows: dispo } = await pool.query(
      `SELECT to_char(d.fecha, 'YYYY-MM-DD') AS fecha, d.evento_id,
              count(*) FILTER (WHERE d.estado = 'disponible')::int    AS disp,
              count(*) FILTER (WHERE d.estado = 'no_disponible')::int AS nope
         FROM disponibilidad d
         JOIN usuarios u ON u.voluntario_id = d.voluntario_id
          AND u.rol = 'voluntario' AND u.ministerio_id = $1
        WHERE d.fecha >= $2 AND d.fecha <= $3
        GROUP BY d.fecha, d.evento_id`,
      [ctx.ministerioId, primerDia, ultimoDia]
    );

    // Asignaciones ya hechas por este ministerio por fecha/evento.
    const { rows: asig } = await pool.query(
      `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, evento_id, count(*)::int AS n
         FROM asignaciones
        WHERE ministerio_id = $1 AND fecha >= $2 AND fecha <= $3
        GROUP BY fecha, evento_id`,
      [ctx.ministerioId, primerDia, ultimoDia]
    );

    const clave = (fecha, eventoId) => `${fecha}|${eventoId ?? 'dom'}`;
    const mapDispo = new Map(dispo.map(r => [clave(r.fecha, r.evento_id), r]));
    const mapAsig  = new Map(asig.map(r => [clave(r.fecha, r.evento_id), r.n]));

    const conteos = (fecha, eventoId) => {
      const d = mapDispo.get(clave(fecha, eventoId));
      const disp = d?.disp ?? 0;
      const nope = d?.nope ?? 0;
      return {
        disponibles: disp,
        no_disponibles: nope,
        sin_responder: Math.max(0, totalVol - disp - nope),
        asignados: mapAsig.get(clave(fecha, eventoId)) ?? 0,
      };
    };

    // Solo fechas de HOY en adelante (hoy en zona México). Aplica igual a
    // domingos y a eventos (ambos están en el mismo arreglo). Un mes futuro
    // completo pasa entero; un mes ya pasado queda vacío. Comparar strings ISO
    // 'YYYY-MM-DD' es cronológicamente correcto.
    const hoy = hoyMexico();
    const fechas = [
      ...domingosDelMes(anio, nMes).map((fecha) => {
        // Si ese domingo tiene un evento del campus, se usa su nombre y color.
        const ev = mapEvFecha.get(fecha);
        return {
          fecha, evento_id: null, tipo: 'domingo',
          nombre: ev?.nombre || 'Domingo',
          tipo_evento: ev?.tipo || null,
          tipo_color: ev?.tipo_color || null,
          ...conteos(fecha, null),
        };
      }),
      ...eventos.map((e) => ({
        fecha: e.fecha, evento_id: e.id, tipo: 'evento', nombre: e.nombre,
        tipo_evento: e.tipo || null, tipo_color: e.tipo_color || null,
        ...conteos(e.fecha, e.id),
      })),
    ]
      .filter((f) => f.fecha >= hoy)
      .sort((a, b) => (a.fecha === b.fecha
        ? (a.tipo === 'domingo' ? -1 : 1)
        : (a.fecha < b.fecha ? -1 : 1)));

    return res.json({ mes, fechas });
  } catch (err) {
    console.error('[lider/programar] GET /fechas:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/lider/programar/detalle?fecha=YYYY-MM-DD&evento_id= ───────────────
router.get('/detalle', async (req, res) => {
  const fecha = req.query.fecha;
  if (!esFechaISO(fecha)) {
    return res.status(400).json({ error: 'Falta la fecha en formato YYYY-MM-DD' });
  }
  const eventoId = parseEventoId(req.query.evento_id);
  if (eventoId === false) return res.status(400).json({ error: 'evento_id inválido' });

  const client = await pool.connect();
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const contexto = await fechaProgramable(client, ctx, fecha, eventoId);
    if (!contexto) {
      return res.status(404).json({ error: 'En esa fecha no sirve tu ministerio' });
    }

    // `IS NOT DISTINCT FROM` deja que evento_id NULL (domingo) empareje con NULL.
    const { rows } = await client.query(
      `SELECT u.id            AS cuenta_id,
              v.id            AS voluntario_id,
              u.nombre        AS nombre,
              u.apodo         AS apodo,
              d.estado        AS disponibilidad,
              a.id            AS asignacion_id,
              a.posicion_id   AS posicion_id,
              a.posicion      AS posicion,
              a.estado_confirmacion AS estado_confirmacion
         FROM usuarios u
         JOIN voluntarios v ON u.voluntario_id = v.id
         LEFT JOIN disponibilidad d
                ON d.voluntario_id = v.id
               AND d.fecha = $2
               AND d.evento_id IS NOT DISTINCT FROM $3::int
         LEFT JOIN asignaciones a
                ON a.voluntario_id = v.id
               AND a.fecha = $2
               AND a.evento_id IS NOT DISTINCT FROM $3::int
               AND a.ministerio_id = $1
        WHERE u.rol = 'voluntario' AND u.ministerio_id = $1
        ORDER BY
          CASE d.estado WHEN 'disponible' THEN 0 WHEN 'no_disponible' THEN 2 ELSE 1 END,
          u.nombre`,
      [ctx.ministerioId, contexto.fecha, contexto.evento_id]
    );

    return res.json({
      fecha: contexto.fecha,
      evento_id: contexto.evento_id,
      tipo: contexto.tipo,
      nombre: contexto.nombre,
      voluntarios: rows,
    });
  } catch (err) {
    console.error('[lider/programar] GET /detalle:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// ── POST /api/lider/programar/asignar ─────────────────────────────────────────
// Body { voluntario_id, fecha, evento_id (null=domingo), posicion_id }.
router.post('/asignar', async (req, res) => {
  const voluntarioId = Number(req.body?.voluntario_id);
  const posicionId   = Number(req.body?.posicion_id);
  const fecha        = req.body?.fecha;
  const eventoId     = parseEventoId(req.body?.evento_id);

  if (!Number.isInteger(voluntarioId) || voluntarioId <= 0) {
    return res.status(400).json({ error: 'Falta el voluntario' });
  }
  if (!Number.isInteger(posicionId) || posicionId <= 0) {
    return res.status(400).json({ error: 'Falta la posición' });
  }
  if (!esFechaISO(fecha)) {
    return res.status(400).json({ error: 'Falta la fecha en formato YYYY-MM-DD' });
  }
  if (eventoId === false) return res.status(400).json({ error: 'evento_id inválido' });

  const client = await pool.connect();
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const contexto = await fechaProgramable(client, ctx, fecha, eventoId);
    if (!contexto) {
      return res.status(404).json({ error: 'En esa fecha no sirve tu ministerio' });
    }

    // 1) El voluntario debe ser de MI ministerio.
    const { rows: pertenece } = await client.query(
      `SELECT 1 FROM usuarios
        WHERE rol = 'voluntario' AND ministerio_id = $1 AND voluntario_id = $2`,
      [ctx.ministerioId, voluntarioId]
    );
    if (pertenece.length === 0) {
      return res.status(403).json({ error: 'Ese voluntario no es de tu ministerio' });
    }

    // 2) La posición debe ser del catálogo de MI ministerio. Traemos su nombre
    //    para guardarlo como historial en la columna `posicion`.
    const { rows: pos } = await client.query(
      'SELECT id, nombre FROM posiciones WHERE id = $1 AND ministerio_id = $2',
      [posicionId, ctx.ministerioId]
    );
    if (pos.length === 0) {
      return res.status(403).json({ error: 'Esa posición no es de tu ministerio' });
    }
    const posicionNombre = pos[0].nombre;

    // 3) El voluntario debe estar 'disponible' esa fecha. No se asigna a quien
    //    dijo "no puedo" o no ha respondido.
    const { rows: disp } = await client.query(
      `SELECT 1 FROM disponibilidad
        WHERE voluntario_id = $1 AND fecha = $2
          AND evento_id IS NOT DISTINCT FROM $3::int
          AND estado = 'disponible'`,
      [voluntarioId, contexto.fecha, contexto.evento_id]
    );
    if (disp.length === 0) {
      return res.status(409).json({ error: 'Ese voluntario no ha confirmado que puede servir esa fecha' });
    }

    await client.query('BEGIN');

    // UPSERT manual respetando los índices únicos parciales de `asignaciones`
    // (uniq por (voluntario_id, fecha) en domingos y (voluntario_id, evento_id)
    // en eventos). Buscamos con IS NOT DISTINCT FROM y bloqueamos la fila para
    // que dos guardados en paralelo no dupliquen; luego UPDATE o INSERT.
    const { rows: existente } = await client.query(
      `SELECT id FROM asignaciones
        WHERE voluntario_id = $1 AND fecha = $2
          AND evento_id IS NOT DISTINCT FROM $3::int
        FOR UPDATE`,
      [voluntarioId, contexto.fecha, contexto.evento_id]
    );

    let fila;
    if (existente.length > 0) {
      // Reasignar vuelve el estado a 'pendiente' (habría que reconfirmar).
      const { rows } = await client.query(
        `UPDATE asignaciones
            SET posicion_id = $1, posicion = $2, ministerio_id = $3, campus = $4,
                estado_confirmacion = 'pendiente'
          WHERE id = $5
          RETURNING id, voluntario_id, posicion_id, posicion, estado_confirmacion`,
        [posicionId, posicionNombre, ctx.ministerioId, ctx.campus, existente[0].id]
      );
      fila = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO asignaciones
           (voluntario_id, fecha, evento_id, ministerio_id, posicion_id, posicion, estado_confirmacion, campus)
         VALUES ($1, $2, $3::int, $4, $5, $6, 'pendiente', $7)
         RETURNING id, voluntario_id, posicion_id, posicion, estado_confirmacion`,
        [voluntarioId, contexto.fecha, contexto.evento_id, ctx.ministerioId, posicionId, posicionNombre, ctx.campus]
      );
      fila = rows[0];
    }

    await client.query('COMMIT');

    return res.status(existente.length > 0 ? 200 : 201).json({
      asignacion_id: fila.id,
      voluntario_id: fila.voluntario_id,
      posicion_id: fila.posicion_id,
      posicion: fila.posicion,
      estado_confirmacion: fila.estado_confirmacion,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* la tx pudo no abrirse */ }
    console.error('[lider/programar] POST /asignar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/lider/programar/asignar/:asignacionId ─────────────────────────
router.delete('/asignar/:asignacionId', async (req, res) => {
  const id = Number(req.params.asignacionId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Asignación inválida' });
  }
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    // El filtro por ministerio impide borrar la asignación de otro.
    const { rows } = await pool.query(
      'DELETE FROM asignaciones WHERE id = $1 AND ministerio_id = $2 RETURNING id',
      [id, ctx.ministerioId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Esa asignación no es de tu ministerio' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[lider/programar] DELETE /asignar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
