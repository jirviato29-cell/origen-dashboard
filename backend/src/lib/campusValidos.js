// Lista dinámica de campus válidos, leída de la tabla `campus` de Supabase.
//
// El middleware de campus es SÍNCRONO, así que aquí mantenemos un caché en
// memoria (TTL 5 min) que se precarga al arranque del server y se refresca por
// intervalo. `campusValidos()` devuelve SIEMPRE de forma síncrona la lista
// actual; si el caché expiró, dispara un refresco en segundo plano pero no
// bloquea. Si la consulta falla, se conserva el último caché válido (y el valor
// inicial es el FALLBACK), por lo que nunca se queda sin lista.

const pool = require('../db/pool');

// Fallback si la BD no responde en el primer arranque.
const FALLBACK = ['ags', 'gdl', 'mid'];
const TTL_MS = 5 * 60 * 1000; // 5 minutos

let cache = [...FALLBACK];
let ultimaCarga = 0;
let cargando = null; // promesa en curso, para no lanzar refrescos en paralelo

// Recarga la lista desde la tabla campus. Best-effort: si falla, conserva el
// caché previo. Devuelve la lista resultante.
async function refrescar() {
  try {
    const { rows } = await pool.query('SELECT id FROM campus WHERE activo = true');
    const ids = rows.map((r) => r.id).filter(Boolean);
    // Solo pisa el caché si la consulta trajo algo; evita vaciarlo por error.
    if (ids.length) cache = ids;
    ultimaCarga = Date.now();
  } catch (err) {
    console.error('[campusValidos] no se pudo leer la tabla campus, se usa el caché/fallback:', err.message);
  }
  return cache;
}

// Lista actual (SÍNCRONA). Si el caché expiró, dispara un refresco en segundo
// plano pero devuelve de inmediato lo que ya se tiene.
function campusValidos() {
  if (Date.now() - ultimaCarga > TTL_MS && !cargando) {
    cargando = refrescar().finally(() => { cargando = null; });
  }
  return cache;
}

// Precarga al arranque + refresco periódico. `unref` para no impedir que el
// proceso termine si es lo único pendiente.
cargando = refrescar().finally(() => { cargando = null; });
const intervalo = setInterval(() => {
  if (!cargando) cargando = refrescar().finally(() => { cargando = null; });
}, TTL_MS);
if (intervalo.unref) intervalo.unref();

module.exports = { campusValidos, refrescar, FALLBACK };
