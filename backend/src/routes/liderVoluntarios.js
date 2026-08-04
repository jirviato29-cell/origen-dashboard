const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');
const { esLiderMinisterio } = require('../lib/liderMinisterio');
// Deduplicación por WhatsApp: MISMOS helpers que usa routes/voluntarios.js.
const {
  normalizarWhats,
  normalizarMinisterioIds,
  nombresDeMinisterios,
  buscarPorWhatsapp,
  agregarMinisterios,
} = require('../utils/voluntarios');

const router = express.Router();

// Alta y gestión de voluntarios por parte del líder de su ministerio.
//
// Este router SOLO crea filas nuevas en `voluntarios` y su cuenta ligada en
// `usuarios`. Nunca modifica ni borra fichas del directorio viejo: todo se
// filtra por usuarios.ministerio_id, que solo existe en las cuentas creadas
// por este flujo. Una ficha sin cuenta es invisible aquí.

// Supervisores que siempre pueden operar sobre el panel de líder aunque no
// tengan ministerio propio (su contexto se valida luego en contextoLider).
const ROLES_ELEVADOS = ['stewardship', 'administracion'];

function requireLider(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Regla desacoplada del rol: es líder por ministerio_id (nunca 'voluntario'),
    // más los roles supervisores. El voluntario queda excluido SIEMPRE.
    if (!esLiderMinisterio(payload) && !ROLES_ELEVADOS.includes(payload.rol)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.authUsuario = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

router.use(requireLider);

// SEGURIDAD: el ministerio y el campus SIEMPRE salen de la fila del usuario en
// la BD, buscada por el id del token. Nunca de nada que mande el cliente: un
// líder no puede operar sobre el ministerio de otro aunque lo mande en el body.
// Devuelve null y ya respondió si no hay contexto válido.
async function contextoLider(req, res) {
  const { rows } = await pool.query(
    'SELECT ministerio_id, campus FROM usuarios WHERE id = $1 AND activo = true',
    [req.authUsuario.id]
  );

  if (rows.length === 0) {
    res.status(401).json({ error: 'Tu cuenta ya no está activa' });
    return null;
  }

  const { ministerio_id, campus } = rows[0];

  // Todo este router está acotado a un ministerio: sin él no hay nada
  // coherente que listar ni crear (y crear dejaría filas huérfanas).
  if (!ministerio_id) {
    res.status(400).json({
      error: req.authUsuario.rol === 'lider_ministerio'
        ? 'Tu cuenta de líder no tiene ministerio asignado'
        : 'Tu cuenta no tiene un ministerio asignado, no puedes gestionar sus voluntarios',
    });
    return null;
  }

  return { ministerioId: ministerio_id, campus: campus || 'ags' };
}

// La clave del voluntario son los últimos 4 dígitos de su whatsapp.
// Confirmamos que los números están capturados a 10 dígitos limpios, pero se
// normaliza igual por si acaso: se quita cualquier caracter que no sea dígito.
const soloDigitos = (v) => String(v ?? '').replace(/\D/g, '');

// Convierte un alta que ya existe (mismo WhatsApp en el campus) en "agrega mi
// ministerio al registro existente": NO crea ficha ni cuenta nueva, NO regenera
// credenciales; solo suma el ministerio de ESTE líder a la ficha que ya está.
// Corre dentro de una transacción abierta por el llamador (no hace COMMIT).
// Devuelve el cuerpo { duplicado:true, ... } o null si no hay coincidencia.
async function fusionarConMiMinisterio(client, ctx, whatsapp) {
  const existente = await buscarPorWhatsapp(client, ctx.campus, whatsapp);
  if (!existente) return null;
  const { agregados } = await agregarMinisterios(
    client, existente.id, ctx.campus, [ctx.ministerioId]
  );
  return {
    duplicado: true,
    voluntario_id: existente.id,
    nombre: existente.nombre,
    // Si el ON CONFLICT no insertó nada, el ministerio del líder ya estaba.
    ya_estaba_en_mi_ministerio: !agregados.includes(ctx.ministerioId),
    registrado_por_nombre: existente.registrado_por_nombre || null,
  };
}

// GET /api/lider/voluntarios — los que dio de alta este ministerio.
router.get('/', async (req, res) => {
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const { rows } = await pool.query(
      `SELECT u.id            AS cuenta_id,
              v.id            AS ficha_id,
              u.nombre        AS nombre,
              u.apodo         AS apodo,
              v.cumpleanos    AS cumpleanos,
              v.whatsapp      AS whatsapp,
              -- clave = últimos 4 dígitos del whatsapp, al vuelo
              right(regexp_replace(coalesce(v.whatsapp, ''), '\\D', '', 'g'), 4) AS clave
         FROM usuarios u
         JOIN voluntarios v ON u.voluntario_id = v.id
        WHERE u.rol = 'voluntario'
          AND u.ministerio_id = $1
        ORDER BY u.nombre`,
      [ctx.ministerioId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('[lider/voluntarios] GET:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/lider/voluntarios/buscar-por-whatsapp?whatsapp=XXXXXXXXXX
// Para el flujo "ya sirve en otro ministerio": el líder teclea el WhatsApp y, si
// ya existe la ficha en SU campus, le mostramos quién es (solo lectura) y si ya
// está o no en su ministerio. Va ANTES de cualquier ruta '/:algo' para que
// Express no lo confunda con un id. El campus y el ministerio salen del ctx,
// nunca del cliente; no se expone clave_hash ni nada de otros campus.
router.get('/buscar-por-whatsapp', async (req, res) => {
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const whats10 = normalizarWhats(req.query.whatsapp);
    if (!whats10) return res.json({ existe: false });

    // buscarPorWhatsapp ya acota por campus y trae la lista de ministerios.
    const ficha = await buscarPorWhatsapp(pool, ctx.campus, whats10);
    if (!ficha) return res.json({ existe: false });

    // Nombre de acceso (apodo) de la cuenta ligada a la ficha, si la tiene.
    const { rows: cuenta } = await pool.query(
      'SELECT apodo FROM usuarios WHERE voluntario_id = $1 LIMIT 1',
      [ficha.id]
    );
    const apodo = cuenta[0]?.apodo || null;

    // Clave = últimos 4 dígitos del whatsapp de la ficha (no se genera nada).
    const clave = soloDigitos(ficha.whatsapp).slice(-4) || null;

    // ¿ya sirve en MI ministerio? (fila en la puente con el ministerio del líder)
    const { rows: yaMin } = await pool.query(
      'SELECT 1 FROM voluntario_ministerios WHERE voluntario_id = $1 AND ministerio_id = $2 LIMIT 1',
      [ficha.id, ctx.ministerioId]
    );

    return res.json({
      existe: true,
      voluntario: {
        id:          ficha.id,
        nombre:      ficha.nombre,
        cumpleanos:  ficha.cumpleanos,
        whatsapp:    ficha.whatsapp,
        apodo,
        clave,
        ministerios: ficha.ministerios || [],
        ya_en_mi_ministerio: yaMin.length > 0,
      },
    });
  } catch (err) {
    console.error('[lider/voluntarios] GET buscar-por-whatsapp:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/lider/voluntarios — crea ficha + cuenta de acceso.
router.post('/', async (req, res) => {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const apodo  = typeof req.body?.apodo  === 'string' ? req.body.apodo.trim()  : '';
  const cumpleanos = req.body?.cumpleanos || null;
  const whatsapp = soloDigitos(req.body?.whatsapp);

  if (!nombre) return res.status(400).json({ error: 'Falta el nombre del voluntario' });
  if (!apodo)  return res.status(400).json({ error: 'Falta el apodo, lo necesita para entrar' });
  if (!req.body?.whatsapp) {
    return res.status(400).json({ error: 'Falta el WhatsApp, se necesita para generar la clave' });
  }
  // Sin un número válido no hay clave posible: no se puede dar de alta.
  if (whatsapp.length < 4) {
    return res.status(400).json({ error: 'El WhatsApp no es válido, se necesita para generar la clave' });
  }

  const client = await pool.connect();
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    // Identidad anti-duplicados: últimos 10 dígitos del WhatsApp en el campus
    // (null si no llega a 10 dígitos, para NO deduplicar con datos incompletos).
    const whats10 = normalizarWhats(req.body?.whatsapp);

    // Blindaje 1 (proactivo): si ya existe una ficha con ese WhatsApp en el
    // campus, NO se crea otra ni se regenera su acceso; solo se agrega el
    // ministerio de ESTE líder al registro existente y se responde duplicado.
    if (whats10) {
      await client.query('BEGIN');
      const dup = await fusionarConMiMinisterio(client, ctx, whats10);
      if (dup) {
        await client.query('COMMIT');
        return res.status(200).json(dup);
      }
      await client.query('ROLLBACK');
    }

    // Los apodos pueden repetirse entre ministerios, pero no dentro del mismo:
    // ahí el líder no sabría a quién le está dando cuál clave.
    const { rows: repetido } = await client.query(
      `SELECT 1 FROM usuarios
        WHERE rol = 'voluntario'
          AND ministerio_id = $1
          AND lower(btrim(apodo)) = lower(btrim($2))
        LIMIT 1`,
      [ctx.ministerioId, apodo]
    );
    if (repetido.length > 0) {
      return res.status(409).json({ error: 'Ya tienes un voluntario con ese apodo, usa otro' });
    }

    const { rows: min } = await client.query(
      'SELECT nombre FROM ministerios WHERE id = $1',
      [ctx.ministerioId]
    );
    const ministerioNombre = min[0]?.nombre || null;

    const clave      = whatsapp.slice(-4);
    const claveHash  = await bcrypt.hash(clave, 10);

    // Respaldo textual ministerio1/2/3: si el body trae ministerio_ids, se
    // derivan de sus primeros 3; si no, se conserva el comportamiento previo
    // (ministerio1 = el ministerio del líder).
    const ministerioIds = normalizarMinisterioIds(req.body?.ministerio_ids);
    let m1 = ministerioNombre, m2 = null, m3 = null;
    if (ministerioIds && ministerioIds.length) {
      [m1, m2, m3] = await nombresDeMinisterios(client, ministerioIds);
    }

    await client.query('BEGIN');

    // a) Ficha nueva en el directorio. correo y otra_area quedan en null: este
    //    flujo solo captura lo mínimo. registrado_por = quién dio el alta,
    //    SIEMPRE resuelto del token en el servidor (nunca del body).
    let fichaId;
    try {
      const { rows: ficha } = await client.query(
        `INSERT INTO voluntarios (nombre, whatsapp, cumpleanos, campus, ministerio1, ministerio2, ministerio3, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [nombre, whatsapp, cumpleanos, ctx.campus, m1, m2, m3, req.authUsuario.id]
      );
      fichaId = ficha[0].id;
    } catch (err) {
      // Blindaje 2 (carrera): dos altas simultáneas del mismo WhatsApp. El índice
      // único uq_voluntario_whatsapp_campus dispara 23505; en vez de 500, tratamos
      // el alta como duplicado y agregamos el ministerio del líder al que ganó.
      if (err.code === '23505' && whats10) {
        await client.query('ROLLBACK');
        await client.query('BEGIN');
        const dup = await fusionarConMiMinisterio(client, ctx, whats10);
        if (dup) {
          await client.query('COMMIT');
          return res.status(200).json(dup);
        }
        await client.query('ROLLBACK');
      }
      throw err;
    }

    // b) Cuenta de acceso ligada a la ficha.
    const { rows: cuenta } = await client.query(
      `INSERT INTO usuarios
         (nombre, rol, apodo, clave_hash, activo, campus, acceso_global, voluntario_id, ministerio_id)
       VALUES ($1, 'voluntario', $2, $3, true, $4, false, $5, $6)
       RETURNING id`,
      [nombre, apodo, claveHash, ctx.campus, fichaId, ctx.ministerioId]
    );

    // c) Tabla puente voluntario_ministerios: una fila por ministerio_id del
    //    body (opcional). campus SIEMPRE del servidor (ctx.campus), nunca del
    //    body. Si no viene el array, no se inserta nada.
    if (ministerioIds && ministerioIds.length) {
      await client.query(
        `INSERT INTO voluntario_ministerios (voluntario_id, ministerio_id, campus)
         SELECT $1, mid, $2 FROM unnest($3::int[]) AS mid
         ON CONFLICT (voluntario_id, ministerio_id) DO NOTHING`,
        [fichaId, ctx.campus, ministerioIds]
      );
    }

    await client.query('COMMIT');

    // La clave viaja en claro solo aquí, para que el líder se la pase.
    return res.status(201).json({
      cuenta_id:  cuenta[0].id,
      ficha_id:   fichaId,
      nombre,
      apodo,
      cumpleanos,
      whatsapp,
      clave,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* la tx pudo no abrirse */ }
    console.error('[lider/voluntarios] POST:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// DELETE /api/lider/voluntarios/:cuentaId — quita un voluntario de este flujo.
router.delete('/:cuentaId', async (req, res) => {
  const client = await pool.connect();
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    // El filtro por ministerio es lo que impide borrar la cuenta de otro
    // ministerio. Una ficha del directorio viejo no tiene cuenta, así que
    // nunca puede caer aquí.
    const { rows: cuenta } = await client.query(
      `SELECT id, voluntario_id FROM usuarios
        WHERE id = $1 AND rol = 'voluntario' AND ministerio_id = $2`,
      [req.params.cuentaId, ctx.ministerioId]
    );
    if (cuenta.length === 0) {
      return res.status(404).json({ error: 'Ese voluntario no es de tu ministerio' });
    }

    await client.query('BEGIN');
    // La cuenta primero: usuarios.voluntario_id apunta a la ficha.
    await client.query('DELETE FROM usuarios WHERE id = $1', [cuenta[0].id]);
    if (cuenta[0].voluntario_id) {
      await client.query('DELETE FROM voluntarios WHERE id = $1', [cuenta[0].voluntario_id]);
    }
    await client.query('COMMIT');

    return res.json({ ok: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* la tx pudo no abrirse */ }
    console.error('[lider/voluntarios] DELETE:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
// Se exportan para reusar la MISMA autenticación/contexto en otros routers del
// líder (p. ej. liderPosiciones) sin duplicar la lógica.
module.exports.requireLider = requireLider;
module.exports.contextoLider = contextoLider;
