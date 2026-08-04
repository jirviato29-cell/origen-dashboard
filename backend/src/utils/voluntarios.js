// Helpers compartidos de deduplicación de voluntarios por WhatsApp.
//
// Viven aquí para usarse SIN DUPLICAR desde ambos routers que dan de alta
// voluntarios: el directorio (routes/voluntarios.js) y el panel del líder
// (routes/liderVoluntarios.js). Todas las funciones que tocan la BD reciben un
// `db` como primer parámetro, que puede ser el pool o un client dentro de una
// transacción (así el llamador controla BEGIN/COMMIT).

// Normaliza un WhatsApp a sus últimos 10 dígitos (identidad de la persona en el
// campus). Devuelve null si no hay al menos 10 dígitos, para NO deduplicar con
// datos incompletos.
function normalizarWhats(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
}

// Normaliza un array de ids de ministerio a enteros únicos. Devuelve null si el
// campo NO es un array (para distinguir "no enviado" de "lista vacía").
function normalizarMinisterioIds(valor) {
  if (!Array.isArray(valor)) return null;
  return [...new Set(valor.map(Number).filter(Number.isInteger))];
}

// Respaldo textual: resuelve los nombres de los PRIMEROS 3 ids (en el orden en
// que llegan) para guardarlos en ministerio1/2/3. Los ids sobrantes viven solo
// en la tabla puente. Devuelve siempre una terna [m1, m2, m3] (null si falta).
async function nombresDeMinisterios(db, ids) {
  const primeros = (ids || []).slice(0, 3);
  if (primeros.length === 0) return [null, null, null];
  const { rows } = await db.query(
    'SELECT id, nombre FROM ministerios WHERE id = ANY($1::int[])',
    [primeros]
  );
  const porId = new Map(rows.map(r => [r.id, r.nombre]));
  return [0, 1, 2].map(i => (primeros[i] != null ? (porId.get(primeros[i]) || null) : null));
}

// Busca en un campus el voluntario cuyos últimos 10 dígitos de WhatsApp coinciden
// con los del `whatsapp` recibido (se normaliza aquí adentro). Devuelve la ficha
// con su lista de ministerios y `registrado_por_nombre`, o null si no hay
// coincidencia (o si el WhatsApp no tiene 10 dígitos). Acepta un `db` que puede
// ser el pool o un client dentro de transacción.
async function buscarPorWhatsapp(db, campus, whatsapp) {
  const whats10 = normalizarWhats(whatsapp);
  if (!whats10) return null;
  const { rows } = await db.query(
    `SELECT v.id, v.nombre, v.correo, v.cumpleanos, v.whatsapp, v.registrado_por,
            u.nombre AS registrado_por_nombre
       FROM voluntarios v
       LEFT JOIN usuarios u ON u.id = v.registrado_por
      WHERE v.campus = $1
        AND right(regexp_replace(coalesce(v.whatsapp,''),'[^0-9]','','g'),10) = $2
      LIMIT 1`,
    [campus, whats10]
  );
  if (!rows.length) return null;
  const vol = rows[0];
  const { rows: mins } = await db.query(
    `SELECT m.id, m.nombre, m.color
       FROM voluntario_ministerios vm
       JOIN ministerios m ON m.id = vm.ministerio_id
      WHERE vm.voluntario_id = $1
      ORDER BY vm.id`,
    [vol.id]
  );
  return { ...vol, ministerios: mins };
}

// Agrega ministerios a un voluntario existente (idempotente vía índice único
// uq_voluntario_ministerio) y resincroniza el respaldo textual ministerio1/2/3
// con los 3 primeros (por orden de alta en la puente). Debe correr dentro de una
// transacción. Devuelve { agregados, ministerios } donde `agregados` son solo los
// ids realmente insertados (los que NO chocaron con el ON CONFLICT) y
// `ministerios` la lista final del voluntario.
async function agregarMinisterios(db, voluntarioId, campus, ministerioIds) {
  const ids = normalizarMinisterioIds(ministerioIds) || [];
  const agregados = [];
  for (const mid of ids) {
    const { rowCount } = await db.query(
      `INSERT INTO voluntario_ministerios (voluntario_id, ministerio_id, campus)
       VALUES ($1, $2, $3)
       ON CONFLICT (voluntario_id, ministerio_id) DO NOTHING`,
      [voluntarioId, mid, campus]
    );
    if (rowCount > 0) agregados.push(mid);
  }
  const { rows: ministerios } = await db.query(
    `SELECT m.id, m.nombre, m.color
       FROM voluntario_ministerios vm
       JOIN ministerios m ON m.id = vm.ministerio_id
      WHERE vm.voluntario_id = $1
      ORDER BY vm.id`,
    [voluntarioId]
  );
  const [m1, m2, m3] = [0, 1, 2].map(i => ministerios[i]?.nombre || null);
  await db.query(
    'UPDATE voluntarios SET ministerio1=$1, ministerio2=$2, ministerio3=$3 WHERE id=$4',
    [m1, m2, m3, voluntarioId]
  );
  return { agregados, ministerios };
}

// Fusiona un alta duplicada: busca al voluntario existente por WhatsApp y le
// agrega los ministerios recibidos. Debe correr dentro de una transacción (no
// hace COMMIT). Devuelve el cuerpo de respuesta { duplicado:true, ... } o null si
// no hay coincidencia.
async function fusionarDuplicado(db, campus, whatsapp, ministerioIds) {
  const existente = await buscarPorWhatsapp(db, campus, whatsapp);
  if (!existente) return null;
  const { agregados, ministerios } = await agregarMinisterios(db, existente.id, campus, ministerioIds || []);
  return {
    duplicado: true,
    voluntario_id: existente.id,
    nombre: existente.nombre,
    agregados,
    ministerios,
  };
}

module.exports = {
  normalizarWhats,
  normalizarMinisterioIds,
  nombresDeMinisterios,
  buscarPorWhatsapp,
  agregarMinisterios,
  fusionarDuplicado,
};
