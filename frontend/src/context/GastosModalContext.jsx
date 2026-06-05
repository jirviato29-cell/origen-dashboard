import { createContext, useContext, useState } from 'react';

const GastosModalContext = createContext(null);

export function GastosModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [pagado, setPagado] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <GastosModalContext.Provider value={{
      open,
      pagado,
      openModal:      (flagPagado = true) => { setPagado(flagPagado); setOpen(true); },
      closeModal:     () => setOpen(false),
      refreshKey,
      triggerRefresh: () => setRefreshKey(k => k + 1),
    }}>
      {children}
    </GastosModalContext.Provider>
  );
}

export function useGastosModal() {
  return useContext(GastosModalContext);
}
