import { createContext, useContext, useState } from 'react';

const CalendarioModalContext = createContext(null);

export function CalendarioModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [initialDate, setInitialDate] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <CalendarioModalContext.Provider value={{
      open,
      initialDate,
      openModal:      (date = null) => { setInitialDate(date); setOpen(true); },
      closeModal:     () => setOpen(false),
      refreshKey,
      triggerRefresh: () => setRefreshKey(k => k + 1),
    }}>
      {children}
    </CalendarioModalContext.Provider>
  );
}

export function useCalendarioModal() {
  return useContext(CalendarioModalContext);
}
