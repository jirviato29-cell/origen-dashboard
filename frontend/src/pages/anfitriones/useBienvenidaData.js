import { useState, useEffect, useCallback } from 'react';
import { visitantesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';

export const EDICIONES = [
  { id: 'actual', label: 'Actual',                     from: '2026-03-23', to: null         },
  { id: 'mar22',  label: 'Bienvenida del 22 de marzo', from: '2026-01-01', to: '2026-03-22' },
];

function inEdicion(v, ed) {
  if (!v.fecha) return false;
  const d = v.fecha.slice(0, 10);
  if (ed.from && d < ed.from) return false;
  if (ed.to   && d > ed.to)   return false;
  return true;
}

const PAGE_SIZE = 15;

export default function useBienvenidaData() {
  const { permisos } = useAuth();
  const canWrite = puedeRegistrar(permisos, 'visitantes');

  const [visitantes, setVisitantes] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filtro,     setFiltro]     = useState('todos');
  const [page,       setPage]       = useState(1);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [edicion,    setEdicion]    = useState('actual');

  const load = useCallback(async () => {
    try {
      const { data } = await visitantesApi.getAll();
      setVisitantes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const edDef     = EDICIONES.find(e => e.id === edicion) ?? EDICIONES[0];
  const enEdicion = visitantes.filter(v => inEdicion(v, edDef));

  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const personas  = v => 1 + (v.acompanantes_num || 0);

  const totalPersonas         = visitantes.reduce((s, v) => s + personas(v), 0);
  const quierenSeguirPersonas = visitantes
    .filter(v => v.relacion_con_origen === 'Me interesa seguir')
    .reduce((s, v) => s + personas(v), 0);
  const nuevosFePersonas      = visitantes
    .filter(v => v.estado_fe === 'Soy nuevo')
    .reduce((s, v) => s + personas(v), 0);
  const esteMesPersonas       = visitantes
    .filter(v => {
      if (!v.fecha) return false;
      const d = new Date(v.fecha + 'T00:00:00');
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((s, v) => s + personas(v), 0);
  const quierenPct = totalPersonas > 0 ? Math.round((quierenSeguirPersonas / totalPersonas) * 100) : 0;

  const filtered = enEdicion.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || [v.nombre, v.colonia, v.como_se_entero, v.whatsapp]
      .some(s => s?.toLowerCase().includes(q));
    const matchFiltro =
      filtro === 'todos'      ? true :
      filtro === 'seguir'     ? v.relacion_con_origen === 'Me interesa seguir' :
      filtro === 'visita'     ? v.relacion_con_origen === 'Solo vengo de visita' :
      filtro === 'nuevo'      ? v.estado_fe === 'Soy nuevo' :
      filtro === 'cristiano'  ? v.estado_fe === 'Soy cristiano' : true;
    return matchSearch && matchFiltro;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openNew()    { setEditing(null); setShowModal(true); }
  function openEdit(v)  { setEditing(v);    setShowModal(true); }
  function closeModal() { setShowModal(false); setEditing(null); }
  async function onSaved() { closeModal(); await load(); }

  function openWa(num) {
    if (!num) return;
    window.open(`https://wa.me/${num.replace(/\D/g, '')}`, '_blank');
  }

  function changeEdicion(id) { setEdicion(id); setFiltro('todos'); setSearch(''); setPage(1); }
  function changeFiltro(f)   { setFiltro(f);   setPage(1); }
  function changeSearch(val) { setSearch(val);  setPage(1); }

  async function toggleContactado(v) {
    const nuevo = !v.contactado;
    setVisitantes(prev => prev.map(x => x.id === v.id ? { ...x, contactado: nuevo } : x));
    try {
      await visitantesApi.patch(v.id, { contactado: nuevo });
    } catch {
      setVisitantes(prev => prev.map(x => x.id === v.id ? { ...x, contactado: !nuevo } : x));
    }
  }

  return {
    visitantes, loading, search, filtro, page, edicion, showModal, editing,
    PAGE_SIZE,
    edDef,
    kpis: { totalPersonas, quierenSeguirPersonas, nuevosFePersonas, esteMesPersonas, quierenPct },
    filtered, totalPages, paged,
    canWrite,
    openNew, openEdit, closeModal, onSaved,
    openWa, changeEdicion, changeFiltro, changeSearch,
    toggleContactado, setPage,
  };
}
