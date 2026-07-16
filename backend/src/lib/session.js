// Fuente unica para firmar sesiones y construir el objeto de permisos.
// La usan el login de staff (routes/auth.js) y el del voluntario
// (routes/authVoluntario.js) para que ambos emitan tokens identicos.

const jwt = require('jsonwebtoken');
const PERMISOS = require('../permissions');

// Mismo secreto y misma expiracion que ya usaba auth.js.
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret';
const TOKEN_TTL  = '7d';

function signSession(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Permisos base del rol + overrides por usuario (usuarios.permisos_extra).
// Los permisos viajan fuera del token: son para pintar la UI, no para autorizar.
function construirPermisos(rol, permisosExtra) {
  const base = PERMISOS[rol] || { total: false, secciones: {} };
  const permisos = { ...base, secciones: { ...base.secciones } };

  if (permisosExtra?.secciones) {
    for (const [sec, overrides] of Object.entries(permisosExtra.secciones)) {
      permisos.secciones[sec] = { ...(permisos.secciones[sec] || {}), ...overrides };
    }
  }
  return permisos;
}

module.exports = { JWT_SECRET, TOKEN_TTL, signSession, construirPermisos };
