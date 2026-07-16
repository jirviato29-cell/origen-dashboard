import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const ROLES = {
  PASTOR:          'pastor',
  ADMINISTRACION:  'administracion',
  ANFITRIONES:     'anfitriones',
  PUNTO_ENCUENTRO: 'punto_encuentro',
  STEWARDSHIP:     'stewardship',
  LIDER_MINISTERIO: 'lider_ministerio',
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
  // NUNCA debe lanzar: un login fallido o una respuesta inesperada del
  // backend siempre regresa { ok: false } para que la app no truene.
  const login = async (selectedRole, clave) => {
    try {
      const { data } = await axios.post(`${API_URL}/login`, {
        rol: selectedRole,
        clave,
      });

      const t       = data?.token;
      const usuario = data?.usuario;
      const p       = data?.permisos ?? null;

      // Si el backend respondió 200 pero sin token/usuario válidos,
      // tratamos como credenciales incorrectas en vez de procesar undefined.
      if (!t || !usuario) {
        return { ok: false, error: data?.error || 'Usuario o clave incorrectos' };
      }

      const nombre       = usuario.nombre ?? '';
      const rol          = usuario.rol ?? selectedRole;
      const accesoGlob   = usuario.acceso_global || false;

      setToken(t);
      setRole(rol);
      setUserName(nombre);
      setPermisos(p);
      setAccesoGlobal(accesoGlob);

      localStorage.setItem('token',         t);
      localStorage.setItem('role',          rol);
      localStorage.setItem('userName',      nombre);
      localStorage.setItem('permisos',      JSON.stringify(p));
      localStorage.setItem('acceso_global', String(accesoGlob));

      // Usuarios sin acceso global siempre operan en su propio campus
      if (!accesoGlob) {
        localStorage.setItem('campus_activo', usuario.campus || 'ags');
      }

      return { ok: true };
    } catch (err) {
      // 401 → credenciales incorrectas; cualquier otro error → mensaje del backend o genérico
      const status = err.response?.status;
      const msg = err.response?.data?.error
        || (status === 401 ? 'Usuario o clave incorrectos' : 'Error al iniciar sesión');
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
