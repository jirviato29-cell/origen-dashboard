// Tema central por campus. Única fuente de verdad para los colores de cada
// campus: antes estaban repetidos como ternarios inline en ~12 pantallas.
//
// Valores de ags/gdl idénticos a los que ya existían (ver avisosTema.js). mid
// (Campus Mérida) se agrega aquí.

export const CAMPUS_TEMA = {
  ags: { primary: '#112540', accent: '#FF6B2B', accentInk: '#FFFFFF',
         sidebarBg: '#112540', dot: '#FF6B2B', label: 'Aguascalientes' },
  gdl: { primary: '#0A0A0A', accent: '#2DD4BF', accentInk: '#0A0A0A',
         sidebarBg: '#0A0A0A', dot: '#2DD4BF', label: 'Matriz · Guadalajara' },
  mid: { primary: '#1A1512', accent: '#C29E7C', accentInk: '#1A1512',
         sidebarBg: '#1A1512', dot: '#C29E7C', label: 'Mérida' },
};

export function temaCampus(campus) {
  return CAMPUS_TEMA[campus] || CAMPUS_TEMA.ags;
}
