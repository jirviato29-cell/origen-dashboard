// Regla ÚNICA y reutilizable para decidir si un usuario es "líder de ministerio"
// (con acceso al panel de líder). NO depende del rol 'lider_ministerio':
//
//   es líder  ⇔  ministerio_id IS NOT NULL
//                Y rol <> 'voluntario'
//                Y activo = true
//
// CRÍTICO: el rol 'voluntario' se excluye SIEMPRE. Existen voluntarios con
// ministerio_id (p. ej. Juan Pérez, Evelyn); concederles el panel de líder sería
// una escalación de privilegios. Nunca deben pasar esta validación.
//
// El objeto `usuario` debe traer { ministerio_id, rol, activo } (el payload del
// JWT o una fila de usuarios).
function esLiderMinisterio(usuario) {
  return !!usuario
    && usuario.ministerio_id != null
    && usuario.rol !== 'voluntario'
    && usuario.activo === true;
}

module.exports = { esLiderMinisterio };
