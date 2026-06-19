const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/calendario?year=2026&en_punto_encuentro=true
router.get('/', async (req, res) => {
  try {
    const { year, en_punto_encuentro } = req.query;
    const params = [req.campus];
    const conditions = ['campus=$1'];

    if (year) {
      params.push(year);
      conditions.push(`EXTRACT(YEAR FROM fecha)=$${params.length}`);
    }
    if (en_punto_encuentro === 'true') {
      conditions.push(`en_punto_encuentro = true`);
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

// POST /api/calendario
router.post('/', async (req, res) => {
  try {
    const { nombre, fecha, tipo, nota, en_punto_encuentro, costo } = req.body;
    if (!nombre || !fecha) return res.status(400).json({ error: 'nombre y fecha son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO calendario_eventos (nombre, fecha, tipo, nota, en_punto_encuentro, costo, campus)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre, fecha, tipo || 'General', nota || null,
       en_punto_encuentro === true || en_punto_encuentro === 'true',
       costo ? parseFloat(costo) : 0,
       req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calendario/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, fecha, tipo, nota, en_punto_encuentro, costo } = req.body;
    const { rows } = await pool.query(
      `UPDATE calendario_eventos
       SET nombre=$1, fecha=$2, tipo=$3, nota=$4, en_punto_encuentro=$5, costo=$6
       WHERE id=$7 AND campus=$8 RETURNING *`,
      [nombre, fecha, tipo || 'General', nota || null,
       en_punto_encuentro === true || en_punto_encuentro === 'true',
       costo ? parseFloat(costo) : 0,
       req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
