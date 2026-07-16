// Mapa único de permisos por rol.
// total: true  → acceso completo a todo.
// secciones    → control granular por sección { ver, registrar, modificar }.
const PERMISOS = {
  anfitriones: {
    total: false,
    secciones: {
      asistencia: { ver: true, registrar: true,  modificar: true  },
      calendario: { ver: true, registrar: false, modificar: false },
      visitantes: { ver: true, registrar: true,  modificar: true  },
    },
  },
  punto_encuentro: {
    total: false,
    secciones: {
      punto_encuentro: { ver: true,  registrar: true,  modificar: true  },
      gastos_eventos:  { ver: true,  registrar: true,  modificar: true  },
      calendario:      { ver: true,  registrar: false, modificar: false },
      asistencia:      { ver: true,  registrar: false, modificar: false },
      visitantes:      { ver: true,  registrar: true,  modificar: true  },
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
      gastos_eventos:  { ver: true, registrar: false, modificar: false },
      calendario:      { ver: true, registrar: false, modificar: false },
      visitantes:      { ver: true, registrar: false, modificar: false },
    },
  },
  administracion: { total: true, secciones: {} },
  // Sin secciones abiertas: solo alcanza su propio panel, que no expone datos
  // sensibles. Abrir una sección aquí le da acceso en toda la app.
  lider_ministerio: { total: false, secciones: {} },
};

module.exports = PERMISOS;
