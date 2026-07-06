const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/gastos-eventos?evento_id=X
router.get('/', async (req, res) => {
  try {
    const { evento_id } = req.query;
    const params = [req.campus];
    let query = 'SELECT * FROM gastos_eventos WHERE campus=$1';
    if (evento_id !== undefined) {
      query += ` AND evento_id=$${params.length + 1}`;
      params.push(evento_id);
    }
    query += ' ORDER BY fecha DESC, id DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gastos-eventos
router.post('/', async (req, res) => {
  try {
    const { evento_id, fecha, concepto, monto, nota = null, tipo_comprobante = null, comprobante_url = null, foto_url = null } = req.body;
    if (!evento_id || !fecha || !concepto || !monto) {
      return res.status(400).json({ error: 'evento_id, fecha, concepto y monto son requeridos' });
    }
    const { rows } = await pool.query(
      'INSERT INTO gastos_eventos (evento_id, fecha, concepto, monto, nota, tipo_comprobante, comprobante_url, foto_url, campus) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [evento_id, fecha, concepto, monto, nota, tipo_comprobante, comprobante_url, foto_url, req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gastos-eventos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM gastos_eventos WHERE id=$1 AND campus=$2 RETURNING *',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
