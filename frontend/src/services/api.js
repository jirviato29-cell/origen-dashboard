import axios from 'axios';
import * as mock from './mockApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

http.interceptors.request.use(config => {
  const token  = localStorage.getItem('token');
  const campus = localStorage.getItem('campus_activo');
  if (token)  config.headers.Authorization = `Bearer ${token}`;
  if (campus) config.headers['X-Campus']   = campus;
  return config;
});

// ─── Ingresos (→ tabla ofrendas, con alias monto/concepto para compat) ────────
const realIngresosApi = {
  getAll:       (params) => http.get('/ingresos', { params }),
  getOne:       (id)     => http.get(`/ingresos/${id}`),
  create:       (data)   => http.post('/ingresos', data),
  update:       (id, d)  => http.put(`/ingresos/${id}`, d),
  remove:       (id)     => http.delete(`/ingresos/${id}`),
  resumenAnual: (year)   => http.get('/ingresos/resumen-anual', { params: { year } }),
};

// ─── Ofrendas (acceso directo a todos los campos) ─────────────────────────────
const realOfrendasApi = {
  getAll:       (params) => http.get('/ofrendas', { params }),
  getOne:       (id)     => http.get(`/ofrendas/${id}`),
  create:       (data)   => http.post('/ofrendas', data),
  update:       (id, d)  => http.put(`/ofrendas/${id}`, d),
  remove:       (id)     => http.delete(`/ofrendas/${id}`),
  resumenAnual: (year)   => http.get('/ofrendas/resumen-anual', { params: { year } }),
};

// ─── Gastos ───────────────────────────────────────────────────────────────────
const realGastosApi = {
  getAll:       (params) => http.get('/gastos', { params }),
  getOne:       (id)     => http.get(`/gastos/${id}`),
  create:       (data)   => http.post('/gastos', data),
  update:       (id, d)  => http.put(`/gastos/${id}`, d),
  remove:       (id)     => http.delete(`/gastos/${id}`),
  pagar:        (id, metodo_pago) => http.patch(`/gastos/${id}/pagar`, { metodo_pago }),
  resumenAnual: (year)   => http.get('/gastos/resumen-anual', { params: { year } }),
  porCategoria: (params) => http.get('/gastos/por-categoria', { params }),
};

