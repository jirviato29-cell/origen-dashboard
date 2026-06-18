import { createContext, useContext, useState } from 'react';

const OfrendasModalContext = createContext(null);

export function OfrendasModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <OfrendasModalContext.Provider value={{
      open,
      record,
      openModal:      (rec = null) => { setRecord(rec); setOpen(true); },
      closeModal:     () => { setOpen(false); setRecord(null); },
      refreshKey,
      triggerRefresh: () => setRefreshKey(k => k + 1),
    }}>
      {children}
    </OfrendasModalContext.Provider>
  );
}

export function useOfrendasModal() {
  return useContext(OfrendasModalContext);
}
