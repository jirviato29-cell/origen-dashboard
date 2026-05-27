export default function ComingSoon({ role }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center p-8">
      <div className="text-5xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Módulo en desarrollo</h2>
      <p className="text-gray-400 text-sm">El módulo de <strong>{role}</strong> estará disponible próximamente.</p>
    </div>
  );
}
