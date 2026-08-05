// Tema central por campus. Única fuente de verdad para los colores de cada
// campus: antes estaban repetidos como ternarios inline en ~12 pantallas.
//
// Valores de ags/gdl idénticos a los que ya existían (ver avisosTema.js).
//
// mid (Campus Mérida) usa la identidad TURQUESA CARIBE + CORAL: fondo turquesa
// profundo #062A31 + acento coral #FF9A5E. (Antes fue un café/arena provisional;
// la identidad definitiva es turquesa, ver SPEC-Selector-Rol-Merida.)

export const CAMPUS_TEMA = {
  ags: { primary: '#112540', accent: '#FF6B2B', accentInk: '#FFFFFF',
         sidebarBg: '#112540', dot: '#FF6B2B', label: 'Aguascalientes' },
  gdl: { primary: '#0A0A0A', accent: '#2DD4BF', accentInk: '#0A0A0A',
         sidebarBg: '#0A0A0A', dot: '#2DD4BF', label: 'Matriz · Guadalajara' },
  mid: { primary: '#062A31', accent: '#FF9A5E', accentInk: '#062A31',
         sidebarBg: '#062A31', dot: '#FF9A5E', label: 'Mérida' },
};

export function temaCampus(campus) {
  return CAMPUS_TEMA[campus] || CAMPUS_TEMA.ags;
}
