import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
  PASTOR: 'pastor',
  ADMINISTRACION: 'administracion',
  ANFITRIONES: 'anfitriones',
  PUNTO_ENCUENTRO: 'punto_encuentro',
  STEWARDSHIP: 'stewardship',
};

export function AuthProvider({ children }) {
  const [role, setRole]         = useState(null);
  const [userName, setUserName] = useState('');

  const login  = (selectedRole, name = '') => { setRole(selectedRole); setUserName(name); };
  const logout = () => { setRole(null); setUserName(''); };

  return (
    <AuthContext.Provider value={{ role, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
