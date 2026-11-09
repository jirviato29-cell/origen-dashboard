const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const METODOS = ['efectivo', 'terminal', 'transferencia'];

const texto = (v) => String(v ?? '').trim();
const cantidadValida = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

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
      LEFT JOIN ofrendas_especiales_registros oer ON oer.ofrenda_id = oe.id AND oer.pagado = TRUE
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
    const body = req.body;
    const { rows: actuales } = await pool.query(
      'SELECT * FROM ofrendas_especiales_registros WHERE id = $1 AND campus = $2',
      [req.params.rid, req.campus]
    );
    if (!actuales.length) return res.status(404).json({ error: 'Registro no encontrado' });
    const actual = actuales[0];

    const cambios = {};
    if ('nombre_persona' in body) {
      cambios.nombre_persona = texto(body.nombre_persona);
      if (!cambios.nombre_persona) return res.status(400).json({ error: 'nombre_persona es requerido' });
    }
    if ('cantidad' in body) {
      if (!cantidadValida(body.cantidad)) return res.status(400).json({ error: 'cantidad debe ser mayor a 0' });
      cambios.cantidad = Number(body.cantidad);
    }
    // Los registros antiguos pueden no tener estos datos: solo son obligatorios
    // si el registro ya los tenía.
    for (const campo of ['email', 'whatsapp', 'fecha_entrega']) {
      if (!(campo in body)) continue;
      const valor = texto(body[campo]) || null;
      if (!valor && actual[campo]) return res.status(400).json({ error: `${campo} es requerido` });
      if (campo === 'fecha_entrega' && valor && !fechaValida(valor)) {
        return res.status(400).json({ error: 'fecha_entrega inválida' });
      }
      cambios[campo] = valor;
    }

    if ('pagado' in body && typeof body.pagado !== 'boolean') {
      return res.status(400).json({ error: 'pagado debe ser true o false' });
    }
    const pagado = 'pagado' in body ? body.pagado : actual.pagado;
    const metodo = 'metodo' in body ? body.metodo : actual.metodo;
    if (pagado && !METODOS.includes(metodo)) {
      return res.status(400).json({ error: 'metodo debe ser efectivo, terminal o transferencia' });
    }
    cambios.pagado = pagado;
    cambios.metodo = pagado ? metodo : null;

    const campos = Object.keys(cambios);
    const set = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE ofrendas_especiales_registros SET ${set}
       WHERE id = $${campos.length + 1} AND campus = $${campos.length + 2} RETURNING *`,
      [...campos.map(c => cambios[c]), req.params.rid, req.campus]
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
    // Total y subtotales cuentan solo lo pagado; `data` trae todos los compromisos.
    const pagados = registros.filter(r => r.pagado);
    const total = pagados.reduce((s, r) => s + Number(r.cantidad), 0);
    const subtotales = Object.fromEntries(METODOS.map(m => [
      m,
      pagados.filter(r => r.metodo === m).reduce((s, r) => s + Number(r.cantidad), 0),
    ]));
    res.json({ data: registros, total, subtotales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ofrendas-especiales/:id/registros
router.post('/:id/registros', async (req, res) => {
  try {
    const { cantidad, metodo, pagado = false } = req.body;
    const nombre_persona = texto(req.body.nombre_persona);
    const email          = texto(req.body.email);
    const whatsapp       = texto(req.body.whatsapp);
    const fecha_entrega  = texto(req.body.fecha_entrega);

    if (!nombre_persona)            return res.status(400).json({ error: 'nombre_persona es requerido' });
    if (!email)                     return res.status(400).json({ error: 'email es requerido' });
    if (!whatsapp)                  return res.status(400).json({ error: 'whatsapp es requerido' });
    if (!cantidadValida(cantidad))  return res.status(400).json({ error: 'cantidad debe ser mayor a 0' });
    if (!fecha_entrega)             return res.status(400).json({ error: 'fecha_entrega es requerida' });
    if (!fechaValida(fecha_entrega)) return res.status(400).json({ error: 'fecha_entrega inválida' });
    if (typeof pagado !== 'boolean') return res.status(400).json({ error: 'pagado debe ser true o false' });
    if (pagado && !METODOS.includes(metodo)) {
      return res.status(400).json({ error: 'metodo debe ser efectivo, terminal o transferencia' });
    }

    // Verificar que la ofrenda padre pertenece al campus activo
    const { rows: oeRows } = await pool.query(
      'SELECT id FROM ofrendas_especiales WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!oeRows.length) return res.status(404).json({ error: 'Ofrenda especial no encontrada' });

    const { rows } = await pool.query(
      `INSERT INTO ofrendas_especiales_registros
         (ofrenda_id, nombre_persona, email, whatsapp, cantidad, fecha_entrega, pagado, metodo, fecha, campus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (NOW() AT TIME ZONE 'America/Mexico_City')::date, $9)
       RETURNING *`,
      [req.params.id, nombre_persona, email, whatsapp, Number(cantidad), fecha_entrega, pagado, pagado ? metodo : null, req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
