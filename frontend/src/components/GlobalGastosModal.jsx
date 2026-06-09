import { useState, useEffect } from 'react';
import { gastosApi, comprobanteApi } from '../services/api';
import { useGastosModal } from '../context/GastosModalContext';
import { I } from './Icons';

const CATEGORIAS = ['Operación', 'Alimentos', 'Materiales', 'Eventos', 'Decoración'];
const MAX_BYTES  = 10 * 1024 * 1024;

function toISODate(d) { return d.toISOString().slice(0, 10); }
function todayISO() { const d = new Date(); d.setHours(0, 0, 0, 0); return toISODate(d); }

function formatDateLong(iso) {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

const makeEmpty = () => ({ fecha: todayISO(), concepto: '', categoria: '', monto: '', fecha_vencimiento: '' });

// ── Shared input style ────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-ui)',
};

export default function GlobalGastosModal() {
  const { open, pagado, closeModal, triggerRefresh } = useGastosModal();

  const [form,        setForm]        = useState(makeEmpty);
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [savedData,   setSavedData]   = useState(null);
  const [uploading,   setUploading]   = useState(false);

  // File / comprobante state
  const [archivo,      setArchivo]      = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [archivoError, setArchivoError] = useState('');
  const [fileKey,      setFileKey]      = useState(0);

  const monto   = parseFloat(form.monto) || 0;
  const canSave = form.fecha && form.concepto.trim() && form.categoria && monto > 0;

  useEffect(() => {
    if (open) {
      setSaved(false); setForm(makeEmpty()); setError('');
      setArchivo(null); setPreview(null); setArchivoError('');
      setFileKey(k => k + 1);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !saved) closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal, saved]);

  // ── File handlers ────────────────────────────────────────────────────────────

  const handleArchivoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setArchivoError('El archivo supera el límite de 10 MB.');
      setArchivo(null); setPreview(null);
      return;
    }
    setArchivoError('');
    setArchivo(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const handleRemoveArchivo = () => {
    setArchivo(null); setPreview(null); setArchivoError('');
    setFileKey(k => k + 1);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.fecha)           { setError('La fecha es requerida.'); return; }
    if (!form.concepto.trim()) { setError('El concepto es requerido.'); return; }
    if (!form.categoria)       { setError('Selecciona una categoría.'); return; }
    if (monto <= 0)            { setError('El monto debe ser mayor a cero.'); return; }
    setError('');

    // 1) Upload comprobante if present
    let comprobanteUrl = null;
    if (archivo) {
      setUploading(true);
      try {
        const res = await comprobanteApi.upload(archivo);
        comprobanteUrl = res.data.url;
      } catch (err) {
        setError('Error al subir el comprobante. Los demás datos no se perdieron, inténtalo de nuevo.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // 2) Create gasto
    setSaving(true);
    try {
      await gastosApi.create({
        fecha:             form.fecha,
        concepto:          form.concepto.trim(),
        categoria:         form.categoria,
        monto,
        pagado,
        comprobante_url:   comprobanteUrl,
        fecha_vencimiento: form.fecha_vencimiento || null,
      });
      setSavedData({ fecha: form.fecha, concepto: form.concepto.trim(), categoria: form.categoria, monto });
      setSaved(true);
      triggerRefresh();
      setTimeout(() => { setSaved(false); closeModal(); }, 2200);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isBusy = saving || uploading;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !saved) closeModal(); }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>

        <div className="modal-grabber" />

        {saved ? (
          <div className="anf-success">
            <div className="anf-success-icon"><I.check size={36} /></div>
            <h3>¡Gasto registrado!</h3>
            <p>{formatDateLong(savedData.fecha)}</p>
            <div className="anf-success-total">
              <span>{savedData.concepto}</span>
              <strong>${savedData.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
              {savedData.categoria}
            </div>
          </div>
        ) : (
          <>
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">
                  {pagado ? 'Stewardship · Gastos' : 'Stewardship · Por pagar'}
                </div>
                <h3 className="anf-modal-date">
                  {pagado ? 'Registrar gasto' : 'Registrar gasto por pagar'}
                </h3>
                <p>Origen Aguascalientes</p>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Fecha */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha</label>
                <input type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  style={inputStyle} />
              </div>

              {/* Concepto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Concepto</label>
                <input type="text" placeholder="ej. Compra de materiales para el servicio"
                  value={form.concepto}
                  onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                  style={inputStyle} />
              </div>

              {/* Categoría */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</label>
                <select value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  style={{ ...inputStyle, background: 'white', color: form.categoria ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer' }}>
                  <option value="" disabled>Seleccionar categoría…</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Monto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monto</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    style={{ ...inputStyle, padding: '10px 12px 10px 26px', fontFamily: 'var(--font-mono)', fontSize: 16 }} />
                </div>
              </div>

              {/* Fecha de vencimiento — solo para gastos por pagar */}
              {!pagado && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Fecha de vencimiento
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                  </label>
                  <input type="date" value={form.fecha_vencimiento}
                    onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                    style={inputStyle} />
                </div>
              )}

              {/* Comprobante */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Comprobante
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                </label>

                {!archivo ? (
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 10, border: '1.5px dashed var(--border)',
                    cursor: 'pointer', color: 'var(--muted)', fontSize: 13.5, fontWeight: 500,
                    background: 'var(--surface)', transition: 'border-color 0.15s',
                  }}>
                    <I.download size={15} />
                    Seleccionar imagen o PDF
                    <input
                      key={fileKey}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleArchivoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                  }}>
                    {preview ? (
                      <img src={preview} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(180,74,58,0.10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', letterSpacing: '0.04em' }}>PDF</span>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {archivo.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                        {(archivo.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <button type="button" onClick={handleRemoveArchivo}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, flexShrink: 0 }}>
                      <I.x size={14} />
                    </button>
                  </div>
                )}

                {archivoError && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{archivoError}</p>
                )}
              </div>

              {/* Total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10,
                background: 'var(--black)', border: '1.5px solid var(--black)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'white' }}>
                  ${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>

            </div>

            {error && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>
                {error}
              </p>
            )}

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={isBusy || !canSave}
              style={{ opacity: (isBusy || !canSave) ? 0.45 : 1, marginTop: 4 }}
            >
              <I.check size={16} />
              {uploading
                ? 'Subiendo comprobante…'
                : saving
                  ? 'Guardando…'
                  : pagado ? 'Guardar gasto' : 'Guardar gasto por pagar'}
            </button>

            {!canSave && !error && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>
                Completa todos los campos para guardar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
