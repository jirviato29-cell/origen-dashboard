const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/campos-personalizados
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM campos_personalizados WHERE campus=$1 ORDER BY nombre',
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campos-personalizados
router.post('/', async (req, res) => {
  try {
    const { nombre, tipo, opciones } = req.body;
    if (!nombre || !tipo) {
      return res.status(400).json({ error: 'nombre y tipo son requeridos' });
    }
    if (!['texto', 'numero', 'opciones'].includes(tipo)) {
      return res.status(400).json({ error: "tipo debe ser 'texto', 'numero' u 'opciones'" });
    }
    let opcionesVal = [];
    if (tipo === 'opciones') {
      if (!Array.isArray(opciones) || opciones.length < 1) {
        return res.status(400).json({ error: "opciones debe ser un array con al menos 1 elemento" });
      }
      opcionesVal = opciones;
    }
    const { rows } = await pool.query(
      `INSERT INTO campos_personalizados (nombre, tipo, opciones, campus)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), tipo, JSON.stringify(opcionesVal), req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un campo con ese nombre' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campos-personalizados/evento/:eventoId
// Definido antes de /:id para evitar que Express interprete "evento" como un id
router.get('/evento/:eventoId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cp.*
       FROM campos_personalizados cp
       JOIN evento_campos ec ON ec.campo_id = cp.id
       WHERE ec.evento_id=$1 AND ec.campus=$2
       ORDER BY ec.orden`,
      [req.params.eventoId, req.campus]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/campos-personalizados/evento/:eventoId
// Reemplaza todas las asignaciones del evento con la lista enviada (en orden)
router.put('/evento/:eventoId', async (req, res) => {
  const { eventoId } = req.params;
  const { campo_ids } = req.body;

  const client = await pool.connect();
  try {
    // Validar que el evento pertenece al campus
    const { rows: evRows } = await client.query(
      'SELECT id FROM calendario_eventos WHERE id=$1 AND campus=$2',
      [eventoId, req.campus]
    );
    if (!evRows.length) return res.status(404).json({ error: 'Evento no encontrado' });

    await client.query('BEGIN');

    await client.query(
      'DELETE FROM evento_campos WHERE evento_id=$1 AND campus=$2',
      [eventoId, req.campus]
    );

    if (Array.isArray(campo_ids) && campo_ids.length > 0) {
      for (let i = 0; i < campo_ids.length; i++) {
        await client.query(
          'INSERT INTO evento_campos (evento_id, campo_id, orden, campus) VALUES ($1,$2,$3,$4)',
          [eventoId, campo_ids[i], i, req.campus]
        );
      }
    }

    await client.query('COMMIT');

    // Devolver la lista resultante de campos asignados
    const { rows } = await client.query(
      `SELECT cp.*
       FROM campos_personalizados cp
       JOIN evento_campos ec ON ec.campo_id = cp.id
       WHERE ec.evento_id=$1 AND ec.campus=$2
       ORDER BY ec.orden`,
      [eventoId, req.campus]
    );
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/campos-personalizados/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM campos_personalizados WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
