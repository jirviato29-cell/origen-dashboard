const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const PERMISOS = require('../permissions');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { rol, clave } = req.body || {};

  if (!rol || !clave) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE rol = $1 AND activo = true LIMIT 1',
      [rol]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Rol no disponible' });
    }

    const usuario = rows[0];
    const match = await bcrypt.compare(clave, usuario.clave_hash);

    if (!match) {
      return res.status(401).json({ error: 'Clave incorrecta' });
    }

    const permisos = PERMISOS[rol] || { total: false, secciones: {} };

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      process.env.JWT_SECRET || 'fallback_dev_secret',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      usuario: {
        id:     usuario.id,
        nombre: usuario.nombre,
        rol:    usuario.rol,
      },
      permisos,
    });
  } catch (err) {
    console.error('[auth] error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
