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
              -- Cuenta de acceso ligada a la ficha (sin filtrar por rol): apodo
              -- de login y clave = últimos 4 dígitos del whatsapp (null si no hay).
              cu.apodo AS apodo,
              right(regexp_replace(v.whatsapp, '\\D', '', 'g'), 4) AS clave,
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
                              AND lu.ministerio_id IS NOT NULL
                              AND lu.rol <> 'voluntario'
                              AND lu.activo = true
         LEFT JOIN ministerios lm ON lm.id = lu.ministerio_id
         LEFT JOIN usuarios cu ON cu.voluntario_id = v.id
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

// Respaldo textual: resuelve los nombres de los PRIMEROS 3 ids (en el orden en
// que llegan) para guardarlos en ministerio1/2/3. Los ids sobrantes viven solo
// en la tabla puente. Devuelve siempre una terna [m1, m2, m3] (null si falta).
async function nombresDeMinisterios(client, ids) {
  const primeros = (ids || []).slice(0, 3);
  if (primeros.length === 0) return [null, null, null];
  const { rows } = await client.query(
    'SELECT id, nombre FROM ministerios WHERE id = ANY($1::int[])',
    [primeros]
  );
  const porId = new Map(rows.map(r => [r.id, r.nombre]));
  return [0, 1, 2].map(i => (primeros[i] != null ? (porId.get(primeros[i]) || null) : null));
}

// Normaliza un WhatsApp a sus últimos 10 dígitos (identidad de la persona en el
// campus). Devuelve null si no hay al menos 10 dígitos, para NO deduplicar con
// datos incompletos.
function normalizarWhats(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
}

// Busca en un campus el voluntario cuyos últimos 10 dígitos de WhatsApp coinciden
// con `whats10`. Devuelve la ficha con su lista de ministerios, o null. Acepta un
// `db` que puede ser el pool o un client dentro de transacción.
async function buscarVoluntarioPorWhats(db, campus, whats10) {
  const { rows } = await db.query(
    `SELECT v.id, v.nombre, v.correo, v.cumpleanos, v.whatsapp, v.registrado_por,
            u.nombre AS registrado_por_nombre
       FROM voluntarios v
       LEFT JOIN usuarios u ON u.id = v.registrado_por
      WHERE v.campus = $1
        AND right(regexp_replace(coalesce(v.whatsapp,''),'[^0-9]','','g'),10) = $2
      LIMIT 1`,
    [campus, whats10]
  );
  if (!rows.length) return null;
  const vol = rows[0];
  const { rows: mins } = await db.query(
    `SELECT m.id, m.nombre, m.color
       FROM voluntario_ministerios vm
       JOIN ministerios m ON m.id = vm.ministerio_id
      WHERE vm.voluntario_id = $1
      ORDER BY vm.id`,
    [vol.id]
  );
  return { ...vol, ministerios: mins };
}

// Agrega ministerios a un voluntario existente (idempotente vía índice único
// uq_voluntario_ministerio) y resincroniza el respaldo textual ministerio1/2/3
// con los 3 primeros (por orden de alta en la puente). Debe correr dentro de una
// transacción. Devuelve { agregados, ministerios } donde `agregados` son solo los
// ids realmente insertados y `ministerios` la lista final del voluntario.
async function agregarMinisterios(client, voluntarioId, campus, ministerioIds) {
  const ids = normalizarMinisterioIds(ministerioIds) || [];
  const agregados = [];
  for (const mid of ids) {
    const { rowCount } = await client.query(
      `INSERT INTO voluntario_ministerios (voluntario_id, ministerio_id, campus)
       VALUES ($1, $2, $3)
       ON CONFLICT (voluntario_id, ministerio_id) DO NOTHING`,
      [voluntarioId, mid, campus]
    );
    if (rowCount > 0) agregados.push(mid);
  }
  const { rows: ministerios } = await client.query(
    `SELECT m.id, m.nombre, m.color
       FROM voluntario_ministerios vm
       JOIN ministerios m ON m.id = vm.ministerio_id
      WHERE vm.voluntario_id = $1
      ORDER BY vm.id`,
    [voluntarioId]
  );
  const [m1, m2, m3] = [0, 1, 2].map(i => ministerios[i]?.nombre || null);
  await client.query(
    'UPDATE voluntarios SET ministerio1=$1, ministerio2=$2, ministerio3=$3 WHERE id=$4',
    [m1, m2, m3, voluntarioId]
  );
  return { agregados, ministerios };
}

// Fusiona un alta duplicada: busca al voluntario existente por WhatsApp y le
// agrega los ministerios recibidos. Debe correr dentro de una transacción (no
// hace COMMIT). Devuelve el cuerpo de respuesta { duplicado:true, ... } o null si
// no hay coincidencia.
async function fusionarDuplicado(client, campus, whats10, ministerioIds) {
  const existente = await buscarVoluntarioPorWhats(client, campus, whats10);
  if (!existente) return null;
  const { agregados, ministerios } = await agregarMinisterios(client, existente.id, campus, ministerioIds || []);
  return {
    duplicado: true,
    voluntario_id: existente.id,
    nombre: existente.nombre,
    agregados,
    ministerios,
  };
}

