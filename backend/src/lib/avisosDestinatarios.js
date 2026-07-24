// Lógica compartida de resolución de destinatarios de avisos.
//
// Vive aquí (y no en routes/avisos.js) para que TANTO el envío (stewardship,
// routes/avisos.js) COMO la lectura (voluntario/líder, routes/misAvisos.js)
// usen EXACTAMENTE los mismos filtros de campus, ministerio y tipo de
// destinatario, sin duplicar la regla en dos lugares.

const CAMPUS_VALIDOS = ['ags', 'gdl', 'todos'];
const TIPOS_VALIDOS   = ['lideres', 'voluntarios', 'todos'];

// tipo_destinatario → roles de usuarios que reciben.
function rolesDeTipo(tipo) {
  if (tipo === 'lideres')     return ['lider_ministerio'];
  if (tipo === 'voluntarios') return ['voluntario'];
  return ['lider_ministerio', 'voluntario']; // 'todos'
}

// Construye el WHERE de SUSCRIPCIONES (dirección de ENVÍO): dado un aviso con
// sus filtros, ¿a qué usuarios llega? Sobre el alias `u` de `usuarios`.
// - campus 'todos'   → se ignora el filtro de campus.
// - ministerioId null → todos los ministerios.
function filtroSuscripciones({ campus, ministerioId, tipo }) {
  const params = [];
  const cond = ['u.activo = true'];

  params.push(rolesDeTipo(tipo));
  cond.push(`u.rol = ANY($${params.length}::text[])`);

  if (campus !== 'todos') {
    params.push(campus);
    cond.push(`u.campus = $${params.length}`);
  }
  if (ministerioId !== null && ministerioId !== undefined) {
    params.push(ministerioId);
    cond.push(`u.ministerio_id = $${params.length}`);
  }
  return { where: cond.join(' AND '), params };
}

// Construye el WHERE de AVISOS (dirección INVERSA, de LECTURA): dado un usuario,
// ¿qué avisos le corresponden? Sobre el alias `a` de `avisos`. Es el espejo de
// filtroSuscripciones y reutiliza `rolesDeTipo`, así la regla no se duplica:
// un aviso llega al usuario si su rol está entre los roles del tipo del aviso.
// `startIndex` permite anteponer otros parámetros ($1, $2…) antes de estos.
function filtroAvisosParaUsuario({ campus, ministerioId, rol }, startIndex = 0) {
  const params = [];
  const cond = [];
  const p = () => startIndex + params.length; // índice 1-based del último push

  // Campus: el aviso es 'todos' o coincide con el campus del usuario.
  params.push(campus);
  cond.push(`(a.campus = 'todos' OR a.campus = $${p()})`);

  // Ministerio: el aviso es global (NULL) o coincide con el del usuario. Si el
  // usuario no tiene ministerio, solo recibe los avisos globales.
  params.push(ministerioId);
  cond.push(`(a.ministerio_id IS NULL OR a.ministerio_id = $${p()})`);

  // Tipo de destinatario: los tipos cuyo conjunto de roles incluye el rol del
  // usuario (reutiliza rolesDeTipo para no re-escribir el mapeo).
  const tiposQueAplican = TIPOS_VALIDOS.filter((t) => rolesDeTipo(t).includes(rol));
  params.push(tiposQueAplican);
  cond.push(`a.destinatarios = ANY($${p()}::text[])`);

  return { where: cond.join(' AND '), params };
}

module.exports = {
  CAMPUS_VALIDOS,
  TIPOS_VALIDOS,
  rolesDeTipo,
  filtroSuscripciones,
  filtroAvisosParaUsuario,
};
