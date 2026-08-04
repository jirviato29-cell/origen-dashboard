const jwt = require('jsonwebtoken');
// Lista de campus válidos DINÁMICA (tabla campus, con caché en memoria). Antes
// era una constante fija ['ags','gdl']; ahora se lee al vuelo. La lógica de
// acceso_global y del header X-Campus NO cambia: solo cambia la fuente de la
// lista contra la que se valida.
const { campusValidos } = require('../lib/campusValidos');

module.exports = function campusMiddleware(req, res, next) {
  const VALID_CAMPUS = campusValidos();
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_dev_secret');
      req.authUsuario = payload;

      if (payload.acceso_global) {
        const h = req.headers['x-campus'];
        req.campus = (h && VALID_CAMPUS.includes(h)) ? h : (payload.campus || 'ags');
      } else {
        // usuarios sin acceso global siempre operan en su propio campus
        req.campus = payload.campus || 'ags';
      }
      return next();
    } catch {
      // token inválido — continúa sin auth
    }
  }

  // Sin JWT o token inválido: respetar header X-Campus
  const h = req.headers['x-campus'];
  req.campus = (h && VALID_CAMPUS.includes(h)) ? h : 'ags';
  next();
};
