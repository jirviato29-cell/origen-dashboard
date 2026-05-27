import axios from 'axios';
import * as mock from './mockApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ─── API real (Express + PostgreSQL) ──────────────────────────────────────────

// ─── API real (Express + PostgreSQL) ──────────────────────────────────────────

const http = axios.create({ baseURL: '/api' });

const realIngresosApi = {
  getAll:      (params) => http.get('/ingresos', { params }),
  getOne:      (id)     => http.get(`/ingresos/${id}`),
  create:      (data)   => http.post('/ingresos', data),
  update:      (id, data) => http.put(`/ingresos/${id}`, data),
  remove:      (id)     => http.delete(`/ingresos/${id}`),
  resumenAnual:(year)   => http.get('/ingresos/resumen-anual', { params: { year } }),
};

const realGastosApi = {
  getAll:      (params) => http.get('/gastos', { params }),
  getOne:      (id)     => http.get(`/gastos/${id}`),
  create:      (data)   => http.post('/gastos', data),
  update:      (id, data) => http.put(`/gastos/${id}`, data),
  remove:      (id)     => http.delete(`/gastos/${id}`),
  resumenAnual:(year)   => http.get('/gastos/resumen-anual', { params: { year } }),
  porCategoria:(params) => http.get('/gastos/por-categoria', { params }),
};

const realCategoriasApi = {
  getAll: (params) => http.get('/categorias', { params }),
  create: (data)   => http.post('/categorias', data),
  remove: (id)     => http.delete(`/categorias/${id}`),
};

const realDashboardApi = {
  resumen: (params) => http.get('/dashboard/resumen', { params }),
  mensual: (year)   => http.get('/dashboard/mensual', { params: { year } }),
};

const realAsistenciaApi = {
  getAll:        (params) => http.get('/asistencia', { params }),
  create:        (data)   => http.post('/asistencia', data),
  upsertByFecha: (data)   => http.post('/asistencia/upsert', data),
};

// ─── Exports: mock en dev, real en producción ─────────────────────────────────

export const ingresosApi   = USE_MOCK ? mock.ingresosApi   : realIngresosApi;
export const gastosApi     = USE_MOCK ? mock.gastosApi     : realGastosApi;
export const categoriasApi = USE_MOCK ? mock.categoriasApi : realCategoriasApi;
export const dashboardApi  = USE_MOCK ? mock.dashboardApi  : realDashboardApi;
export const asistenciaApi = USE_MOCK ? mock.asistenciaApi : realAsistenciaApi;
