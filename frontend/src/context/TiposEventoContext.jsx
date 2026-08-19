import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { tiposEventoApi } from '../services/api';
import {
  TIPO_COLOR      as STATIC_COLOR,
  TIPO_COLOR_DARK as STATIC_COLOR_DARK,
  TIPO_BG         as STATIC_BG,
  TIPO_CELL_BG    as STATIC_CELL_BG,
  derivarColoresTipo,
} from '../utils/tipoEventoColors';

const Ctx = createContext(null);

export function TiposEventoProvider({ children }) {
  const [tipos, setTipos] = useState([]);

  const reload = useCallback(async () => {
    try {
      const res = await tiposEventoApi.getAll();
      setTipos(res.data);
    } catch {
      // keep current tipos; static fallback handles colors
    }
  }, []);

  // Auto-fetch on mount (defaults to campus from localStorage or 'ags')
  useEffect(() => { reload(); }, [reload]);

  // Mapas de color: los estáticos son la base y la API manda por nombre.
  // El gestor de tipos solo captura el color sólido, así que los tonos que
  // falten (texto, chip y fondo de celda) se derivan de ese color; si no se
  // derivaran, un tipo creado desde gestión saldría gris en el calendario.
  const maps = useMemo(() => {
    const tipoColor     = { ...STATIC_COLOR };
    const tipoColorDark = { ...STATIC_COLOR_DARK };
    const tipoBg        = { ...STATIC_BG };
    const tipoCellBg    = { ...STATIC_CELL_BG };

    tipos.forEach(t => {
      if (!t.nombre) return;
      const derivados = derivarColoresTipo(t.color) || {};
      const color     = t.color      || derivados.color;
      const colorDark = t.color_dark || derivados.color_dark;
      const bg        = t.bg         || derivados.bg;
      const cellBg    = t.cell_bg    || derivados.cell_bg;

      if (color)     tipoColor[t.nombre]     = color;
      if (colorDark) tipoColorDark[t.nombre] = colorDark;
      if (bg)        tipoBg[t.nombre]        = bg;
      if (cellBg)    tipoCellBg[t.nombre]    = cellBg;
    });

    return { tipoColor, tipoColorDark, tipoBg, tipoCellBg };
  }, [tipos]);

  const value = useMemo(() => ({ tipos, ...maps, reload }), [tipos, maps, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTiposEvento() {
  return useContext(Ctx);
}
