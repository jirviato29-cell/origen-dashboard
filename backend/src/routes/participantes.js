const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/participantes?evento_id=X
router.get('/', async (req, res) => {
  try {
    const { evento_id } = req.query;
    const params = [req.campus];
    let query = 'SELECT * FROM participantes WHERE campus=$1';
    if (evento_id) {
      params.push(evento_id);
      query += ` AND evento_id=$${params.length}`;
    }
    query += ' ORDER BY id ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/participantes
router.post('/', async (req, res) => {
  try {
    const { evento_id, nombre, whatsapp, edad, tipo_persona, respuestas } = req.body;
    if (!evento_id || !nombre?.trim()) {
      return res.status(400).json({ error: 'evento_id y nombre son requeridos' });
    }
    const respuestasVal = (respuestas && typeof respuestas === 'object' && !Array.isArray(respuestas))
      ? respuestas
      : {};
    const { rows } = await pool.query(
      `INSERT INTO participantes (evento_id, nombre, whatsapp, edad, tipo_persona, campus, respuestas)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        evento_id,
        nombre.trim(),
        whatsapp?.trim() || null,
        edad ? parseInt(edad, 10) : null,
        tipo_persona === 'invitado' ? 'invitado' : 'familia',
        req.campus,
        JSON.stringify(respuestasVal),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/participantes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM participantes WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
