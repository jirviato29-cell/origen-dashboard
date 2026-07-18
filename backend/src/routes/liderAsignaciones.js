const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');

const router = express.Router();

// Asignación de posiciones por parte del líder de ministerio (PASO 5).
//
// El líder ve, por fecha (domingo o evento de servicio donde sirve su
// ministerio), a sus voluntarios con lo que marcaron en `disponibilidad`, y a
// los que están "disponible" les asigna una posición (ej. "puerta principal").
// Eso llena la tabla `asignaciones`, que ya trae estado_confirmacion listo para
// la confirmación por WhatsApp del PASO 6.
//
// Convención de fechas heredada de disponibilidad: evento_id NULL = un domingo
// normal; evento_id no-NULL = un evento de servicio. Un evento que cae en
// domingo son dos cosas distintas (el domingo y el evento).

const ROLES_PERMITIDOS = ['lider_ministerio', 'stewardship', 'administracion'];
const ESTADOS_CONFIRMACION = ['pendiente', 'confirmado', 'rechazado'];
const POSICION_MAX = 120;

// ── Fechas (mismo criterio UTC que voluntarioDisponibilidad) ──────────────────
// Se trabaja con strings 'YYYY-MM-DD' y la aritmética va en UTC, que no tiene
// horario de verano y por tanto nunca corre un día.
const esFechaISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const aUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
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

