import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ministeriosApi } from '../services/api';

const Ctx = createContext(null);

export function MinisteriosProvider({ children }) {
  const [ministerios, setMinisterios] = useState([]);

  const reload = useCallback(async () => {
    try {
      const res = await ministeriosApi.getAll();
      setMinisterios(res.data);
    } catch {
      // keep current; hardcoded fallback handles empty state
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <Ctx.Provider value={{ ministerios, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMinisterios() {
  return useContext(Ctx);
}
