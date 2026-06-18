import { createContext, useContext, useState } from 'react';

const CalendarioModalContext = createContext(null);

export function CalendarioModalProvider({ children }) {
  const [open,                setOpen]                = useState(false);
  const [initialDate,         setInitialDate]         = useState(null);
  const [editingEvent,        setEditingEvent]        = useState(null);
  const [lockPuntoEncuentro,  setLockPuntoEncuentro]  = useState(false);
  const [refreshKey,          setRefreshKey]          = useState(0);
  return (
    <CalendarioModalContext.Provider value={{
      open,
      initialDate,
      editingEvent,
      lockPuntoEncuentro,
      openModal:      (date = null) => { setLockPuntoEncuentro(false); setEditingEvent(null); setInitialDate(date); setOpen(true); },
      openEditModal:  (ev)          => { setLockPuntoEncuentro(false); setEditingEvent(ev);   setInitialDate(null); setOpen(true); },
      openModalPE:    (date = null) => { setLockPuntoEncuentro(true);  setEditingEvent(null); setInitialDate(date); setOpen(true); },
      closeModal:     () => { setOpen(false); setEditingEvent(null); setLockPuntoEncuentro(false); },
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
