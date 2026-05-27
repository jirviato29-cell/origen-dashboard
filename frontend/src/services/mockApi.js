import {
  mockIngresos,
  mockGastos,
  mockCategorias,
  mockEventos,
  mockAsistencia,
} from '../data/mockData';

// Estado mutable en memoria para operaciones CRUD
let ingresos   = mockIngresos.map(r => ({ ...r }));
let gastos     = mockGastos.map(r => ({ ...r }));
let categorias = mockCategorias.map(r => ({ ...r }));
let asistencia = mockAsistencia.map(r => ({ ...r }));
let nextId     = { ingresos: 100, gastos: 100, categorias: 20, asistencia: 100 };

const delay = () => new Promise(r => setTimeout(r, 120));
const ok    = (data) => ({ data });

// ─── Helpers de filtrado ───────────────────────────────────────────────────────

function filterByPeriod(rows, { year, month } = {}) {
  return rows.filter(r => {
    const d = new Date(r.fecha + 'T00:00:00Z');
    if (year  && d.getUTCFullYear()  !== Number(year))  return false;
    if (month && d.getUTCMonth() + 1 !== Number(month)) return false;
    return true;
  });
}

function sumByMonth(rows, year) {
  const map = {};
  rows.forEach(r => {
    const d = new Date(r.fecha + 'T00:00:00Z');
    if (d.getUTCFullYear() !== Number(year)) return;
    const mes = d.getUTCMonth() + 1;
    map[mes] = (map[mes] || 0) + parseFloat(r.monto);
  });
  return map;
}

// ─── Ingresos ─────────────────────────────────────────────────────────────────

export const ingresosApi = {
  getAll: async (params = {}) => {
    await delay();
    const rows = filterByPeriod(ingresos, params)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return ok(rows);
  },

  getOne: async (id) => {
    await delay();
    const row = ingresos.find(r => r.id === Number(id));
    if (!row) throw new Error('No encontrado');
    return ok(row);
  },

  create: async (data) => {
    await delay();
    const row = { ...data, id: nextId.ingresos++, monto: parseFloat(data.monto) };
    ingresos.unshift(row);
    return ok(row);
  },

  update: async (id, data) => {
    await delay();
    const idx = ingresos.findIndex(r => r.id === Number(id));
    if (idx === -1) throw new Error('No encontrado');
    ingresos[idx] = { ...ingresos[idx], ...data, monto: parseFloat(data.monto) };
    return ok(ingresos[idx]);
  },

  remove: async (id) => {
    await delay();
    ingresos = ingresos.filter(r => r.id !== Number(id));
    return ok({ deleted: Number(id) });
  },

  resumenAnual: async (year) => {
    await delay();
    const map = sumByMonth(ingresos, year || new Date().getFullYear());
    const rows = Object.entries(map).map(([mes, total]) => ({ mes: Number(mes), total }));
    return ok(rows);
  },
};

// ─── Gastos ───────────────────────────────────────────────────────────────────

export const gastosApi = {
  getAll: async (params = {}) => {
    await delay();
    const rows = filterByPeriod(gastos, params)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return ok(rows);
  },

  getOne: async (id) => {
    await delay();
    const row = gastos.find(r => r.id === Number(id));
    if (!row) throw new Error('No encontrado');
    return ok(row);
  },

  create: async (data) => {
    await delay();
    const cat = categorias.find(c => c.id === Number(data.categoria_id));
    const row = {
      ...data,
      id: nextId.gastos++,
      monto: parseFloat(data.monto),
      categoria_nombre: cat?.nombre || null,
    };
    gastos.unshift(row);
    return ok(row);
  },

  update: async (id, data) => {
    await delay();
    const idx = gastos.findIndex(r => r.id === Number(id));
    if (idx === -1) throw new Error('No encontrado');
    const cat = categorias.find(c => c.id === Number(data.categoria_id));
    gastos[idx] = {
      ...gastos[idx],
      ...data,
      monto: parseFloat(data.monto),
      categoria_nombre: cat?.nombre || null,
    };
    return ok(gastos[idx]);
  },

  remove: async (id) => {
    await delay();
    gastos = gastos.filter(r => r.id !== Number(id));
    return ok({ deleted: Number(id) });
  },

  resumenAnual: async (year) => {
    await delay();
    const map = sumByMonth(gastos, year || new Date().getFullYear());
    const rows = Object.entries(map).map(([mes, total]) => ({ mes: Number(mes), total }));
    return ok(rows);
  },

  porCategoria: async (params = {}) => {
    await delay();
    const rows = filterByPeriod(gastos, params);
    const map = {};
    rows.forEach(r => {
      const cat = r.categoria_nombre || 'Sin categoría';
      map[cat] = (map[cat] || 0) + parseFloat(r.monto);
    });
    const result = Object.entries(map)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
    return ok(result);
  },
};

