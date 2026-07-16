const express = require('express');
const bcrypt  = require('bcryptjs');
const pool    = require('../db/pool');
const { signSession, construirPermisos } = require('../lib/session');

const router = express.Router();

// Login del voluntario: apodo + clave. Es un flujo aparte del login de staff
// (POST /api/login, que va por rol + clave); ese no cambia.
//
// La clave son los ultimos 4 digitos del whatsapp del voluntario, guardados
// hasheados con bcrypt en usuarios.clave_hash. Aqui SOLO se consume ese hash.
//
// La GENERACION de la clave vive en el alta del voluntario (paso 3), todavia
// sin construir. Cuando se escriba: confirmamos que los whatsapp estan
// capturados a 10 digitos limpios, pero normalizar de todos modos por si acaso
// —quitar cualquier caracter que no sea digito y tomar los ultimos 4:
//   SQL: right(regexp_replace(whatsapp, '\D', '', 'g'), 4)
//   JS : whatsapp.replace(/\D/g, '').slice(-4)
//
// Requiere la columna usuarios.apodo (ver db/alter-usuarios-apodo.sql).
router.post('/login-voluntario', async (req, res) => {
  const apodo = typeof req.body?.apodo === 'string' ? req.body.apodo.trim() : '';
  const clave = typeof req.body?.clave === 'string' ? req.body.clave.trim() : '';

  if (!apodo || !clave) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // El apodo compara sin distinguir mayusculas ni espacios sobrantes.
    const { rows } = await pool.query(
      `SELECT * FROM usuarios
        WHERE rol = 'voluntario'
          AND activo = true
          AND lower(btrim(apodo)) = lower(btrim($1))`,
      [apodo]
    );

    // Mismo mensaje para apodo inexistente y clave mala: no revelamos
    // cuales apodos existen.
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Apodo o clave incorrectos' });
    }

    // Los apodos pueden repetirse, asi que la clave desambigua: se compara
    // contra cada coincidencia hasta encontrar match.
    let usuario = null;
    for (const row of rows) {
      if (row.clave_hash && await bcrypt.compare(clave, row.clave_hash)) {
        usuario = row;
        break;
      }
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Apodo o clave incorrectos' });
    }

    // Mismos campos que el token de staff + voluntario_id.
    const datos = {
      id:            usuario.id,
      nombre:        usuario.nombre,
      rol:           usuario.rol,
      campus:        usuario.campus        || 'ags',
      acceso_global: usuario.acceso_global || false,
      voluntario_id: usuario.voluntario_id ?? null,
    };

    return res.json({
      token:    signSession(datos),
      usuario:  datos,
      permisos: construirPermisos(usuario.rol, usuario.permisos_extra),
    });
  } catch (err) {
    console.error('[auth-voluntario] error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
