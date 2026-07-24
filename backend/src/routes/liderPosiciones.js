const express = require('express');
const pool    = require('../db/pool');
// Reusa la MISMA autenticación y contexto del líder que liderVoluntarios: el
// ministerio_id y el campus salen de la fila del usuario en la BD (por el id del
// token), NUNCA del cliente.
const { requireLider, contextoLider } = require('./liderVoluntarios');

const router = express.Router();
router.use(requireLider);

// Catálogo de POSICIONES del ministerio del líder (PASO 5, parte 1): define una
// vez sus posiciones (ej. "Puerta principal", "Recibidor", "Cámara 2") para
// luego elegirlas al asignar voluntarios (parte 2, aún no). Solo catálogo aquí.

// GET /api/lider/posiciones — las posiciones activas de su ministerio.
router.get('/', async (req, res) => {
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const { rows } = await pool.query(
      `SELECT id, nombre, descripcion, orden
         FROM posiciones
        WHERE ministerio_id = $1 AND activo = true
        ORDER BY orden ASC, nombre ASC`,
      [ctx.ministerioId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[lider/posiciones] GET:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Descripción opcional del body: trim y null si viene vacía.
function descripcionDe(body) {
  const d = typeof body?.descripcion === 'string' ? body.descripcion.trim() : '';
  return d || null;
}

// POST /api/lider/posiciones — crea una posición. Body { nombre, descripcion? }.
router.post('/', async (req, res) => {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const descripcion = descripcionDe(req.body);
  if (!nombre) {
    return res.status(400).json({ error: 'Escribe el nombre de la posición' });
  }

  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    // ministerio_id y campus salen del contexto del líder, no del body.
    const { rows } = await pool.query(
      `INSERT INTO posiciones (ministerio_id, nombre, descripcion, campus)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, descripcion, orden`,
      [ctx.ministerioId, nombre, descripcion, ctx.campus]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    // Violación del índice único (ministerio_id, lower(btrim(nombre))): ya tiene
    // una posición con ese nombre. Se responde 409, no 500.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya tienes una posición con ese nombre' });
    }
    console.error('[lider/posiciones] POST:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/lider/posiciones/:id — edita nombre y descripción de una posición.
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const descripcion = descripcionDe(req.body);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Posición inválida' });
  }
  if (!nombre) {
    return res.status(400).json({ error: 'Escribe el nombre de la posición' });
  }

  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    // Verifica PRIMERO que la posición sea de su ministerio (mismo patrón que
    // el DELETE); si no, 404.
    const { rows: propia } = await pool.query(
      'SELECT id FROM posiciones WHERE id = $1 AND ministerio_id = $2',
      [id, ctx.ministerioId]
    );
    if (propia.length === 0) {
      return res.status(404).json({ error: 'Esa posición no es de tu ministerio' });
    }

    // El ministerio_id NO se toca (ni sale del body): la fila sigue siendo del
    // mismo ministerio. El AND ministerio_id es doble seguro.
    const { rows } = await pool.query(
      `UPDATE posiciones
          SET nombre = $1, descripcion = $2
        WHERE id = $3 AND ministerio_id = $4
        RETURNING id, nombre, descripcion, orden`,
      [nombre, descripcion, id, ctx.ministerioId]
    );
    return res.json(rows[0]);
  } catch (err) {
    // Choque con otra posición del mismo ministerio (índice único).
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya tienes una posición con ese nombre' });
    }
    console.error('[lider/posiciones] PUT:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/lider/posiciones/:id — borra una posición del ministerio del líder.
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Posición inválida' });
  }

  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    // Verifica PRIMERO que la posición sea de su ministerio; si no, 404 (no se
    // filtra si existe en otro ministerio).
    const { rows } = await pool.query(
      'SELECT id FROM posiciones WHERE id = $1 AND ministerio_id = $2',
      [id, ctx.ministerioId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Esa posición no es de tu ministerio' });
    }

    // Borra SOLO la posición. Las asignaciones que la usaban NO se tocan: su
    // posicion_id pasa a NULL por el ON DELETE SET NULL, y conservan el nombre
    // en la columna posicion (historial).
    await pool.query('DELETE FROM posiciones WHERE id = $1', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[lider/posiciones] DELETE:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
