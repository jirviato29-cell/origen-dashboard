const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/abonos?participante_id=X
router.get('/', async (req, res) => {
  try {
    const { participante_id } = req.query;
    const params = [req.campus];
    let query = 'SELECT * FROM abonos WHERE campus=$1';
    if (participante_id) {
      params.push(participante_id);
      query += ` AND participante_id=$${params.length}`;
    }
    query += ' ORDER BY fecha ASC, id ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/abonos
router.post('/', async (req, res) => {
  try {
    const { participante_id, monto, metodo, num_transaccion, num_cuenta, comprobante_url, fecha } = req.body;
    if (!participante_id || !monto) {
      return res.status(400).json({ error: 'participante_id y monto son requeridos' });
    }
    const { rows } = await pool.query(
      `INSERT INTO abonos (participante_id, monto, metodo, num_transaccion, num_cuenta, comprobante_url, fecha, campus)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        participante_id,
        parseFloat(monto),
        metodo || 'efectivo',
        num_transaccion || null,
        num_cuenta || null,
        comprobante_url || null,
        fecha || new Date().toISOString().slice(0, 10),
        req.campus,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/abonos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM abonos WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
