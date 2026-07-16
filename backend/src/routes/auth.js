const express = require('express');
const bcrypt  = require('bcryptjs');
const pool    = require('../db/pool');
const { signSession, construirPermisos } = require('../lib/session');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { rol, clave } = req.body || {};

  if (!rol || !clave) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE rol = $1 AND activo = true',
      [rol]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Rol no disponible' });
    }

    // Comparar la clave contra todos los usuarios activos del rol
    let usuario = null;
    for (const row of rows) {
      if (await bcrypt.compare(clave, row.clave_hash)) { usuario = row; break; }
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Clave incorrecta' });
    }

    const permisos = construirPermisos(usuario.rol, usuario.permisos_extra);

    const token = signSession({
      id:            usuario.id,
      nombre:        usuario.nombre,
      rol:           usuario.rol,
      campus:        usuario.campus        || 'ags',
      acceso_global: usuario.acceso_global || false,
    });

    return res.json({
      token,
      usuario: {
        id:            usuario.id,
        nombre:        usuario.nombre,
        rol:           usuario.rol,
        campus:        usuario.campus        || 'ags',
        acceso_global: usuario.acceso_global || false,
      },
      permisos,
    });
  } catch (err) {
    console.error('[auth] error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
