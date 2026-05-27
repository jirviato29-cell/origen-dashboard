import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function RegistrarModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, openModal: () => setOpen(true), closeModal: () => setOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useRegistrarModal = () => useContext(Ctx);
