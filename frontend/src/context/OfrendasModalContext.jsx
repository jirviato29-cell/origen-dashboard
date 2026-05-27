import { createContext, useContext, useState } from 'react';

const OfrendasModalContext = createContext(null);

export function OfrendasModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <OfrendasModalContext.Provider value={{ open, openModal: () => setOpen(true), closeModal: () => setOpen(false) }}>
      {children}
    </OfrendasModalContext.Provider>
  );
}

export function useOfrendasModal() {
  return useContext(OfrendasModalContext);
}
