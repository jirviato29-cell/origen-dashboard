const express = require('express');
const pool    = require('../db/pool');
// Reusa la MISMA autenticación y contexto del líder que liderVoluntarios: el
// ministerio_id y el campus salen del token/BD, nunca del cliente.
const { requireLider, contextoLider } = require('./liderVoluntarios');

const router = express.Router();
router.use(requireLider);

// GET /api/lider/perfil — datos del ministerio del líder para mostrarlos en su
// panel. Si el líder no tiene ministerio, contextoLider ya responde 400.
router.get('/', async (req, res) => {
  try {
    const ctx = await contextoLider(req, res);
    if (!ctx) return;

    const { rows } = await pool.query(
      'SELECT nombre FROM ministerios WHERE id = $1',
      [ctx.ministerioId]
    );
    return res.json({
      ministerio_id: ctx.ministerioId,
      ministerio_nombre: rows[0]?.nombre ?? null,
      campus: ctx.campus,
    });
  } catch (err) {
    console.error('[lider/perfil] GET:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
