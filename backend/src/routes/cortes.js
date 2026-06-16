const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/cortes?evento_id=X
router.get('/', async (req, res) => {
  try {
    const { evento_id } = req.query;
    if (!evento_id) return res.status(400).json({ error: 'evento_id requerido' });
    const { rows } = await pool.query(
      'SELECT * FROM cortes WHERE evento_id=$1 AND campus=$2 ORDER BY fecha ASC',
      [evento_id, req.campus]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cortes/upsert — body: [{ evento_id, fecha, total_efectivo, total_tarjeta, total_transferencia, total }]
router.post('/upsert', async (req, res) => {
  try {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Se esperaba un array de cortes' });
    }
    const results = [];
    for (const r of records) {
      const { evento_id, fecha, total_efectivo, total_tarjeta, total_transferencia, total } = r;
      if (!evento_id || !fecha) continue;

      // Upsert explícito por (evento_id, fecha, campus) sin depender de ON CONFLICT
      const { rows: existing } = await pool.query(
        'SELECT id FROM cortes WHERE evento_id=$1 AND fecha=$2 AND campus=$3',
        [evento_id, fecha, req.campus]
      );

      let rows;
      if (existing.length > 0) {
        ({ rows } = await pool.query(
          `UPDATE cortes SET
             total_efectivo=$1, total_tarjeta=$2, total_transferencia=$3, total=$4
           WHERE evento_id=$5 AND fecha=$6 AND campus=$7 RETURNING *`,
          [
            parseFloat(total_efectivo)      || 0,
            parseFloat(total_tarjeta)       || 0,
            parseFloat(total_transferencia) || 0,
            parseFloat(total)               || 0,
            evento_id, fecha, req.campus,
          ]
        ));
      } else {
        ({ rows } = await pool.query(
          `INSERT INTO cortes (evento_id, fecha, total_efectivo, total_tarjeta, total_transferencia, total, campus)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [
            evento_id,
            fecha,
            parseFloat(total_efectivo)      || 0,
            parseFloat(total_tarjeta)       || 0,
            parseFloat(total_transferencia) || 0,
            parseFloat(total)               || 0,
            req.campus,
          ]
        ));
      }
      results.push(rows[0]);
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
