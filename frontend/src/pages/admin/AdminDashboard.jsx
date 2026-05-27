import { useEffect, useState } from 'react';
import { dashboardApi } from '../../services/api';
import StatCard from '../../components/StatCard';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function AdminDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [resumen, setResumen] = useState(null);
  const [mensual, setMensual] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardApi.resumen({ year, month }),
      dashboardApi.mensual(year),
    ]).then(([r, m]) => {
      setResumen(r.data);
      setMensual(m.data);
    }).finally(() => setLoading(false));
  }, [year, month]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  const mes = resumen?.mes || {};
  const anio = resumen?.anio || {};

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Financiero</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de ingresos y gastos</p>
        </div>
        <div className="flex gap-3">
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
        </div>
      </div>

      {/* Tarjetas del mes */}
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
        {MESES[month - 1]} {year}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Ingresos del mes" value={mes.ingresos || 0} icon="💰" color="#16a34a" />
        <StatCard label="Gastos del mes" value={mes.gastos || 0} icon="📋" color="#dc2626" />
        <StatCard
          label="Balance del mes"
          value={mes.balance || 0}
          icon={mes.balance >= 0 ? '📈' : '📉'}
          color={mes.balance >= 0 ? '#C1644A' : '#dc2626'}
        />
      </div>

      {/* Tarjetas del año */}
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Acumulado {year}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Ingresos del año" value={anio.ingresos || 0} icon="💰" color="#16a34a" sub="Acumulado anual" />
        <StatCard label="Gastos del año" value={anio.gastos || 0} icon="📋" color="#dc2626" sub="Acumulado anual" />
        <StatCard
          label="Balance anual"
          value={anio.balance || 0}
          icon={anio.balance >= 0 ? '📈' : '📉'}
          color={anio.balance >= 0 ? '#C1644A' : '#dc2626'}
          sub="Acumulado anual"
        />
      </div>

      {/* Tabla mensual */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Resumen mensual {year}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Mes</th>
                <th className="px-6 py-3 text-right">Ingresos</th>
                <th className="px-6 py-3 text-right">Gastos</th>
                <th className="px-6 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mensual.map((row) => (
                <tr
                  key={row.mes}
                  className={`hover:bg-gray-50 transition-colors ${row.mes === month ? 'bg-orange-50' : ''}`}
                >
                  <td className="px-6 py-3 font-medium text-gray-700">{MESES[row.mes - 1]}</td>
                  <td className="px-6 py-3 text-right text-green-700">
                    {fmt(row.ingresos)}
                  </td>
                  <td className="px-6 py-3 text-right text-red-600">
                    {fmt(row.gastos)}
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${row.balance >= 0 ? 'text-[#C1644A]' : 'text-red-600'}`}>
                    {fmt(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-gray-700">
                <td className="px-6 py-3">Total</td>
                <td className="px-6 py-3 text-right text-green-700">{fmt(anio.ingresos || 0)}</td>
                <td className="px-6 py-3 text-right text-red-600">{fmt(anio.gastos || 0)}</td>
                <td className={`px-6 py-3 text-right ${anio.balance >= 0 ? 'text-[#C1644A]' : 'text-red-600'}`}>
                  {fmt(anio.balance || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}
