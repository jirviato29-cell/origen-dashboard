import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ministeriosApi } from '../services/api';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

export function MinisteriosProvider({ children }) {
  const { token } = useAuth();
  const [ministerios, setMinisterios] = useState([]);

  const reload = useCallback(async () => {
    try {
      const res = await ministeriosApi.getAll();
      setMinisterios(res.data);
    } catch {
      // keep current; hardcoded fallback handles empty state
    }
  }, []);

  // Re-fetch al iniciar sesión y en cada cambio de token. Como cambiar de campus
  // (ags↔gdl) siempre pasa por CampusPage→login (token nuevo), esto garantiza que
  // la lista de ministerios corresponda SIEMPRE al campus activo, sin quedar
  // congelada con la del arranque. Sin token (logout) no fetchea.
  useEffect(() => {
    if (token) reload();
  }, [reload, token]);

  return (
    <Ctx.Provider value={{ ministerios, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMinisterios() {
  return useContext(Ctx);
}
