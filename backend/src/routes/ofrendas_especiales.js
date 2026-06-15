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
      GROUP BY oe.id, oe.nombre, oe.created_at
      ORDER BY oe.created_at DESC
    `);
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
      'INSERT INTO ofrendas_especiales (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
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
       WHERE id = $5 RETURNING *`,
      [nombre_persona || null, cantidad != null ? cantidad : null, metodo || null, fecha || null, req.params.rid]
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
      'DELETE FROM ofrendas_especiales_registros WHERE id=$1 RETURNING id',
      [req.params.rid]
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
      `SELECT * FROM ofrendas_especiales_registros
       WHERE ofrenda_id = $1 ORDER BY fecha DESC, created_at DESC`,
      [req.params.id]
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
    const { rows } = await pool.query(
      `INSERT INTO ofrendas_especiales_registros (ofrenda_id, nombre_persona, cantidad, metodo, fecha)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, nombre_persona.trim(), cantidad, metodo, fecha]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
