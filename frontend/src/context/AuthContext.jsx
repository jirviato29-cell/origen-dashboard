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
  const [role, setRole]         = useState(() => localStorage.getItem('role') || null);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');

  const login = (selectedRole, name = '') => {
    setRole(selectedRole);
    setUserName(name);
    localStorage.setItem('role', selectedRole);
    localStorage.setItem('userName', name);
  };

  const logout = () => {
    setRole(null);
    setUserName('');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
  };

  return (
    <AuthContext.Provider value={{ role, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
