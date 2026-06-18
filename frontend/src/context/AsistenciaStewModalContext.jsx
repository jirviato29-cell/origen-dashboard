import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function AsistenciaStewModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <Ctx.Provider value={{
      open,
      record,
      openModal:      (rec = null) => { setRecord(rec); setOpen(true); },
      closeModal:     () => { setOpen(false); setRecord(null); },
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
