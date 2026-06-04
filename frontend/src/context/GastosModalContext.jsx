import { createContext, useContext, useState } from 'react';

const GastosModalContext = createContext(null);

export function GastosModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <GastosModalContext.Provider value={{
      open,
      openModal:      () => setOpen(true),
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
