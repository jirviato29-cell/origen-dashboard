import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function AsistenciaStewModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <Ctx.Provider value={{
      open,
      openModal:      () => setOpen(true),
      closeModal:     () => setOpen(false),
      refreshKey,
      triggerRefresh: () => setRefreshKey(k => k + 1),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAsistenciaStewModal() {
  return useContext(Ctx);
}
