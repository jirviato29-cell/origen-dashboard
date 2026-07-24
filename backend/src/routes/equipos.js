const express = require('express');
const pool    = require('../db/pool');
// Reusa el MISMO guard de admin de usuarios.js (solo rol stewardship o
// administracion). No se duplica la logica de auth.
const { requireAdmin } = require('./usuarios');

const router = express.Router();
router.use(requireAdmin);

// "Líderes y equipos" (vista global de stewardship): por cada ministerio del
// campus, su(s) líder(es) y sus voluntarios CON CUENTA (usuarios rol='voluntario'
// ligados a un ministerio). SOLO LECTURA. NO es el "Directorio de voluntarios"
// viejo (fichas históricas sin cuenta): aquí solo va el sistema nuevo de cuentas.
// Todo se filtra por el campus del contexto (req.campus), nunca del cliente.

// ── GET /api/equipos ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const campus = req.campus;
  try {
    // 3 consultas en paralelo, todas acotadas al campus del contexto.
    const [{ rows: mins }, { rows: lids }, { rows: vols }] = await Promise.all([
      // Ministerios del campus (incluye los que no tienen a nadie).
      pool.query(
        `SELECT id, nombre, color FROM ministerios WHERE campus = $1 ORDER BY nombre`,
        [campus]
      ),
      // Líderes de ministerio del campus (puede haber 0, 1 o varios por ministerio).
      pool.query(
        `SELECT id, nombre, activo, ministerio_id
           FROM usuarios
          WHERE rol = 'lider_ministerio' AND campus = $1 AND ministerio_id IS NOT NULL
          ORDER BY nombre`,
        [campus]
      ),
      // Voluntarios CON CUENTA ligados a un ministerio, con su ficha (nombre
      // completo, whatsapp, cumpleaños) y el apodo/activo de la cuenta.
      pool.query(
        `SELECT u.id,
                COALESCE(v.nombre, u.nombre) AS nombre,
                u.apodo,
                u.activo,
                u.ministerio_id,
                v.whatsapp,
                v.cumpleanos
           FROM usuarios u
           LEFT JOIN voluntarios v ON v.id = u.voluntario_id
          WHERE u.rol = 'voluntario' AND u.campus = $1 AND u.ministerio_id IS NOT NULL
          ORDER BY nombre`,
        [campus]
      ),
    ]);

    // Agrupa líderes y voluntarios por ministerio. Los ministerios sin líder ni
    // voluntarios quedan con arrays vacíos (para que stewardship vea los huecos).
    const ministerios = mins.map((m) => {
      const lideres = lids
        .filter((l) => l.ministerio_id === m.id)
        .map((l) => ({ id: l.id, nombre: l.nombre, activo: l.activo }));
      const voluntarios = vols
        .filter((v) => v.ministerio_id === m.id)
        .map((v) => ({
          id: v.id, nombre: v.nombre, apodo: v.apodo, activo: v.activo,
          whatsapp: v.whatsapp, cumpleanos: v.cumpleanos,
        }));
      return {
        id: m.id,
        nombre: m.nombre,
        color: m.color,
        lideres,
        voluntarios,
        total_voluntarios: voluntarios.length,
      };
    });

    return res.json({ ministerios });
  } catch (err) {
    console.error('[equipos] GET:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
