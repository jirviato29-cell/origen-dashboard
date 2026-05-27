import { useEffect, useState } from 'react';
import { dashboardApi } from '../../services/api';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function VistaMensual() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  useEffect(() => {
    setLoading(true);
    dashboardApi.mensual(year)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [year]);

  const maxVal = Math.max(...data.map(d => Math.max(d.ingresos, d.gastos)), 1);

  const totalIngresos = data.reduce((s, d) => s + d.ingresos, 0);
  const totalGastos = data.reduce((s, d) => s + d.gastos, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vista Mensual</h1>
          <p className="text-gray-500 text-sm mt-1">Comparativo de ingresos y gastos por mes</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Gráfica de barras visual (CSS) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-end gap-2 h-48">
          {loading ? (
            <div className="w-full flex items-center justify-center text-gray-400">Cargando...</div>
          ) : (
            data.map((d) => (
              <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end h-40">
                  <div
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${Math.round((d.ingresos / maxVal) * 100)}%`,
                      backgroundColor: '#16a34a',
                      minHeight: d.ingresos > 0 ? '4px' : '0',
                    }}
                    title={`Ingresos: ${fmt(d.ingresos)}`}
                  />
                  <div
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${Math.round((d.gastos / maxVal) * 100)}%`,
                      backgroundColor: '#dc2626',
                      minHeight: d.gastos > 0 ? '4px' : '0',
                    }}
                    title={`Gastos: ${fmt(d.gastos)}`}
                  />
                </div>
                <p className="text-xs text-gray-400">{MESES[d.mes - 1].slice(0, 3)}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-4 mt-3 justify-end">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-green-600" /> Ingresos
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-red-600" /> Gastos
          </div>
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Mes</th>
              <th className="px-6 py-3 text-right">Ingresos</th>
              <th className="px-6 py-3 text-right">Gastos</th>
              <th className="px-6 py-3 text-right">Balance</th>
              <th className="px-6 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : (
              data.map((d) => (
                <tr key={d.mes} className={`hover:bg-gray-50 transition-colors ${d.mes === now.getMonth() + 1 && year === now.getFullYear() ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-6 py-3 font-medium text-gray-700">{MESES[d.mes - 1]}</td>
                  <td className="px-6 py-3 text-right text-green-700">{fmt(d.ingresos)}</td>
                  <td className="px-6 py-3 text-right text-red-600">{fmt(d.gastos)}</td>
                  <td className={`px-6 py-3 text-right font-semibold ${d.balance >= 0 ? 'text-[#C1644A]' : 'text-red-600'}`}>
                    {fmt(d.balance)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {d.ingresos === 0 && d.gastos === 0 ? (
                      <span className="text-xs text-gray-300">Sin datos</span>
                    ) : d.balance >= 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Positivo</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">Déficit</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold text-gray-700 border-t border-gray-100">
              <td className="px-6 py-3">Total {year}</td>
              <td className="px-6 py-3 text-right text-green-700">{fmt(totalIngresos)}</td>
              <td className="px-6 py-3 text-right text-red-600">{fmt(totalGastos)}</td>
              <td className={`px-6 py-3 text-right ${totalIngresos - totalGastos >= 0 ? 'text-[#C1644A]' : 'text-red-600'}`}>
                {fmt(totalIngresos - totalGastos)}
              </td>
              <td className="px-6 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}
