const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

const router = express.Router();

function requireAuth(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.authUsuario = jwt.verify(token, process.env.JWT_SECRET || 'fallback_dev_secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// GET /api/voluntarios
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*,
              u.nombre  AS registrado_por_nombre,
              (lu.id IS NOT NULL) AS es_lider,
              lm.nombre AS lidera_ministerio,
              -- ministerios reales desde la tabla puente (ya no de ministerio1/2/3),
              -- filtrados por el campus del request.
              COALESCE((
                SELECT json_agg(json_build_object('id', m.id, 'nombre', m.nombre, 'color', m.color)
                                ORDER BY m.nombre)
                  FROM voluntario_ministerios vm
                  JOIN ministerios m ON m.id = vm.ministerio_id
                 WHERE vm.voluntario_id = v.id
                   AND vm.campus = $1
              ), '[]'::json) AS ministerios
         FROM voluntarios v
         LEFT JOIN usuarios u  ON u.id = v.registrado_por
         LEFT JOIN usuarios lu ON lu.voluntario_id = v.id
                              AND lu.rol = 'lider_ministerio'
                              AND lu.activo = true
         LEFT JOIN ministerios lm ON lm.id = lu.ministerio_id
        WHERE v.campus=$1
        ORDER BY v.nombre ASC`,
      [req.campus]
    );
    res.json(rows);
  } catch (err) {
    console.error('[voluntarios] GET:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Normaliza un array de ids de ministerio del body a enteros únicos. Devuelve
// null si el campo NO viene (para distinguir "no enviado" de "lista vacía").
function normalizarMinisterioIds(valor) {
  if (!Array.isArray(valor)) return null;
  return [...new Set(valor.map(Number).filter(Number.isInteger))];
}

// POST /api/voluntarios
router.post('/', requireAuth, async (req, res) => {
  const { nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area, correo } = req.body || {};
  if (!nombre || !ministerio1) {
    return res.status(400).json({ error: 'Nombre y Ministerio 1 son obligatorios' });
  }
  const ministerioIds = normalizarMinisterioIds(req.body?.ministerio_ids);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO voluntarios (nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area, correo, campus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
       ministerio1, ministerio2 || null, ministerio3 || null, otra_area?.trim() || null,
       correo?.trim() || null, req.campus]
    );
    const nuevo = rows[0];

    // Tabla puente: una fila por ministerio_id. campus SIEMPRE del servidor.
    if (ministerioIds && ministerioIds.length) {
      await client.query(
        `INSERT INTO voluntario_ministerios (voluntario_id, ministerio_id, campus)
         SELECT $1, mid, $2 FROM unnest($3::int[]) AS mid
         ON CONFLICT (voluntario_id, ministerio_id) DO NOTHING`,
        [nuevo.id, req.campus, ministerioIds]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(nuevo);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* la tx pudo no abrirse */ }
    console.error('[voluntarios] POST:', err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// PUT /api/voluntarios/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area, correo } = req.body || {};
  if (!nombre || !ministerio1) {
    return res.status(400).json({ error: 'Nombre y Ministerio 1 son obligatorios' });
  }
  // Solo se sincroniza la tabla puente si ministerio_ids viene EXPLÍCITO (array).
  // Si viene undefined, no se toca la puente.
  const ministerioIds = normalizarMinisterioIds(req.body?.ministerio_ids);
  const volId = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE voluntarios
       SET nombre=$1, cumpleanos=$2, whatsapp=$3, ministerio1=$4, ministerio2=$5, ministerio3=$6, otra_area=$7, correo=$8
       WHERE id=$9 AND campus=$10
       RETURNING *`,
      [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
       ministerio1, ministerio2 || null, ministerio3 || null,
       otra_area?.trim() || null, correo?.trim() || null, volId, req.campus]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Voluntario no encontrado' });
    }

    if (ministerioIds !== null) {
      // Borra las que ya no estén en el array (con [] borra todas).
      await client.query(
        `DELETE FROM voluntario_ministerios
          WHERE voluntario_id = $1 AND NOT (ministerio_id = ANY($2::int[]))`,
        [volId, ministerioIds]
      );
      // Inserta las nuevas. campus SIEMPRE del servidor.
      if (ministerioIds.length) {
        await client.query(
          `INSERT INTO voluntario_ministerios (voluntario_id, ministerio_id, campus)
           SELECT $1, mid, $2 FROM unnest($3::int[]) AS mid
           ON CONFLICT (voluntario_id, ministerio_id) DO NOTHING`,
          [volId, req.campus, ministerioIds]
        );
      }
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* la tx pudo no abrirse */ }
    console.error('[voluntarios] PUT:', err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// DELETE /api/voluntarios/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM voluntarios WHERE id=$1 AND campus=$2',
      [req.params.id, req.campus]
    );
    if (!rowCount) return res.status(404).json({ error: 'Voluntario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[voluntarios] DELETE:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
