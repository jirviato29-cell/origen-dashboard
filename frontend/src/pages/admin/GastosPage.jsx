import { useEffect, useState, useCallback } from 'react';
import { gastosApi, categoriasApi } from '../../services/api';
import Modal from '../../components/Modal';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function GastosForm({ initial, categorias, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { concepto: '', monto: '', fecha: new Date().toISOString().slice(0, 10), categoria_id: '', notas: '' }
  );

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.concepto || !form.monto || !form.fecha) return;
    onSave({ ...form, monto: parseFloat(form.monto), categoria_id: form.categoria_id || null });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
        <input
          name="concepto"
          value={form.concepto}
          onChange={handle}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1644A]"
          placeholder="Ej: Pago de renta"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto (MXN) *</label>
          <input
            name="monto"
            type="number"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={handle}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1644A]"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
          <input
            name="fecha"
            type="date"
            value={form.fecha}
            onChange={handle}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1644A]"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          name="categoria_id"
          value={form.categoria_id || ''}
          onChange={handle}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1644A]"
        >
          <option value="">Sin categoría</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          name="notas"
          value={form.notas || ''}
          onChange={handle}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1644A] resize-none"
          placeholder="Opcional..."
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#C1644A' }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function GastosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      gastosApi.getAll({ year, month }),
      categoriasApi.getAll({ tipo: 'gasto' }),
    ]).then(([g, c]) => {
      setRows(g.data);
      setCategorias(c.data);
    }).finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (modal?.edit) {
      await gastosApi.update(modal.edit.id, data);
    } else {
      await gastosApi.create(data);
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id) => {
    await gastosApi.remove(id);
    setDeleting(null);
    load();
  };

  const total = rows.reduce((s, r) => s + parseFloat(r.monto), 0);
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gastos</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de egresos y pagos</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#C1644A' }}
        >
          + Nuevo gasto
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <div className="ml-auto bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          <span className="text-xs text-red-500">Total: </span>
          <span className="font-semibold text-red-700">{fmt(total)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No hay gastos registrados para este período.</p>
            <button
              onClick={() => setModal('create')}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#C1644A' }}
            >
              Registrar primer gasto
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Fecha</th>
                <th className="px-6 py-3 text-left">Concepto</th>
                <th className="px-6 py-3 text-left">Categoría</th>
                <th className="px-6 py-3 text-left">Notas</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-500">{fmtDate(row.fecha)}</td>
                  <td className="px-6 py-3 font-medium text-gray-800">{row.concepto}</td>
                  <td className="px-6 py-3">
                    {row.categoria_nombre ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-[#C1644A] font-medium">
                        {row.categoria_nombre}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3 text-gray-400 max-w-xs truncate">{row.notas || '—'}</td>
                  <td className="px-6 py-3 text-right font-semibold text-red-600">{fmt(row.monto)}</td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setModal({ edit: row })}
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleting(row.id)}
                        className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Nuevo gasto' : 'Editar gasto'}
          onClose={() => setModal(null)}
        >
          <GastosForm
            initial={modal?.edit ? { ...modal.edit, fecha: modal.edit.fecha?.slice(0, 10), categoria_id: modal.edit.categoria_id || '' } : null}
            categorias={categorias}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <p className="font-semibold text-gray-800 mb-2">¿Eliminar este gasto?</p>
            <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleting)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
              >
                Eliminar
              </button>
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}
