const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { JWT_SECRET } = require('../lib/session');

const router = express.Router();

// Alta y gestión de voluntarios por parte del líder de su ministerio.
//
// Este router SOLO crea filas nuevas en `voluntarios` y su cuenta ligada en
// `usuarios`. Nunca modifica ni borra fichas del directorio viejo: todo se
// filtra por usuarios.ministerio_id, que solo existe en las cuentas creadas
// por este flujo. Una ficha sin cuenta es invisible aquí.

const ROLES_PERMITIDOS = ['lider_ministerio', 'stewardship', 'administracion'];

function requireLider(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!ROLES_PERMITIDOS.includes(payload.rol)) {
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

    await client.query('BEGIN');

    // a) Ficha nueva en el directorio. ministerio2/3, correo y otra_area quedan
    //    en null: este flujo solo captura lo mínimo.
    const { rows: ficha } = await client.query(
      `INSERT INTO voluntarios (nombre, whatsapp, cumpleanos, campus, ministerio1)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [nombre, whatsapp, cumpleanos, ctx.campus, ministerioNombre]
    );
    const fichaId = ficha[0].id;

    // b) Cuenta de acceso ligada a la ficha.
    const { rows: cuenta } = await client.query(
      `INSERT INTO usuarios
         (nombre, rol, apodo, clave_hash, activo, campus, acceso_global, voluntario_id, ministerio_id)
       VALUES ($1, 'voluntario', $2, $3, true, $4, false, $5, $6)
       RETURNING id`,
      [nombre, apodo, claveHash, ctx.campus, fichaId, ctx.ministerioId]
    );

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
