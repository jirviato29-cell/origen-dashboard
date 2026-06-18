const fmtMonto = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = (f) => {
  if (!f) return '—';
  try { return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return f; }
};
const esPdf = (url) => typeof url === 'string' && url.toLowerCase().includes('.pdf');

function Adjunto({ titulo, url }) {
  if (!url) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 7 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: 'var(--muted-2)', padding: '18px 0', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }}>Sin archivo</div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 7 }}>{titulo}</div>
      {esPdf(url) ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '22px 0', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--ink)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          📄 Ver PDF
        </a>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          <img src={url} alt={titulo} style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)', display: 'block' }} />
        </a>
      )}
    </div>
  );
}

export default function GastoDetalleModal({ gasto, onClose }) {
  if (!gasto) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '22px 24px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>{gasto.concepto || 'Gasto'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{gasto.categoria || 'Sin categoría'} · {fmtFecha(gasto.fecha)}</div>
          </div>
          <button onClick={onClose} style={{ border: 0, background: 'var(--surface-3)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16, lineHeight: 1, color: 'var(--ink)' }}>×</button>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--danger)', letterSpacing: '-.03em', marginBottom: 18 }}>−{fmtMonto(gasto.monto)}</div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <Adjunto titulo="Comprobante" url={gasto.comprobante_url} />
          <Adjunto titulo="Foto de lo adquirido" url={gasto.comprobante_url_2} />
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 7 }}>Comentarios</div>
          <div style={{ fontSize: 14, color: gasto.comentarios ? 'var(--ink)' : 'var(--muted-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {gasto.comentarios || 'Sin comentarios.'}
          </div>
        </div>
      </div>
    </div>
  );
}
