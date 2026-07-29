// Regla ÚNICA y reutilizable (espejo de la del backend) para decidir si un
// usuario es "líder de ministerio":
//
//   es líder  ⇔  ministerio_id != null
//                Y rol !== 'voluntario'
//                Y activo === true
//
// CRÍTICO: el rol 'voluntario' se excluye SIEMPRE, aunque tenga ministerio_id.
// El objeto `usuario` debe traer { ministerio_id, rol, activo }.
//
// En el frontend esto solo pinta menú/secciones; la frontera de seguridad real
// es el backend, que aplica esta misma regla en el guard del panel de líder.
export function esLiderMinisterio(usuario) {
  return !!usuario
    && usuario.ministerio_id != null
    && usuario.rol !== 'voluntario'
    && usuario.activo === true;
}
