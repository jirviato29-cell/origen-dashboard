import { createContext, useContext, useState } from 'react';

const CalendarioModalContext = createContext(null);

export function CalendarioModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [initialDate, setInitialDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <CalendarioModalContext.Provider value={{
      open,
      initialDate,
      editingEvent,
      openModal:      (date = null) => { setEditingEvent(null); setInitialDate(date); setOpen(true); },
      openEditModal:  (ev)          => { setEditingEvent(ev);   setInitialDate(null); setOpen(true); },
      closeModal:     () => { setOpen(false); setEditingEvent(null); },
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
