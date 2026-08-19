const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// ── Conteos y desglose por género ──────────────────────────────────────────
// Cada categoría puede llegar como total plano (adultos) o desglosada por
// género (adultos_h / adultos_m). Los registros viejos tienen el desglose en
// NULL: eso significa "registro sin desglose" y NUNCA se rellena con 0.
const CATEGORIAS = ['adultos', 'voluntarios', 'ninos', 'bebes', 'nuevos'];

const COLUMNAS_CONTEO = [
  'adultos', 'voluntarios', 'ninos', 'bebes', 'nuevos', 'total',
  'adultos_h', 'adultos_m', 'voluntarios_h', 'voluntarios_m',
  'ninos_h', 'ninos_m', 'bebes_h', 'bebes_m', 'nuevos_h', 'nuevos_m',
];

// '' | null | undefined → null (el cliente no mandó el dato). Cualquier otro
// valor se valida como entero >= 0; si no lo es, se responde 400.
function leerConteo(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error(`${campo} debe ser un número mayor o igual a 0`);
    err.status = 400;
    throw err;
  }
  return Math.trunc(n);
}

// Normaliza el body a los valores que se guardan. Si una categoría trae
// desglose, su total se calcula AQUÍ desde el desglose y se ignora el total
// que haya mandado el cliente; si no lo trae, se guarda el total plano y el
// desglose queda en NULL.
//
// El total general NO incluye a los nuevos: ya vienen contados dentro de
// adultos, así que sumarlos los contaría dos veces (misma fórmula de siempre).
function normalizarConteos(body) {
  const cats = {};
  for (const cat of CATEGORIAS) {
    const h = leerConteo(body[`${cat}_h`], `${cat}_h`);
    const m = leerConteo(body[`${cat}_m`], `${cat}_m`);
    cats[cat] = (h === null && m === null)
      ? { total: leerConteo(body[cat], cat) ?? 0, h: null, m: null }
      : { total: (h ?? 0) + (m ?? 0), h: h ?? 0, m: m ?? 0 };
  }
  cats.total = cats.adultos.total + cats.voluntarios.total + cats.ninos.total + cats.bebes.total;
  return cats;
}

// Valores en el mismo orden que COLUMNAS_CONTEO.
function valoresConteo(c) {
  return [
    c.adultos.total, c.voluntarios.total, c.ninos.total, c.bebes.total, c.nuevos.total, c.total,
    c.adultos.h, c.adultos.m, c.voluntarios.h, c.voluntarios.m,
    c.ninos.h, c.ninos.m, c.bebes.h, c.bebes.m, c.nuevos.h, c.nuevos.m,
  ];
}

// GET /api/asistencia?year=2026&month=5&limit=200
router.get('/', async (req, res) => {
  try {
    const { year, month, limit } = req.query;
    const params = [req.campus];
    const conds  = ['campus=$1'];

    if (year && month) {
      conds.push(`EXTRACT(YEAR FROM fecha)=$${params.length+1} AND EXTRACT(MONTH FROM fecha)=$${params.length+2}`);
      params.push(year, month);
    } else if (year) {
      conds.push(`EXTRACT(YEAR FROM fecha)=$${params.length+1}`);
      params.push(year);
    }

    let query = `SELECT * FROM asistencia WHERE ${conds.join(' AND ')} ORDER BY fecha DESC`;

    if (limit) {
      params.push(parseInt(limit, 10));
      query += ` LIMIT $${params.length}`;
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/asistencia] ERROR:', err);
    res.status(500).json({ error: err.message, detail: err.detail, code: err.code });
  }
});

// GET /api/asistencia/resumen-anual?year=2026
router.get('/resumen-anual', async (req, res) => {
  try {
    const y = req.query.year || new Date().getFullYear();
    const { rows } = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM fecha)::INT AS mes,
        SUM(total)   AS total,
        ROUND(AVG(total),1) AS promedio,
        SUM(adultos) AS adultos,
        SUM(voluntarios) AS voluntarios,
        SUM(ninos)   AS ninos,
        SUM(bebes)   AS bebes,
        SUM(nuevos)  AS nuevos
      FROM asistencia
      WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2
      GROUP BY mes ORDER BY mes
    `, [req.campus, y]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/asistencia/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM asistencia WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/asistencia/upsert — inserta o actualiza por fecha+campus
router.post('/upsert', async (req, res) => {
  try {
    const { fecha } = req.body;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });
    const valores = valoresConteo(normalizarConteos(req.body));

    const { rows: existing } = await pool.query(
      'SELECT id FROM asistencia WHERE fecha=$1 AND campus=$2',
      [fecha, req.campus]
    );

    let result;
    if (existing.length > 0) {
      const sets = COLUMNAS_CONTEO.map((col, i) => `${col}=$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE asistencia SET ${sets}
          WHERE fecha=$${COLUMNAS_CONTEO.length + 1} AND campus=$${COLUMNAS_CONTEO.length + 2}
         RETURNING *`,
        [...valores, fecha, req.campus]
      );
      result = rows[0];
    } else {
      const cols = ['fecha', ...COLUMNAS_CONTEO, 'campus'];
      const { rows } = await pool.query(
        `INSERT INTO asistencia (${cols.join(', ')})
         VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
        [fecha, ...valores, req.campus]
      );
      result = rows[0];
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/asistencia
router.post('/', async (req, res) => {
  try {
    const { fecha } = req.body;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });
    const valores = valoresConteo(normalizarConteos(req.body));
    const cols = ['fecha', ...COLUMNAS_CONTEO, 'campus'];
    const { rows } = await pool.query(
      `INSERT INTO asistencia (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
      [fecha, ...valores, req.campus]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /api/asistencia/:id
router.put('/:id', async (req, res) => {
  try {
    const { fecha } = req.body;
    const valores = valoresConteo(normalizarConteos(req.body));
    const sets = COLUMNAS_CONTEO.map((col, i) => `${col}=$${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE asistencia SET fecha=$1, ${sets}
        WHERE id=$${COLUMNAS_CONTEO.length + 2} AND campus=$${COLUMNAS_CONTEO.length + 3}
       RETURNING *`,
      [fecha, ...valores, req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /api/asistencia/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM asistencia WHERE id=$1 AND campus=$2 RETURNING id',
      [req.params.id, req.campus]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
