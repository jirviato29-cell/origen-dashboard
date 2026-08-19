// Color sólido — para puntos, texto de etiquetas y leyenda
export const TIPO_COLOR = {
  'Servicio dominical': '#B5860D',
  'Especial':           '#F59E0B',
  'Reunión de hombres': '#1E3A8A',
  'Reunión de mujeres': '#7C3AED',
  'Alpha':              '#DC2626',
  'Alpha Youth':        '#16A34A',
  'Kids':               '#84CC16',
  'Santuario':          '#0EA5E9',
};

// Tono más oscuro/saturado de la misma familia — para texto de pills en días futuros
export const TIPO_COLOR_DARK = {
  'Servicio dominical': '#7A5800',
  'Especial':           '#92400E',
  'Reunión de hombres': '#172D6B',
  'Reunión de mujeres': '#4C1D95',
  'Alpha':              '#991B1B',
  'Alpha Youth':        '#14532D',
  'Kids':               '#3F6212',
  'Santuario':          '#0369A1',
};

// Fondo semitransparente — para chips/etiquetas
export const TIPO_BG = {
  'Servicio dominical': 'rgba(181,134,13,0.18)',
  'Especial':           'rgba(245,158,11,0.18)',
  'Reunión de hombres': 'rgba(30,58,138,0.14)',
  'Reunión de mujeres': 'rgba(124,58,237,0.14)',
  'Alpha':              'rgba(220,38,38,0.14)',
  'Alpha Youth':        'rgba(22,163,74,0.15)',
  'Kids':               'rgba(132,204,22,0.15)',
  'Santuario':          'rgba(14,165,233,0.15)',
};

// Fondo suave — para el fondo completo de una tarjeta/celda
export const TIPO_CELL_BG = {
  'Servicio dominical': '#FDF6E3',
  'Especial':           'rgba(245,158,11,0.12)',
  'Reunión de hombres': 'rgba(30,58,138,0.07)',
  'Reunión de mujeres': 'rgba(124,58,237,0.07)',
  'Alpha':              'rgba(220,38,38,0.07)',
  'Alpha Youth':        'rgba(22,163,74,0.08)',
  'Kids':               'rgba(132,204,22,0.08)',
  'Santuario':          'rgba(14,165,233,0.08)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Derivación de la paleta de un tipo a partir de su color sólido.
// El gestor de tipos del modal solo captura UN color (`color`); los tonos
// restantes (texto, chip y fondo de celda) se calculan aquí para que cualquier
// tipo creado desde gestión pinte el calendario igual que los tipos base.
// ─────────────────────────────────────────────────────────────────────────────

// '#abc' | '#aabbcc' → {r,g,b} (null si no es un hex válido)
function hexARgb(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const aHex = ({ r, g, b }) =>
  '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

// Luminancia percibida (0 = negro, 1 = blanco).
const luminancia = ({ r, g, b }) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// Tono oscuro para texto: baja el color hasta que contrasta sobre fondo claro.
export function tipoColorOscuro(hex) {
  const rgb = hexARgb(hex);
  if (!rgb) return null;
  let { r, g, b } = rgb;
  for (let i = 0; i < 10 && luminancia({ r, g, b }) > 0.40; i++) {
    r *= 0.85; g *= 0.85; b *= 0.85;
  }
  return aHex({ r, g, b });
}

// Fondo semitransparente para chips/pills.
export function tipoColorFondo(hex, alfa = 0.16) {
  const rgb = hexARgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alfa})`;
}

// Fondo pastel opaco para el cuadro del día en el calendario.
export function tipoColorCelda(hex, peso = 0.12) {
  const rgb = hexARgb(hex);
  if (!rgb) return null;
  const mezcla = (v) => 255 - (255 - v) * peso;
  return aHex({ r: mezcla(rgb.r), g: mezcla(rgb.g), b: mezcla(rgb.b) });
}

// Paleta completa a partir del color registrado en gestión.
export function derivarColoresTipo(hex) {
  const rgb = hexARgb(hex);
  if (!rgb) return null;
  return {
    color:      hex,
    color_dark: tipoColorOscuro(hex),
    bg:         tipoColorFondo(hex),
    cell_bg:    tipoColorCelda(hex),
  };
}