// ── Auth ──────────────────────────────────────────────────────────────────────
function requireLider(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!ROLES_PERMITIDOS.includes(payload.rol)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.authUsuario = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

router.use(requireLider);

// SEGURIDAD: el ministerio y el campus SIEMPRE salen de la fila del usuario en
// la BD, buscada por el id del token. Nunca de nada que mande el cliente: un
// líder no puede operar sobre el ministerio de otro aunque lo mande en el body.
// Devuelve null y ya respondió si no hay contexto válido.
async function contextoLider(req, res) {
  const { rows } = await pool.query(
    'SELECT ministerio_id, campus FROM usuarios WHERE id = $1 AND activo = true',
    [req.authUsuario.id]
  );
  if (rows.length === 0) {
    res.status(401).json({ error: 'Tu cuenta ya no está activa' });
    return null;
  }
  const { ministerio_id, campus } = rows[0];
  if (!ministerio_id) {
    res.status(400).json({
      error: req.authUsuario.rol === 'lider_ministerio'
        ? 'Tu cuenta de líder no tiene ministerio asignado'
        : 'Tu cuenta no tiene un ministerio asignado, no puedes asignar posiciones',
    });
    return null;
  }
  return { ministerioId: ministerio_id, campus: campus || 'ags' };
}

// evento_id del cliente → int válido o null (domingo). Devuelve `false` si venía
// algo que no es ni vacío ni un entero (petición malformada).
function parseEventoId(v) {
  if (v === undefined || v === null || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : false;
}

// Valida que la fecha/evento sea una fecha donde SÍ sirve el ministerio, y por
// tanto donde el líder puede asignar. Domingo: solo tiene que ser domingo.
// Evento: tiene que existir, ser del campus, caer en esa fecha, ser de servicio
// y tener al ministerio en evento_ministerios. Devuelve un descriptor o null.
async function fechaAsignable(client, ctx, fecha, eventoId) {
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
        AND EXISTS (
          SELECT 1 FROM evento_ministerios em
           WHERE em.evento_id = e.id AND em.ministerio_id = $4
        )`,
    [eventoId, ctx.campus, fecha, ctx.ministerioId]
  );
  if (rows.length === 0) return null;
  return { fecha: rows[0].fecha, evento_id: rows[0].id, tipo: 'evento', nombre: rows[0].nombre };
}

// ── GET /api/lider/asignaciones/fechas?mes=YYYY-MM ────────────────────────────
// Las fechas del mes en las que el ministerio sirve (domingos + eventos de
// servicio suyos), cada una con cuántos voluntarios marcaron "disponible" y
// cuántos ya tienen posición asignada. Alimenta el selector de fechas.
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

    // Eventos de servicio del mes donde sirve este ministerio.
    const { rows: eventos } = await pool.query(
      `SELECT e.id,
              e.nombre,
              to_char(e.fecha, 'YYYY-MM-DD') AS fecha,
              e.tipo,
              t.color AS tipo_color
         FROM calendario_eventos e
         LEFT JOIN tipos_evento t ON t.nombre = e.tipo AND t.campus = e.campus
        WHERE e.campus = $1 AND e.fecha >= $2 AND e.fecha <= $3
          AND e.para_voluntarios = true
          AND EXISTS (
            SELECT 1 FROM evento_ministerios em
             WHERE em.evento_id = e.id AND em.ministerio_id = $4
          )
        ORDER BY e.fecha, e.id`,
      [ctx.campus, primerDia, ultimoDia, ctx.ministerioId]
    );

    // Cuántos de MIS voluntarios marcaron "disponible" por fecha/evento.
    const { rows: dispo } = await pool.query(
      `SELECT to_char(d.fecha, 'YYYY-MM-DD') AS fecha, d.evento_id, count(*)::int AS n
         FROM disponibilidad d
         JOIN usuarios u ON u.voluntario_id = d.voluntario_id
          AND u.rol = 'voluntario' AND u.ministerio_id = $1
        WHERE d.fecha >= $2 AND d.fecha <= $3 AND d.estado = 'disponible'
        GROUP BY d.fecha, d.evento_id`,
      [ctx.ministerioId, primerDia, ultimoDia]
    );

    // Cuántas posiciones ya asignó este ministerio por fecha/evento.
    const { rows: asig } = await pool.query(
      `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, evento_id, count(*)::int AS n
         FROM asignaciones
        WHERE ministerio_id = $1 AND fecha >= $2 AND fecha <= $3
        GROUP BY fecha, evento_id`,
      [ctx.ministerioId, primerDia, ultimoDia]
    );

    const clave = (fecha, eventoId) => `${fecha}|${eventoId ?? 'dom'}`;
    const disponibles = new Map(dispo.map(r => [clave(r.fecha, r.evento_id), r.n]));
    const asignados   = new Map(asig.map(r => [clave(r.fecha, r.evento_id), r.n]));

    const fechas = [
      ...domingosDelMes(anio, nMes).map((fecha) => ({
        fecha,
        evento_id: null,
        tipo: 'domingo',
        nombre: 'Domingo',
        tipo_color: null,
        disponibles: disponibles.get(clave(fecha, null)) ?? 0,
        asignados:   asignados.get(clave(fecha, null)) ?? 0,
      })),
      ...eventos.map((e) => ({
        fecha: e.fecha,
        evento_id: e.id,
        tipo: 'evento',
        nombre: e.nombre,
        tipo_evento: e.tipo || null,
        tipo_color: e.tipo_color || null,
        disponibles: disponibles.get(clave(e.fecha, e.id)) ?? 0,
        asignados:   asignados.get(clave(e.fecha, e.id)) ?? 0,
      })),
    ].sort((a, b) => (a.fecha === b.fecha
      ? (a.tipo === 'domingo' ? -1 : 1)
      : (a.fecha < b.fecha ? -1 : 1)));

    return res.json({ mes, fechas });
  } catch (err) {
    console.error('[lider/asignaciones] GET /fechas:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/lider/asignaciones?fecha=YYYY-MM-DD&evento_id= ────────────────────
// El equipo del líder para esa fecha: cada voluntario con lo que marcó
// (disponibilidad) y la posición que ya tenga asignada (asignaciones).
router.get('/', async (req, res) => {
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

    const contexto = await fechaAsignable(client, ctx, fecha, eventoId);
    if (!contexto) {
      return res.status(404).json({ error: 'En esa fecha no sirve tu ministerio' });
    }

    // `IS NOT DISTINCT FROM` deja que evento_id NULL (domingo) empareje con NULL;
    // un `=` normal nunca casa contra NULL y perdería las marcas de domingo.
    const { rows } = await client.query(
      `SELECT u.id            AS cuenta_id,
              v.id            AS voluntario_id,
              u.nombre        AS nombre,
              u.apodo         AS apodo,
              v.whatsapp      AS whatsapp,
              d.estado        AS disponibilidad,
              a.id            AS asignacion_id,
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
    console.error('[lider/asignaciones] GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// ── POST /api/lider/asignaciones ──────────────────────────────────────────────
// Asigna (o reasigna) una posición a un voluntario del ministerio en una fecha.
// Upsert manual: no dependemos de un índice único concreto de la tabla.
router.post('/', async (req, res) => {
  const posicion = typeof req.body?.posicion === 'string' ? req.body.posicion.trim() : '';
  const fecha    = req.body?.fecha;
  const eventoId = parseEventoId(req.body?.evento_id);
  const voluntarioId = Number(req.body?.voluntario_id);

  if (!Number.isInteger(voluntarioId) || voluntarioId <= 0) {
    return res.status(400).json({ error: 'Falta el voluntario' });
  }
  if (!esFechaISO(fecha)) {
    return res.status(400).json({ error: 'Falta la fecha en formato YYYY-MM-DD' });
  }
  if (eventoId === false) return res.status(400).json({ error: 'evento_id inválido' });
  if (!posicion) return res.status(400).json({ error: 'Escribe la posición a asignar' });
  if (posicion.length > POSICION_MAX) {
    return res.status(400).json({ error: `La posición no puede pasar de ${POSICION_MAX} caracteres` });
  }

  const client = await pool.connect();
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const contexto = await fechaAsignable(client, ctx, fecha, eventoId);
    if (!contexto) {
      return res.status(404).json({ error: 'En esa fecha no sirve tu ministerio' });
    }

    // El voluntario tiene que ser de MI ministerio: así un líder no asigna a los
    // de otro aunque conozca el id. La relación vive en usuarios (rol + ministerio).
    const { rows: pertenece } = await client.query(
      `SELECT 1 FROM usuarios
        WHERE rol = 'voluntario' AND ministerio_id = $1 AND voluntario_id = $2`,
      [ctx.ministerioId, voluntarioId]
    );
    if (pertenece.length === 0) {
      return res.status(404).json({ error: 'Ese voluntario no es de tu ministerio' });
    }

    await client.query('BEGIN');

    // Bloqueamos la fila existente para que dos guardados en paralelo no dupliquen.
    const { rows: existente } = await client.query(
      `SELECT id, posicion FROM asignaciones
        WHERE voluntario_id = $1 AND fecha = $2
          AND evento_id IS NOT DISTINCT FROM $3::int
          AND ministerio_id = $4
        FOR UPDATE`,
      [voluntarioId, contexto.fecha, contexto.evento_id, ctx.ministerioId]
    );

    let fila;
    if (existente.length > 0) {
      // Si cambia la posición, vuelve a "pendiente": el voluntario tendría que
      // reconfirmar (la confirmación real es del PASO 6, aún no conectado).
      const cambio = existente[0].posicion !== posicion;
      const { rows } = await client.query(
        cambio
          ? `UPDATE asignaciones
                SET posicion = $1, estado_confirmacion = 'pendiente'
              WHERE id = $2
              RETURNING id, posicion, estado_confirmacion`
          : `UPDATE asignaciones
                SET posicion = $1
              WHERE id = $2
              RETURNING id, posicion, estado_confirmacion`,
        [posicion, existente[0].id]
      );
      fila = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO asignaciones
           (voluntario_id, fecha, evento_id, ministerio_id, posicion, estado_confirmacion, campus)
         VALUES ($1, $2, $3::int, $4, $5, 'pendiente', $6)
         RETURNING id, posicion, estado_confirmacion`,
        [voluntarioId, contexto.fecha, contexto.evento_id, ctx.ministerioId, posicion, ctx.campus]
      );
      fila = rows[0];
    }

    await client.query('COMMIT');

    return res.status(existente.length > 0 ? 200 : 201).json({
      asignacion_id: fila.id,
      voluntario_id: voluntarioId,
      posicion: fila.posicion,
      estado_confirmacion: fila.estado_confirmacion,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* la tx pudo no abrirse */ }
    console.error('[lider/asignaciones] POST:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/lider/asignaciones/:id ────────────────────────────────────────
// Quita una posición asignada. El filtro por ministerio impide borrar la de otro.
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Asignación inválida' });
  }
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const { rows } = await pool.query(
      `DELETE FROM asignaciones
        WHERE id = $1 AND ministerio_id = $2
        RETURNING id`,
      [id, ctx.ministerioId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Esa asignación no es de tu ministerio' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[lider/asignaciones] DELETE:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
