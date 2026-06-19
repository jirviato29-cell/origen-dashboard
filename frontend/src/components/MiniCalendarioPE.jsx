import { useState } from 'react';
import { toISODate } from '../utils/fecha';

// Copiado exacto de CalendarioPage — no modificar
function buildGrid(year, month) {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Copiado exacto de CalendarioPage — no modificar
function isoFromParts(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Mismo orden que CalendarioPage
const DIAS_HEADER = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const NAVY     = '#112540';
const NAVY_700 = '#244169';
const ORANGE   = '#FF6B2B';
const GRAY_200 = '#E2E6EC';
const GRAY_300 = '#CBD2DC';
const GRAY_500 = '#7A8699';

export default function MiniCalendarioPE({ eventos = [], onSelectDia }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayISO = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate());

  // Agrupar eventos PE por fecha ISO — mismo criterio que CalendarioPage
  const eventosByDate = {};
  eventos.forEach(e => {
    const iso = toISODate(e.fecha);
    if (iso) eventosByDate[iso] = true;
  });

  const grid = buildGrid(year, month);

  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const arrowBtn = {
    width: 26, height: 26, borderRadius: 6,
    border: `1px solid ${GRAY_200}`, background: 'white',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: NAVY_700,
    fontSize: 14, fontWeight: 600, lineHeight: 1,
    fontFamily: 'var(--font-ui)',
  };

  return (
    <div className="card" style={{ padding: '14px 16px' }}>

      {/* Cabecera — mes + flechas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button style={arrowBtn} onClick={prevMonth} aria-label="Mes anterior">‹</button>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}>
          {monthLabel}
        </span>
        <button style={arrowBtn} onClick={nextMonth} aria-label="Mes siguiente">›</button>
      </div>

      {/* Cuadrícula: encabezado + días en un solo contenedor con borde exterior */}
      <div style={{ border: `1px solid ${GRAY_200}`, borderRadius: 8, overflow: 'hidden' }}>

        {/* Fila de encabezado de días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#F6F7F9' }}>
          {DIAS_HEADER.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 9, fontWeight: 700,
              color: GRAY_500, textTransform: 'uppercase', letterSpacing: '.05em',
              padding: '5px 0',
              borderRight: i < 6 ? `1px solid ${GRAY_200}` : 'none',
              borderBottom: `1px solid ${GRAY_200}`,
            }}>
              {d[0]}
            </div>
          ))}
        </div>

        {/* Celdas de días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {grid.map((day, ci) => {
            const iso       = day ? isoFromParts(year, month, day) : null;
            const hasEvt    = iso ? !!eventosByDate[iso] : false;
            const isToday   = iso === todayISO;
            const canClick  = hasEvt && !!onSelectDia;
            const isLastCol = (ci + 1) % 7 === 0;

            return (
              <div
                key={ci}
                onClick={canClick ? () => onSelectDia(iso) : undefined}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  height: 32, cursor: canClick ? 'pointer' : 'default',
                  borderRight: !isLastCol ? `1px solid ${GRAY_200}` : 'none',
                  borderBottom: `1px solid ${GRAY_200}`,
                  background: hasEvt ? 'rgba(255,107,43,0.09)' : 'transparent',
                }}
              >
                {day && (
                  <>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, lineHeight: 1,
                      fontWeight: isToday || hasEvt ? 600 : 400,
                      background: isToday ? ORANGE : 'transparent',
                      color: isToday ? 'white' : hasEvt ? ORANGE : GRAY_300,
                    }}>
                      {day}
                    </span>
                    {/* Punto naranja: solo cuando tiene evento y no es hoy (el fondo ya lo señala) */}
                    <span style={{
                      width: 3, height: 3, borderRadius: '50%',
                      background: hasEvt && !isToday ? ORANGE : 'transparent',
                      marginTop: 1, display: 'block', flexShrink: 0,
                    }} />
                  </>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
