import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const ROLES = {
  PASTOR:          'pastor',
  ADMINISTRACION:  'administracion',
  ANFITRIONES:     'anfitriones',
  PUNTO_ENCUENTRO: 'punto_encuentro',
  STEWARDSHIP:     'stewardship',
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function loadStorage() {
  try {
    return {
      token:        localStorage.getItem('token')    || null,
      role:         localStorage.getItem('role')     || null,
      userName:     localStorage.getItem('userName') || '',
      permisos:     JSON.parse(localStorage.getItem('permisos') || 'null'),
      accesoGlobal: localStorage.getItem('acceso_global') === 'true',
    };
  } catch {
    return { token: null, role: null, userName: '', permisos: null, accesoGlobal: false };
  }
}

export function AuthProvider({ children }) {
  const init = loadStorage();
  const [token,        setToken]        = useState(init.token);
  const [role,         setRole]         = useState(init.role);
  const [userName,     setUserName]     = useState(init.userName);
  const [permisos,     setPermisos]     = useState(init.permisos);
  const [accesoGlobal, setAccesoGlobal] = useState(init.accesoGlobal);

  // Retorna { ok: true } o { ok: false, error: string }
  const login = async (selectedRole, clave) => {
    try {
      const { data } = await axios.post(`${API_URL}/login`, {
        rol: selectedRole,
        clave,
      });
      const { token: t, usuario, permisos: p } = data;

      setToken(t);
      setRole(usuario.rol);
      setUserName(usuario.nombre);
      setPermisos(p);
      setAccesoGlobal(usuario.acceso_global || false);

      localStorage.setItem('token',         t);
      localStorage.setItem('role',          usuario.rol);
      localStorage.setItem('userName',      usuario.nombre);
      localStorage.setItem('permisos',      JSON.stringify(p));
      localStorage.setItem('acceso_global', String(usuario.acceso_global || false));

      // Usuarios sin acceso global siempre operan en su propio campus
      if (!usuario.acceso_global) {
        localStorage.setItem('campus_activo', usuario.campus || 'ags');
      }

      return { ok: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al iniciar sesión';
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserName('');
    setPermisos(null);
    setAccesoGlobal(false);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('permisos');
    localStorage.removeItem('acceso_global');
    localStorage.removeItem('campus_activo');
  };

  return (
    <AuthContext.Provider value={{ role, userName, token, permisos, accesoGlobal, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
