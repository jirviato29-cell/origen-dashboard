import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { tiposEventoApi } from '../services/api';
import {
  TIPO_COLOR      as STATIC_COLOR,
  TIPO_COLOR_DARK as STATIC_COLOR_DARK,
  TIPO_BG         as STATIC_BG,
  TIPO_CELL_BG    as STATIC_CELL_BG,
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

  // Merged maps: static as base, API values override per nombre
  const tipoColor     = { ...STATIC_COLOR };
  const tipoColorDark = { ...STATIC_COLOR_DARK };
  const tipoBg        = { ...STATIC_BG };
  const tipoCellBg    = { ...STATIC_CELL_BG };

  tipos.forEach(t => {
    if (t.color)      tipoColor[t.nombre]     = t.color;
    if (t.color_dark) tipoColorDark[t.nombre] = t.color_dark;
    if (t.bg)         tipoBg[t.nombre]        = t.bg;
    if (t.cell_bg)    tipoCellBg[t.nombre]    = t.cell_bg;
  });

  return (
    <Ctx.Provider value={{ tipos, tipoColor, tipoColorDark, tipoBg, tipoCellBg, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTiposEvento() {
  return useContext(Ctx);
}
