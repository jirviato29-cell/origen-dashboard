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
  VOLUNTARIO:       'voluntario',
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function loadStorage() {
  try {
    const minRaw = localStorage.getItem('ministerio_id');
    return {
      token:        localStorage.getItem('token')    || null,
      role:         localStorage.getItem('role')     || null,
      userName:     localStorage.getItem('userName') || '',
      permisos:     JSON.parse(localStorage.getItem('permisos') || 'null'),
      accesoGlobal: localStorage.getItem('acceso_global') === 'true',
      ministerioId: minRaw != null && minRaw !== '' ? Number(minRaw) : null,
      // Ausente (sesión vieja) → se asume activo: estar logueado implica activo.
      activo:       localStorage.getItem('activo') !== 'false',
    };
  } catch {
    return { token: null, role: null, userName: '', permisos: null, accesoGlobal: false, ministerioId: null, activo: true };
  }
}

export function AuthProvider({ children }) {
  const init = loadStorage();
  const [token,        setToken]        = useState(init.token);
  const [role,         setRole]         = useState(init.role);
  const [userName,     setUserName]     = useState(init.userName);
  const [permisos,     setPermisos]     = useState(init.permisos);
  const [accesoGlobal, setAccesoGlobal] = useState(init.accesoGlobal);
  const [ministerioId, setMinisterioId] = useState(init.ministerioId);
  const [activo,       setActivo]       = useState(init.activo);

  // Persiste ministerio_id / activo del usuario logueado (para esLiderMinisterio).
  const guardarLiderInfo = (usuario) => {
    const min = usuario?.ministerio_id ?? null;
    const act = usuario?.activo !== false;
    setMinisterioId(min);
    setActivo(act);
    if (min != null) localStorage.setItem('ministerio_id', String(min));
    else             localStorage.removeItem('ministerio_id');
    localStorage.setItem('activo', String(act));
  };

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
      guardarLiderInfo(usuario);

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

  // Login del voluntario: apodo + clave (los últimos 4 de su WhatsApp).
  // Flujo aparte del login por rol del staff, pero guarda la sesión igual.
  // Mismo contrato: nunca lanza, siempre { ok } o { ok: false, error }.
  const loginVoluntario = async (apodo, clave) => {
    try {
      const { data } = await axios.post(`${API_URL}/login-voluntario`, { apodo, clave });

      const t       = data?.token;
      const usuario = data?.usuario;
      const p       = data?.permisos ?? null;

      if (!t || !usuario) {
        return { ok: false, error: data?.error || 'Nombre de acceso o clave incorrectos' };
      }

      const nombre     = usuario.nombre ?? '';
      const rol        = usuario.rol ?? 'voluntario';
      const accesoGlob = usuario.acceso_global || false;

      setToken(t);
      setRole(rol);
      setUserName(nombre);
      setPermisos(p);
      setAccesoGlobal(accesoGlob);
      guardarLiderInfo(usuario);

      localStorage.setItem('token',         t);
      localStorage.setItem('role',          rol);
      localStorage.setItem('userName',      nombre);
      localStorage.setItem('permisos',      JSON.stringify(p));
      localStorage.setItem('acceso_global', String(accesoGlob));

      if (!accesoGlob) {
        localStorage.setItem('campus_activo', usuario.campus || 'ags');
      }

      return { ok: true, rol };
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error
        || (status === 401 ? 'Nombre de acceso o clave incorrectos' : 'Error al iniciar sesión');
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserName('');
    setPermisos(null);
    setAccesoGlobal(false);
    setMinisterioId(null);
    setActivo(true);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('permisos');
    localStorage.removeItem('acceso_global');
    localStorage.removeItem('campus_activo');
    localStorage.removeItem('ministerio_id');
    localStorage.removeItem('activo');
  };

  return (
    <AuthContext.Provider value={{ role, userName, token, permisos, accesoGlobal, ministerioId, activo, login, loginVoluntario, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
