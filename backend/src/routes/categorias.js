const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    let query = 'SELECT * FROM categorias';
    const params = [];
    if (tipo) {
      query += ' WHERE tipo = $1';
      params.push(tipo);
    }
    query += ' ORDER BY nombre';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, tipo } = req.body;
    if (!nombre || !tipo) return res.status(400).json({ error: 'nombre y tipo requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO categorias (nombre, tipo) VALUES ($1, $2) RETURNING *',
      [nombre, tipo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM categorias WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
