const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/ofrendas-especiales
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        oe.id,
        oe.nombre,
        oe.created_at,
        COALESCE(SUM(oer.cantidad), 0)::numeric AS total
      FROM ofrendas_especiales oe
      LEFT JOIN ofrendas_especiales_registros oer ON oer.ofrenda_id = oe.id
      WHERE oe.campus = $1
      GROUP BY oe.id, oe.nombre, oe.created_at
      ORDER BY oe.created_at DESC
    `, [req.campus]);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ofrendas-especiales
router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'nombre es requerido' });
    const { rows } = await pool.query(
      'INSERT INTO ofrendas_especiales (nombre, campus) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ofrendas-especiales/registros/:rid  (debe ir ANTES de /:id/registros)
router.patch('/registros/:rid', async (req, res) => {
  try {
    const { nombre_persona, cantidad, metodo, fecha } = req.body;
    const { rows } = await pool.query(
      `UPDATE ofrendas_especiales_registros
       SET nombre_persona = COALESCE($1, nombre_persona),
           cantidad       = COALESCE($2, cantidad),
           metodo         = COALESCE($3, metodo),
           fecha          = COALESCE($4, fecha)
       WHERE id = $5 AND campus = $6 RETURNING *`,
      [nombre_persona || null, cantidad != null ? cantidad : null, metodo || null, fecha || null, req.params.rid, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ofrendas-especiales/registros/:rid
router.delete('/registros/:rid', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM ofrendas_especiales_registros WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.rid, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ofrendas-especiales/:id/registros
router.get('/:id/registros', async (req, res) => {
  try {
    const { rows: registros } = await pool.query(
      `SELECT oer.* FROM ofrendas_especiales_registros oer
       JOIN ofrendas_especiales oe ON oe.id = oer.ofrenda_id
       WHERE oer.ofrenda_id = $1 AND oe.campus = $2
       ORDER BY oer.fecha DESC, oer.created_at DESC`,
      [req.params.id, req.campus]
    );
    const total = registros.reduce((s, r) => s + Number(r.cantidad), 0);
    res.json({ data: registros, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ofrendas-especiales/:id/registros
router.post('/:id/registros', async (req, res) => {
  try {
    const { nombre_persona, cantidad, metodo, fecha } = req.body;
    if (!nombre_persona?.trim()) return res.status(400).json({ error: 'nombre_persona es requerido' });
    if (cantidad == null)        return res.status(400).json({ error: 'cantidad es requerida' });
    if (!metodo)                 return res.status(400).json({ error: 'metodo es requerido' });
    if (!fecha)                  return res.status(400).json({ error: 'fecha es requerida' });

    // Verificar que la ofrenda padre pertenece al campus activo
    const { rows: oeRows } = await pool.query(
      'SELECT id FROM ofrendas_especiales WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!oeRows.length) return res.status(404).json({ error: 'Ofrenda especial no encontrada' });

    const { rows } = await pool.query(
      `INSERT INTO ofrendas_especiales_registros (ofrenda_id, nombre_persona, cantidad, metodo, fecha, campus)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, nombre_persona.trim(), cantidad, metodo, fecha, req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
