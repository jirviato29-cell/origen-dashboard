const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/dashboard/resumen?year=2026&month=5
router.get('/resumen', async (req, res) => {
  try {
    const y = req.query.year  || new Date().getFullYear();
    const m = req.query.month || new Date().getMonth() + 1;
    const c = req.campus;

    const [ofMes, gasMes, ofAnio, gasAnio, asisMes, asisAnio] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total_ofrenda),0) AS total FROM ofrendas
         WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2 AND EXTRACT(MONTH FROM fecha)=$3`,
        [c, y, m]
      ),
      pool.query(
        `SELECT COALESCE(SUM(monto),0) AS total FROM gastos
         WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2 AND EXTRACT(MONTH FROM fecha)=$3`,
        [c, y, m]
      ),
      pool.query(
        `SELECT COALESCE(SUM(total_ofrenda),0) AS total FROM ofrendas
         WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2`,
        [c, y]
      ),
      pool.query(
        `SELECT COALESCE(SUM(monto),0) AS total FROM gastos
         WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2`,
        [c, y]
      ),
      pool.query(
        `SELECT COALESCE(SUM(total),0) AS total, COALESCE(AVG(total),0) AS promedio
         FROM asistencia
         WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2 AND EXTRACT(MONTH FROM fecha)=$3`,
        [c, y, m]
      ),
      pool.query(
        `SELECT COALESCE(SUM(total),0) AS total, COALESCE(AVG(total),0) AS promedio
         FROM asistencia WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2`,
        [c, y]
      ),
    ]);

    const ingMes  = parseFloat(ofMes.rows[0].total);
    const gasMes_ = parseFloat(gasMes.rows[0].total);
    const ingAnio = parseFloat(ofAnio.rows[0].total);
    const gasAnio_= parseFloat(gasAnio.rows[0].total);

    res.json({
      mes: {
        ingresos:   ingMes,
        gastos:     gasMes_,
        balance:    ingMes - gasMes_,
        asistencia: { total: parseFloat(asisMes.rows[0].total), promedio: parseFloat(asisMes.rows[0].promedio) },
      },
      anio: {
        ingresos:   ingAnio,
        gastos:     gasAnio_,
        balance:    ingAnio - gasAnio_,
        asistencia: { total: parseFloat(asisAnio.rows[0].total), promedio: parseFloat(asisAnio.rows[0].promedio) },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/mensual?year=2026
router.get('/mensual', async (req, res) => {
  try {
    const y = req.query.year || new Date().getFullYear();
    const c = req.campus;

    const [ofRows, gasRows, asisRows] = await Promise.all([
      pool.query(
        `SELECT EXTRACT(MONTH FROM fecha)::INT AS mes, SUM(total_ofrenda) AS total
         FROM ofrendas WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2 GROUP BY mes ORDER BY mes`,
        [c, y]
      ),
      pool.query(
        `SELECT EXTRACT(MONTH FROM fecha)::INT AS mes, SUM(monto) AS total
         FROM gastos WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2 GROUP BY mes ORDER BY mes`,
        [c, y]
      ),
      pool.query(
        `SELECT EXTRACT(MONTH FROM fecha)::INT AS mes,
                SUM(total) AS total_asistencia,
                ROUND(AVG(total),1) AS promedio_asistencia
         FROM asistencia WHERE campus=$1 AND EXTRACT(YEAR FROM fecha)=$2 GROUP BY mes ORDER BY mes`,
        [c, y]
      ),
    ]);

    const ofMap   = Object.fromEntries(ofRows.rows.map(r  => [r.mes, parseFloat(r.total)]));
    const gasMap  = Object.fromEntries(gasRows.rows.map(r => [r.mes, parseFloat(r.total)]));
    const asisMap = Object.fromEntries(asisRows.rows.map(r => [r.mes, {
      total:    parseFloat(r.total_asistencia),
      promedio: parseFloat(r.promedio_asistencia),
    }]));

    const data = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      return {
        mes,
        ingresos:   ofMap[mes]  || 0,
        gastos:     gasMap[mes] || 0,
        balance:    (ofMap[mes] || 0) - (gasMap[mes] || 0),
        asistencia: asisMap[mes] || { total: 0, promedio: 0 },
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
