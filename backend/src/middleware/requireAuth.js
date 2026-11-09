// Exige una sesión válida. Debe ir después de campusMiddleware, que verifica el
// JWT y deja el payload en req.authUsuario solo si el token es válido.
module.exports = function requireAuth(req, res, next) {
  if (!req.authUsuario) return res.status(401).json({ error: 'No autorizado' });
  next();
};
