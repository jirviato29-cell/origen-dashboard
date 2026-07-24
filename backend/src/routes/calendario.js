const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Sincroniza los ministerios asignados a un evento dentro de una transaccion.
// - Si esParaVoluntarios es false, o esAbierto es true, o el array llega vacio,
//   deja el evento sin ministerios (borra los previos y no inserta nada). Un
//   evento ABIERTO no necesita ministerios: cualquier voluntario puede servir.
// - Si es true, primero valida que TODOS los ministerio_ids pertenezcan al
//   mismo campus del evento; si alguno no coincide, lanza un Error con
//   propiedad .status=400 para que el router responda 400.
async function syncMinisteriosDeEvento(client, eventoId, ministerioIds, esParaVoluntarios, campus, esAbierto) {
  await client.query(
    'DELETE FROM evento_ministerios WHERE evento_id=$1',
    [eventoId]
  );
  if (!esParaVoluntarios || esAbierto) return;
  const ids = Array.isArray(ministerioIds)
    ? ministerioIds.map(Number).filter(n => Number.isInteger(n) && n > 0)
    : [];
  if (ids.length === 0) return;

  // Validacion de campus: solo ministerios del mismo campus del evento.
  const { rows: validos } = await client.query(
    'SELECT id FROM ministerios WHERE id = ANY($1::int[]) AND campus=$2',
    [ids, campus]
  );
  if (validos.length !== ids.length) {
    const err = new Error('Alguno de los ministerios seleccionados no pertenece a este campus');
    err.status = 400;
    throw err;
  }
  await client.query(
    `INSERT INTO evento_ministerios (evento_id, ministerio_id)
     SELECT $1, m FROM unnest($2::int[]) AS m
     ON CONFLICT (evento_id, ministerio_id) DO NOTHING`,
    [eventoId, ids]
  );
}

// GET /api/calendario?year=2026&en_punto_encuentro=true&para_voluntarios=true
router.get('/', async (req, res) => {
  try {
    const { year, en_punto_encuentro, para_voluntarios } = req.query;
    const params = [req.campus];
    const conditions = ['campus=$1'];

    if (year) {
      params.push(year);
      conditions.push(`EXTRACT(YEAR FROM fecha)=$${params.length}`);
    }
    if (en_punto_encuentro === 'true') {
      conditions.push(`en_punto_encuentro = true`);
    }
    if (para_voluntarios === 'true') {
      conditions.push(`para_voluntarios = true`);
    }

    const query = `SELECT * FROM calendario_eventos WHERE ${conditions.join(' AND ')} ORDER BY fecha ASC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendario/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM calendario_eventos WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendario/:id/ministerios — lista los ministerios asignados al
// evento. Consumido por el modal al editar; no engorda el GET listado principal.
router.get('/:id/ministerios', async (req, res) => {
  try {
    const { rows: evento } = await pool.query(
      'SELECT id FROM calendario_eventos WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!evento.length) return res.status(404).json({ error: 'No encontrado' });

    const { rows } = await pool.query(
      `SELECT m.id, m.nombre, m.color
         FROM evento_ministerios em
         JOIN ministerios m ON m.id = em.ministerio_id
        WHERE em.evento_id=$1 AND m.campus=$2
        ORDER BY m.nombre`,
      [req.params.id, req.campus]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendario
router.post('/', async (req, res) => {
  const { nombre, fecha, tipo, nota, en_punto_encuentro, para_voluntarios, evento_abierto, costo, ministerio_ids } = req.body;
  if (!nombre || !fecha) return res.status(400).json({ error: 'nombre y fecha son requeridos' });
  const esParaVoluntarios = para_voluntarios === true || para_voluntarios === 'true';
  // Un evento solo puede ser abierto si es de servicio.
  const esAbierto = esParaVoluntarios && (evento_abierto === true || evento_abierto === 'true');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO calendario_eventos (nombre, fecha, tipo, nota, en_punto_encuentro, para_voluntarios, evento_abierto, costo, campus)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nombre, fecha, tipo || 'General', nota || null,
       en_punto_encuentro === true || en_punto_encuentro === 'true',
       esParaVoluntarios,
       esAbierto,
       costo ? parseFloat(costo) : 0,
       req.campus]
    );
    await syncMinisteriosDeEvento(client, rows[0].id, ministerio_ids, esParaVoluntarios, req.campus, esAbierto);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/calendario/:id
router.put('/:id', async (req, res) => {
  const { nombre, fecha, tipo, nota, en_punto_encuentro, para_voluntarios, evento_abierto, costo, ministerio_ids } = req.body;
  const esParaVoluntarios = para_voluntarios === true || para_voluntarios === 'true';
  // Un evento solo puede ser abierto si es de servicio.
  const esAbierto = esParaVoluntarios && (evento_abierto === true || evento_abierto === 'true');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE calendario_eventos
       SET nombre=$1, fecha=$2, tipo=$3, nota=$4, en_punto_encuentro=$5, para_voluntarios=$6, evento_abierto=$7, costo=$8
       WHERE id=$9 AND campus=$10 RETURNING *`,
      [nombre, fecha, tipo || 'General', nota || null,
       en_punto_encuentro === true || en_punto_encuentro === 'true',
       esParaVoluntarios,
       esAbierto,
       costo ? parseFloat(costo) : 0,
       req.params.id, req.campus]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }
    await syncMinisteriosDeEvento(client, rows[0].id, ministerio_ids, esParaVoluntarios, req.campus, esAbierto);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/calendario/:id/cerrar — cierre definitivo, no se reabre
router.patch('/:id/cerrar', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE calendario_eventos SET cerrado = true
       WHERE id=$1 AND campus=$2 RETURNING *`,
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendario/:id — borra en cascada: abonos → evento_campos → participantes → evento
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // a) Abonos de los participantes de este evento
    await client.query(
      `DELETE FROM abonos
       WHERE participante_id IN (
         SELECT id FROM participantes WHERE evento_id=$1 AND campus=$2
       )`,
      [req.params.id, req.campus]
    );

    // b) Asignaciones de campos personalizados
    await client.query(
      'DELETE FROM evento_campos WHERE evento_id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );

    // c) Participantes del evento
    await client.query(
      'DELETE FROM participantes WHERE evento_id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );

    // d) El evento mismo
    const { rows } = await client.query(
      'DELETE FROM calendario_eventos WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }

    await client.query('COMMIT');
    res.json({ ok: true, deleted: rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
