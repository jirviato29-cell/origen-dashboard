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

// ─── Manejo de 401 (token expirado/inválido) ──────────────────────────────────
// Si una petición autenticada devuelve 401, limpiamos la sesión y mandamos al
// inicio de forma limpia (sin romper el árbol React). El login y /campus usan
// `axios` directo (no esta instancia `http`), así que NO se interceptan y no
// hay riesgo de loop de redirección.
http.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        localStorage.removeItem('permisos');
        localStorage.removeItem('acceso_global');
      } catch { /* ignore */ }
      // Evita recargas en bucle si ya estamos en la pantalla de inicio/login.
      const path = window.location.pathname;
      if (path !== '/' && path !== '/login') {
        window.location.replace('/');
      }
    }
    return Promise.reject(err);
  }
);

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

// ─── Gastos de eventos ────────────────────────────────────────────────────────
const realGastosEventosApi = {
  getAll:  (params) => http.get('/gastos-eventos', { params }),
  create:  (data)   => http.post('/gastos-eventos', data),
  remove:  (id)     => http.delete(`/gastos-eventos/${id}`),
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
  getAll:         (params) => http.get('/calendario', { params }),
  getOne:         (id)     => http.get(`/calendario/${id}`),
  getMinisterios: (id)     => http.get(`/calendario/${id}/ministerios`),
  create:         (data)   => http.post('/calendario', data),
  update:         (id, d)  => http.put(`/calendario/${id}`, d),
  remove:         (id)     => http.delete(`/calendario/${id}`),
  cerrar:         (id)     => http.patch(`/calendario/${id}/cerrar`),
};

