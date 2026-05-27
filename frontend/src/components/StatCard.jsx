export default function StatCard({ label, value, icon, color = '#C1644A', sub }) {
  const formatted = typeof value === 'number'
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
    : value;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>{formatted}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
