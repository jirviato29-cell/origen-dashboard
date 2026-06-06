const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/cortes?evento_id=X
router.get('/', async (req, res) => {
  try {
    const { evento_id } = req.query;
    if (!evento_id) return res.status(400).json({ error: 'evento_id requerido' });
    const { rows } = await pool.query(
      'SELECT * FROM cortes WHERE evento_id=$1 ORDER BY fecha ASC',
      [evento_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cortes/upsert  — body: [{ evento_id, fecha, total_efectivo, total_tarjeta, total_transferencia, total }]
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
      const { rows } = await pool.query(
        `INSERT INTO cortes (evento_id, fecha, total_efectivo, total_tarjeta, total_transferencia, total)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (evento_id, fecha)
         DO UPDATE SET
           total_efectivo      = EXCLUDED.total_efectivo,
           total_tarjeta       = EXCLUDED.total_tarjeta,
           total_transferencia = EXCLUDED.total_transferencia,
           total               = EXCLUDED.total
         RETURNING *`,
        [
          evento_id,
          fecha,
          parseFloat(total_efectivo)      || 0,
          parseFloat(total_tarjeta)       || 0,
          parseFloat(total_transferencia) || 0,
          parseFloat(total)               || 0,
        ]
      );
      results.push(rows[0]);
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