// GET /api/voluntarios/buscar-por-whatsapp?whatsapp=XXXXXXXXXX
// Detecta si ya existe una ficha con ese WhatsApp en el campus del request, para
// que el formulario avise antes de crear un duplicado. Va ANTES de las rutas
// '/:id' para que Express no lo confunda con un id.
router.get('/buscar-por-whatsapp', requireAuth, async (req, res) => {
  const whats10 = normalizarWhats(req.query.whatsapp);
  if (!whats10) return res.json({ existe: false });
  try {
    const voluntario = await buscarVoluntarioPorWhats(pool, req.campus, whats10);
    if (!voluntario) return res.json({ existe: false });
    res.json({ existe: true, voluntario });
  } catch (err) {
    console.error('[voluntarios] buscar-por-whatsapp:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/voluntarios/:id/ministerios   body: { ministerio_ids: [1,2] }
// Agrega ministerios a un voluntario existente del campus (no crea filas nuevas).
// Va ANTES de las rutas '/:id' de otros métodos por consistencia de orden.
router.post('/:id/ministerios', requireAuth, async (req, res) => {
  const volId = Number(req.params.id);
  if (!Number.isInteger(volId)) {
    return res.status(404).json({ error: 'Voluntario no encontrado' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id FROM voluntarios WHERE id=$1 AND campus=$2',
      [volId, req.campus]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Voluntario no encontrado' });
    }
    const { agregados, ministerios } = await agregarMinisterios(
      client, volId, req.campus, req.body?.ministerio_ids
    );
    await client.query('COMMIT');
    res.json({ ok: true, agregados, ministerios });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* la tx pudo no abrirse */ }
    console.error('[voluntarios] POST /:id/ministerios:', err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// POST /api/voluntarios
router.post('/', requireAuth, async (req, res) => {
  const { nombre, cumpleanos, whatsapp, otra_area, correo } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  // ministerio1/2/3 ya NO se leen del body: se derivan de ministerio_ids.
  const ministerioIds = normalizarMinisterioIds(req.body?.ministerio_ids);
  // Identidad anti-duplicados: últimos 10 dígitos del WhatsApp en el campus.
  const whats10 = normalizarWhats(whatsapp);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Blindaje 1 (proactivo): si ya existe una ficha con ese WhatsApp en el
    // campus, NO se crea otra; se le agregan los ministerios al registro
    // existente y se responde 200 con duplicado:true.
    if (whats10) {
      const dup = await fusionarDuplicado(client, req.campus, whats10, ministerioIds);
      if (dup) {
        await client.query('COMMIT');
        return res.status(200).json(dup);
      }
    }

    const [m1, m2, m3] = await nombresDeMinisterios(client, ministerioIds || []);
    let nuevo;
    try {
      const { rows } = await client.query(
        `INSERT INTO voluntarios (nombre, cumpleanos, whatsapp, ministerio1, ministerio2, ministerio3, otra_area, correo, campus)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
         m1, m2, m3, otra_area?.trim() || null,
         correo?.trim() || null, req.campus]
      );
      nuevo = rows[0];
    } catch (err) {
      // Blindaje 2 (carrera): dos altas simultáneas del mismo WhatsApp. El índice
      // único uq_voluntario_whatsapp_campus dispara 23505; en vez de 500,
      // tratamos el alta como duplicado y agregamos ministerios al que ganó.
      if (err.code === '23505' && whats10) {
        await client.query('ROLLBACK');
        await client.query('BEGIN');
        const dup = await fusionarDuplicado(client, req.campus, whats10, ministerioIds);
        if (dup) {
          await client.query('COMMIT');
          return res.status(200).json(dup);
        }
        await client.query('ROLLBACK');
      }
      throw err;
    }

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
  const { nombre, cumpleanos, whatsapp, otra_area, correo } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  // Solo se sincroniza la tabla puente (y se re-derivan ministerio1/2/3) si
  // ministerio_ids viene EXPLÍCITO (array). Si viene undefined, no se tocan ni
  // la puente ni las columnas de respaldo.
  const ministerioIds = normalizarMinisterioIds(req.body?.ministerio_ids);
  const volId = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let rows;
    if (ministerioIds !== null) {
      const [m1, m2, m3] = await nombresDeMinisterios(client, ministerioIds);
      ({ rows } = await client.query(
        `UPDATE voluntarios
         SET nombre=$1, cumpleanos=$2, whatsapp=$3, ministerio1=$4, ministerio2=$5, ministerio3=$6, otra_area=$7, correo=$8
         WHERE id=$9 AND campus=$10
         RETURNING *`,
        [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
         m1, m2, m3, otra_area?.trim() || null, correo?.trim() || null, volId, req.campus]
      ));
    } else {
      // Sin ministerio_ids: ministerio1/2/3 se dejan como están.
      ({ rows } = await client.query(
        `UPDATE voluntarios
         SET nombre=$1, cumpleanos=$2, whatsapp=$3, otra_area=$4, correo=$5
         WHERE id=$6 AND campus=$7
         RETURNING *`,
        [nombre.trim(), cumpleanos || null, whatsapp?.trim() || null,
         otra_area?.trim() || null, correo?.trim() || null, volId, req.campus]
      ));
    }

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