// ─── Categorías ───────────────────────────────────────────────────────────────

export const categoriasApi = {
  getAll: async (params = {}) => {
    await delay();
    let rows = [...categorias];
    if (params.tipo) rows = rows.filter(c => c.tipo === params.tipo);
    return ok(rows.sort((a, b) => a.nombre.localeCompare(b.nombre)));
  },

  create: async (data) => {
    await delay();
    const row = { ...data, id: nextId.categorias++ };
    categorias.push(row);
    return ok(row);
  },

  remove: async (id) => {
    await delay();
    categorias = categorias.filter(c => c.id !== Number(id));
    return ok({ deleted: Number(id) });
  },
};

// ─── Asistencia ───────────────────────────────────────────────────────────────

export const asistenciaApi = {
  // Devuelve registros ordenados por fecha desc, con limite opcional
  getAll: async ({ limit } = {}) => {
    await delay();
    const rows = [...asistencia].sort((a, b) => b.fecha.localeCompare(a.fecha));
    return ok(limit ? rows.slice(0, limit) : rows);
  },

  create: async (data) => {
    await delay();
    const row = { ...data, id: nextId.asistencia++ };
    asistencia.unshift(row);
    return ok(row);
  },

  // Comprueba si ya existe un registro para esa fecha y lo actualiza; si no, crea
  upsertByFecha: async (data) => {
    await delay();
    const idx = asistencia.findIndex(r => r.fecha === data.fecha);
    if (idx !== -1) {
      asistencia[idx] = { ...asistencia[idx], ...data };
      return ok(asistencia[idx]);
    }
    const row = { ...data, id: nextId.asistencia++ };
    asistencia.unshift(row);
    return ok(row);
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  resumen: async (params = {}) => {
    await delay();
    const year  = params.year  || new Date().getFullYear();
    const month = params.month || new Date().getMonth() + 1;

    const ingMes  = filterByPeriod(ingresos, { year, month });
    const gasMes  = filterByPeriod(gastos,   { year, month });
    const ingAnio = filterByPeriod(ingresos, { year });
    const gasAnio = filterByPeriod(gastos,   { year });

    const sum = (rows) => rows.reduce((s, r) => s + parseFloat(r.monto), 0);

    const iMes = sum(ingMes);
    const gMes = sum(gasMes);
    const iAnio = sum(ingAnio);
    const gAnio = sum(gasAnio);

    return ok({
      mes:  { ingresos: iMes,  gastos: gMes,  balance: iMes  - gMes  },
      anio: { ingresos: iAnio, gastos: gAnio, balance: iAnio - gAnio },
    });
  },

  mensual: async (year) => {
    await delay();
    const y = year || new Date().getFullYear();
    const ingMap = sumByMonth(ingresos, y);
    const gasMap = sumByMonth(gastos,   y);

    return ok(
      Array.from({ length: 12 }, (_, i) => {
        const mes = i + 1;
        const ing = ingMap[mes] || 0;
        const gas = gasMap[mes] || 0;
        return { mes, ingresos: ing, gastos: gas, balance: ing - gas };
      })
    );
  },
};
