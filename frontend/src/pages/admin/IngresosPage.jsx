import { useEffect, useState, useCallback } from 'react';
import { ingresosApi } from '../../services/api';
import Modal from '../../components/Modal';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function IngresosForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { concepto: '', monto: '', fecha: new Date().toISOString().slice(0, 10), notas: '' }
  );

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.concepto || !form.monto || !form.fecha) return;
    onSave({ ...form, monto: parseFloat(form.monto) });
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
          placeholder="Ej: Diezmos domingo"
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
          className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: '#C1644A' }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function IngresosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | { edit: row }
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    ingresosApi.getAll({ year, month })
      .then(r => setRows(r.data))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (modal?.edit) {
      await ingresosApi.update(modal.edit.id, data);
    } else {
      await ingresosApi.create(data);
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id) => {
    await ingresosApi.remove(id);
    setDeleting(null);
    load();
  };

  const total = rows.reduce((s, r) => s + parseFloat(r.monto), 0);
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ingresos</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de entradas de dinero</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#C1644A' }}
        >
          + Nuevo ingreso
        </button>
      </div>

      {/* Filtros */}
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
        <div className="ml-auto bg-green-50 border border-green-100 rounded-lg px-4 py-2">
          <span className="text-xs text-green-600">Total: </span>
          <span className="font-semibold text-green-700">{fmt(total)}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No hay ingresos registrados para este período.</p>
            <button
              onClick={() => setModal('create')}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#C1644A' }}
            >
              Registrar primer ingreso
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Fecha</th>
                <th className="px-6 py-3 text-left">Concepto</th>
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
                  <td className="px-6 py-3 text-gray-400 max-w-xs truncate">{row.notas || '—'}</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-700">{fmt(row.monto)}</td>
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

      {/* Modal crear/editar */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Nuevo ingreso' : 'Editar ingreso'}
          onClose={() => setModal(null)}
        >
          <IngresosForm
            initial={modal?.edit ? { ...modal.edit, fecha: modal.edit.fecha?.slice(0, 10) } : null}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Confirmar eliminar */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <p className="font-semibold text-gray-800 mb-2">¿Eliminar este ingreso?</p>
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