// ─── Participantes ───────────────────────────────────────────────────────────
const realParticipantesApi = {
  getAll:  (params) => http.get('/participantes', { params }),
  create:  (data)   => http.post('/participantes', data),
  update:  (id, data) => http.put(`/participantes/${id}`, data),
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

// ─── Campos personalizados ────────────────────────────────────────────────────
const realCamposPersonalizadosApi = {
  getCatalogo:  ()                      => http.get('/campos-personalizados'),
  crear:        (body)                  => http.post('/campos-personalizados', body),
  borrar:       (id)                    => http.delete(`/campos-personalizados/${id}`),
  getDeEvento:  (eventoId)              => http.get(`/campos-personalizados/evento/${eventoId}`),
  setDeEvento:  (eventoId, campo_ids)   => http.put(`/campos-personalizados/evento/${eventoId}`, { campo_ids }),
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

// ─── Voluntarios del líder (alta desde el panel del líder) ────────────────────
// El backend saca el ministerio y el campus del token, no de aquí.
export const liderVoluntariosApi = {
  getAll: ()         => http.get('/lider/voluntarios'),
  create: (data)     => http.post('/lider/voluntarios', data),
  remove: (cuentaId) => http.delete(`/lider/voluntarios/${cuentaId}`),
};

// ─── Perfil del líder (nombre de su ministerio) ───────────────────────────────
// El backend resuelve el ministerio del token, no de aquí.
export const liderPerfilApi = {
  get: () => http.get('/lider/perfil'),
};

// ─── Posiciones del líder (catálogo del ministerio) ───────────────────────────
// Usa la misma instancia http (token + campus por interceptor). El ministerio y
// el campus los resuelve el backend del token, no de aquí.
export const liderPosicionesApi = {
  getPosiciones:  ()            => http.get('/lider/posiciones'),
  crearPosicion:  (data)        => http.post('/lider/posiciones', data),
  editarPosicion: (id, data)    => http.put(`/lider/posiciones/${id}`, data),
  borrarPosicion: (id)          => http.delete(`/lider/posiciones/${id}`),
};

// ─── Programar servicio del líder (fechas, detalle, asignar por catálogo) ─────
// El backend saca el ministerio y el campus del token, no de aquí. evento_id se
// omite (null) para los domingos.
export const liderProgramarApi = {
  getFechas:  (mes)             => http.get('/lider/programar/fechas', { params: { mes } }),
  getDetalle: (fecha, eventoId) => http.get('/lider/programar/detalle', {
    params: eventoId != null ? { fecha, evento_id: eventoId } : { fecha },
  }),
  asignar:    (data)            => http.post('/lider/programar/asignar', data),
  quitar:     (asignacionId)    => http.delete(`/lider/programar/asignar/${asignacionId}`),
};

// ─── Disponibilidad del voluntario ────────────────────────────────────────────
// El backend saca el campus de la ficha del voluntario (por el token), no de aquí.
export const voluntarioDisponibilidadApi = {
  getMes:  (mes)  => http.get('/voluntario/disponibilidad', { params: { mes } }),
  marcar:  (data) => http.post('/voluntario/disponibilidad', data),
};

// ─── Mis puestos del voluntario (solo lectura) ────────────────────────────────
// Asignaciones del voluntario del token; el badge usa /nuevos y se limpia con
// /marcar-vistos. Todo lo resuelve el backend por el voluntario_id del token.
export const voluntarioPuestosApi = {
  getAll:        () => http.get('/voluntario/puestos'),
  getNuevos:     () => http.get('/voluntario/puestos/nuevos'),
  marcarVistos:  () => http.post('/voluntario/puestos/marcar-vistos'),
  confirmar:     (asignacionId, estado) => http.post(`/voluntario/puestos/${asignacionId}/confirmar`, { estado }),
};

// ─── Notificaciones push (cualquier rol autenticado) ─────────────────────────
// El backend liga la suscripción al usuario del token. `suscribir` recibe el
// objeto PushSubscription serializado ({ endpoint, keys }).
export const pushApi = {
  estado:      ()          => http.get('/push/estado'),
  suscribir:   (sub)       => http.post('/push/suscribir', sub),
  desuscribir: (endpoint)  => http.delete('/push/suscribir', { data: { endpoint } }),
  prueba:      ()          => http.post('/push/prueba'),
};

// ─── Mi perfil (cualquier rol autenticado) ────────────────────────────────────
// Datos de solo lectura para la pestaña Configuración: nombre de acceso, campus y
// ministerio. El backend los resuelve por el usuario del token, no de aquí.
export const miPerfilApi = {
  get: () => http.get('/mi-perfil'),
};

// ─── Avisos push masivos (solo stewardship) ───────────────────────────────────
// El backend verifica el rol del token y resuelve los destinatarios; aquí solo
// mandamos los filtros del formulario. `destinatarios` es el conteo previo para
// el modal de confirmación.
export const avisosApi = {
  historial:     ()        => http.get('/avisos'),
  destinatarios: (params)  => http.get('/avisos/destinatarios', { params }),
  enviar:        (body)    => http.post('/avisos', body),
  lectores:      (id)      => http.get(`/avisos/${id}/lectores`),
};

// ─── Mis avisos (voluntario / líder) ──────────────────────────────────────────
// Los avisos que le corresponden al usuario del token. El backend decide la
// pertenencia con los mismos filtros del envío; el id nunca decide permisos.
export const misAvisosApi = {
  getAll:      ()   => http.get('/mis-avisos'),
  getUno:      (id) => http.get(`/mis-avisos/${id}`),
  marcarVisto: (id) => http.post(`/mis-avisos/${id}/visto`),
};

// ─── Usuarios ─────────────────────────────────────────────────────────────────
const realUsuariosApi = {
  getAll:       ()               => http.get('/usuarios'),
  create:       (data)           => http.post('/usuarios', data),
  toggle:       (id)             => http.patch(`/usuarios/${id}/toggle`),
  cambiarNombre:(id, nombre)     => http.patch(`/usuarios/${id}/nombre`, { nombre }),
  cambiarClave: (id, clave)      => http.patch(`/usuarios/${id}/clave`, { clave }),
  cambiarMinisterio: (id, ministerio_id) => http.patch(`/usuarios/${id}/ministerio`, { ministerio_id }),
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

// ─── Ministerios ──────────────────────────────────────────────────────────────
export const ministeriosApi = {
  getAll:     ()         => http.get('/ministerios'),
  crear:      (body)     => http.post('/ministerios', body),
  actualizar: (id, body) => http.put(`/ministerios/${id}`, body),
  borrar:     (id)       => http.delete(`/ministerios/${id}`),
};

// ─── Equipos (vista global de stewardship: ministerios + líder + voluntarios) ──
// Solo lectura. El backend filtra por el campus del contexto (requireAdmin).
export const equiposApi = {
  getAll: () => http.get('/equipos'),
};

// ─── Exports ──────────────────────────────────────────────────────────────────
export const ofrendasEspecialesApi = realOfrendasEspecialesApi;
export const ingresosApi   = USE_MOCK ? mock.ingresosApi   : realIngresosApi;
export const ofrendasApi   = USE_MOCK ? mock.ingresosApi   : realOfrendasApi;
export const gastosApi     = USE_MOCK ? mock.gastosApi     : realGastosApi;
export const gastosEventosApi = realGastosEventosApi;
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
export const camposPersonalizadosApi  = realCamposPersonalizadosApi;
