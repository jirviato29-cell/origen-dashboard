// Mapa único de permisos por rol.
// total: true  → acceso completo a todo.
// secciones    → control granular por sección { ver, registrar, modificar }.
const PERMISOS = {
  anfitriones: {
    total: false,
    secciones: {
      asistencia: { ver: true, registrar: true,  modificar: true  },
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

module.exports = PERMISOS;
