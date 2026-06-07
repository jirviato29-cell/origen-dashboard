// Mapa único de permisos por rol — edita aquí para cambiar accesos.
// total: true  → acceso completo a todo.
// secciones    → { ver, registrar, modificar } por sección.
export const PERMISOS = {
  anfitriones: {
    total: false,
    secciones: {
      calendario: { ver: true, registrar: false, modificar: false },
    },
  },
  punto_encuentro: {
    total: false,
    secciones: {
      punto_encuentro: { ver: true,  registrar: true,  modificar: true  },
      calendario:      { ver: true,  registrar: false, modificar: false },
      asistencia:      { ver: true,  registrar: false, modificar: false },
    },
  },
  stewardship:    { total: true, secciones: {} },
  pastor:         { total: true, secciones: {} },
  administracion: { total: true, secciones: {} },
};

export function puedeVer(permisos, seccion) {
  if (!permisos) return false;
  if (permisos.total) return true;
  return permisos.secciones?.[seccion]?.ver === true;
}

export function puedeRegistrar(permisos, seccion) {
  if (!permisos) return false;
  if (permisos.total) return true;
  return permisos.secciones?.[seccion]?.registrar === true;
}

export function puedeModificar(permisos, seccion) {
  if (!permisos) return false;
  if (permisos.total) return true;
  return permisos.secciones?.[seccion]?.modificar === true;
}
