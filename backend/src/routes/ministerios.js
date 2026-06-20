const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/ministerios
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ministerios WHERE campus=$1 ORDER BY nombre',
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ministerios
router.post('/', async (req, res) => {
  try {
    const { nombre, color } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'nombre es requerido' });
    }
    const { rows } = await pool.query(
      'INSERT INTO ministerios (nombre, color, campus) VALUES ($1,$2,$3) RETURNING *',
      [nombre.trim(), color || '#64748B', req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un ministerio con ese nombre' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ministerios/:id — actualiza nombre+color; cascada en voluntarios solo si cambió el nombre
router.put('/:id', async (req, res) => {
  const { nombre, color } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'nombre es requerido' });
  }
  const nombreNuevo = nombre.trim();
  const colorNuevo  = color || '#64748B';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // a) Lee el nombre actual
    const { rows: found } = await client.query(
      'SELECT nombre FROM ministerios WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!found.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }
    const nombreViejo  = found[0].nombre;
    const nombreCambio = nombreViejo !== nombreNuevo;

    // b) Siempre actualiza nombre + color en el catálogo
    const { rows: updated } = await client.query(
      'UPDATE ministerios SET nombre=$1, color=$2 WHERE id=$3 AND campus=$4 RETURNING *',
      [nombreNuevo, colorNuevo, req.params.id, req.campus]
    );

    // c) Cascada en voluntarios SOLO si el nombre cambió
    if (nombreCambio) {
      await client.query(
        'UPDATE voluntarios SET ministerio1=$1 WHERE ministerio1=$2 AND campus=$3',
        [nombreNuevo, nombreViejo, req.campus]
      );
      await client.query(
        'UPDATE voluntarios SET ministerio2=$1 WHERE ministerio2=$2 AND campus=$3',
        [nombreNuevo, nombreViejo, req.campus]
      );
      await client.query(
        'UPDATE voluntarios SET ministerio3=$1 WHERE ministerio3=$2 AND campus=$3',
        [nombreNuevo, nombreViejo, req.campus]
      );
      await client.query(
        'UPDATE voluntarios SET otra_area=$1 WHERE otra_area=$2 AND campus=$3',
        [nombreNuevo, nombreViejo, req.campus]
      );
    }

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un ministerio con ese nombre' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/ministerios/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM ministerios WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