// ─── Categorías ───────────────────────────────────────────────────────────────
const realCategoriasApi = {
  getAll: (params) => http.get('/categorias', { params }),
  create: (data)   => http.post('/categorias', data),
  remove: (id)     => http.delete(`/categorias/${id}`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const realDashboardApi = {
  resumen: (params) => http.get('/dashboard/resumen', { params }),
  mensual: (year)   => http.get('/dashboard/mensual', { params: { year } }),
};

// ─── Asistencia ───────────────────────────────────────────────────────────────
const realAsistenciaApi = {
  getAll:        (params) => http.get('/asistencia', { params }),
  getOne:        (id)     => http.get(`/asistencia/${id}`),
  create:        (data)   => http.post('/asistencia', data),
  update:        (id, d)  => http.put(`/asistencia/${id}`, d),
  remove:        (id)     => http.delete(`/asistencia/${id}`),
  upsertByFecha: (data)   => http.post('/asistencia/upsert', data),
  resumenAnual:  (year)   => http.get('/asistencia/resumen-anual', { params: { year } }),
};

// ─── Eventos ──────────────────────────────────────────────────────────────────
const realEventosApi = {
  getAll:   (params) => http.get('/eventos', { params }),
  proximos: ()       => http.get('/eventos/proximos'),
  getOne:   (id)     => http.get(`/eventos/${id}`),
  create:   (data)   => http.post('/eventos', data),
  update:   (id, d)  => http.put(`/eventos/${id}`, d),
  remove:   (id)     => http.delete(`/eventos/${id}`),
};

// ─── Calendario ───────────────────────────────────────────────────────────────
const realCalendarioApi = {
  getAll:  (params) => http.get('/calendario', { params }),
  getOne:  (id)     => http.get(`/calendario/${id}`),
  create:  (data)   => http.post('/calendario', data),
  update:  (id, d)  => http.put(`/calendario/${id}`, d),
  remove:  (id)     => http.delete(`/calendario/${id}`),
};

// ─── Participantes ───────────────────────────────────────────────────────────
const realParticipantesApi = {
  getAll:  (params) => http.get('/participantes', { params }),
  create:  (data)   => http.post('/participantes', data),
  remove:  (id)     => http.delete(`/participantes/${id}`),
};

// ─── Servicios dominicales ────────────────────────────────────────────────────
const realServiciosDominicalesApi = {
  getAll: (params) => http.get('/servicios-dominicales', { params }),
  upsert: (data)   => http.post('/servicios-dominicales', data),
  remove: (id)     => http.delete(`/servicios-dominicales/${id}`),
};

// ─── Comprobantes ─────────────────────────────────────────────────────────────
const realComprobanteApi = {
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post('/comprobantes', fd);
  },
};

// ─── Abonos ───────────────────────────────────────────────────────────────────
const realAbonosApi = {
  getAll:  (params) => http.get('/abonos', { params }),
  create:  (data)   => http.post('/abonos', data),
  remove:  (id)     => http.delete(`/abonos/${id}`),
};

// ─── Cortes ───────────────────────────────────────────────────────────────────
const realCortesApi = {
  getByEvento: (evento_id) => http.get('/cortes', { params: { evento_id } }),
  upsert:      (records)   => http.post('/cortes/upsert', records),
};

// ─── Visitantes ───────────────────────────────────────────────────────────────
const realVisitantesApi = {
  getAll:  ()         => http.get('/visitantes'),
  create:  (data)     => http.post('/visitantes', data),
  update:  (id, data) => http.put(`/visitantes/${id}`, data),
  patch:   (id, data) => http.patch(`/visitantes/${id}`, data),
};

// ─── Ofrendas Especiales ──────────────────────────────────────────────────────
const realOfrendasEspecialesApi = {
  getAll:         ()          => http.get('/ofrendas-especiales'),
  create:         (data)      => http.post('/ofrendas-especiales', data),
  getRegistros:   (id)        => http.get(`/ofrendas-especiales/${id}/registros`),
  createRegistro: (id, data)  => http.post(`/ofrendas-especiales/${id}/registros`, data),
  updateRegistro: (rid, data) => http.patch(`/ofrendas-especiales/registros/${rid}`, data),
  deleteRegistro: (rid)       => http.delete(`/ofrendas-especiales/registros/${rid}`),
};

// ─── Voluntarios ──────────────────────────────────────────────────────────────
const realVoluntariosApi = {
  getAll:  ()         => http.get('/voluntarios'),
  create:  (data)     => http.post('/voluntarios', data),
  update:  (id, data) => http.put(`/voluntarios/${id}`, data),
  remove:  (id)       => http.delete(`/voluntarios/${id}`),
};

// ─── Usuarios ─────────────────────────────────────────────────────────────────
const realUsuariosApi = {
  getAll:       ()               => http.get('/usuarios'),
  create:       (data)           => http.post('/usuarios', data),
  toggle:       (id)             => http.patch(`/usuarios/${id}/toggle`),
  cambiarNombre:(id, nombre)     => http.patch(`/usuarios/${id}/nombre`, { nombre }),
  cambiarClave: (id, clave)      => http.patch(`/usuarios/${id}/clave`, { clave }),
  remove:       (id)             => http.delete(`/usuarios/${id}`),
};

// ─── Campus ───────────────────────────────────────────────────────────────────
export const campusApi = {
  getAll: () => http.get('/campus'),
};

// ─── Tipos de Evento ──────────────────────────────────────────────────────────
export const tiposEventoApi = {
  getAll:  ()     => http.get('/tipos-evento'),
  create:  (data) => http.post('/tipos-evento', data),
  remove:  (id)   => http.delete(`/tipos-evento/${id}`),
};

// ─── Exports ──────────────────────────────────────────────────────────────────
export const ofrendasEspecialesApi = realOfrendasEspecialesApi;
export const ingresosApi   = USE_MOCK ? mock.ingresosApi   : realIngresosApi;
export const ofrendasApi   = USE_MOCK ? mock.ingresosApi   : realOfrendasApi;
export const gastosApi     = USE_MOCK ? mock.gastosApi     : realGastosApi;
export const categoriasApi = USE_MOCK ? mock.categoriasApi : realCategoriasApi;
export const dashboardApi  = USE_MOCK ? mock.dashboardApi  : realDashboardApi;
export const asistenciaApi = USE_MOCK ? mock.asistenciaApi : realAsistenciaApi;
export const eventosApi      = USE_MOCK ? null               : realEventosApi;
export const participantesApi         = realParticipantesApi;
export const calendarioApi            = realCalendarioApi;
export const serviciosDominicalesApi  = realServiciosDominicalesApi;
export const comprobanteApi           = realComprobanteApi;
export const abonosApi                = realAbonosApi;
export const cortesApi                = realCortesApi;
export const usuariosApi              = realUsuariosApi;
export const voluntariosApi           = realVoluntariosApi;
export const visitantesApi            = realVisitantesApi;
