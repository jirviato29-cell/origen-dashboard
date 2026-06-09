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
  pastor: {
    total: false,
    secciones: {
      dashboard:       { ver: true, registrar: false, modificar: false },
      ingresos:        { ver: true, registrar: false, modificar: false },
      gastos:          { ver: true, registrar: false, modificar: false },
      finanzas:        { ver: true, registrar: false, modificar: false },
      asistencia:      { ver: true, registrar: false, modificar: false },
      punto_encuentro: { ver: true, registrar: false, modificar: false },
      calendario:      { ver: true, registrar: false, modificar: false },
    },
  },
  administracion: { total: true, secciones: {} },
};

module.exports = PERMISOS;
