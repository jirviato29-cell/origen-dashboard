const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

pool.query(`
  CREATE TABLE IF NOT EXISTS visitantes (
    id                 SERIAL PRIMARY KEY,
    fecha              DATE,
    relacion_con_origen TEXT,
    nombre             TEXT NOT NULL,
    edad               INT,
    estado_fe          TEXT,
    whatsapp           TEXT,
    como_se_entero     TEXT,
    acompanantes       TEXT,
    acompanantes_num   INT DEFAULT 0,
    colonia            TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => console.error('visitantes init:', e.message));

pool.query(`ALTER TABLE visitantes ADD COLUMN IF NOT EXISTS acompanantes_num INT DEFAULT 0`)
  .catch(e => console.error('visitantes alter:', e.message));

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM visitantes ORDER BY fecha DESC NULLS LAST, id DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fecha, relacion_con_origen, nombre, edad, estado_fe, whatsapp, como_se_entero, acompanantes, acompanantes_num, colonia } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'nombre es requerido' });
    const { rows } = await pool.query(
      `INSERT INTO visitantes (fecha, relacion_con_origen, nombre, edad, estado_fe, whatsapp, como_se_entero, acompanantes, acompanantes_num, colonia)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        fecha || null,
        relacion_con_origen?.trim() || null,
        nombre.trim(),
        edad != null && edad !== '' ? parseInt(edad, 10) : null,
        estado_fe?.trim() || null,
        whatsapp?.trim() || null,
        como_se_entero?.trim() || null,
        acompanantes?.trim() || null,
        acompanantes_num != null && acompanantes_num !== '' ? parseInt(acompanantes_num, 10) : 0,
        colonia?.trim() || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { fecha, relacion_con_origen, nombre, edad, estado_fe, whatsapp, como_se_entero, acompanantes, acompanantes_num, colonia } = req.body;
    const { rows } = await pool.query(
      `UPDATE visitantes SET
        fecha=$1, relacion_con_origen=$2, nombre=$3, edad=$4,
        estado_fe=$5, whatsapp=$6, como_se_entero=$7, acompanantes=$8, acompanantes_num=$9, colonia=$10
       WHERE id=$11 RETURNING *`,
      [
        fecha || null,
        relacion_con_origen?.trim() || null,
        nombre?.trim(),
        edad != null && edad !== '' ? parseInt(edad, 10) : null,
        estado_fe?.trim() || null,
        whatsapp?.trim() || null,
        como_se_entero?.trim() || null,
        acompanantes?.trim() || null,
        acompanantes_num != null && acompanantes_num !== '' ? parseInt(acompanantes_num, 10) : 0,
        colonia?.trim() || null,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
