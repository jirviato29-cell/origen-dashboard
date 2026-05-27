const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/dashboard/resumen?year=2026&month=5
router.get('/resumen', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;

    const [ingresosMes, gastosMes, ingresosAnio, gastosAnio] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(monto),0) AS total FROM ingresos
         WHERE EXTRACT(YEAR FROM fecha)=$1 AND EXTRACT(MONTH FROM fecha)=$2`,
        [y, m]
      ),
      pool.query(
        `SELECT COALESCE(SUM(monto),0) AS total FROM gastos
         WHERE EXTRACT(YEAR FROM fecha)=$1 AND EXTRACT(MONTH FROM fecha)=$2`,
        [y, m]
      ),
      pool.query(
        `SELECT COALESCE(SUM(monto),0) AS total FROM ingresos
         WHERE EXTRACT(YEAR FROM fecha)=$1`,
        [y]
      ),
      pool.query(
        `SELECT COALESCE(SUM(monto),0) AS total FROM gastos
         WHERE EXTRACT(YEAR FROM fecha)=$1`,
        [y]
      ),
    ]);

    const totalIngresosMes = parseFloat(ingresosMes.rows[0].total);
    const totalGastosMes = parseFloat(gastosMes.rows[0].total);
    const totalIngresosAnio = parseFloat(ingresosAnio.rows[0].total);
    const totalGastosAnio = parseFloat(gastosAnio.rows[0].total);

    res.json({
      mes: { ingresos: totalIngresosMes, gastos: totalGastosMes, balance: totalIngresosMes - totalGastosMes },
      anio: { ingresos: totalIngresosAnio, gastos: totalGastosAnio, balance: totalIngresosAnio - totalGastosAnio },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/mensual?year=2026
router.get('/mensual', async (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();

    const meses = Array.from({ length: 12 }, (_, i) => i + 1);

    const [ingRows, gasRows] = await Promise.all([
      pool.query(
        `SELECT EXTRACT(MONTH FROM fecha)::INT AS mes, SUM(monto) AS total
         FROM ingresos WHERE EXTRACT(YEAR FROM fecha)=$1
         GROUP BY mes ORDER BY mes`,
        [y]
      ),
      pool.query(
        `SELECT EXTRACT(MONTH FROM fecha)::INT AS mes, SUM(monto) AS total
         FROM gastos WHERE EXTRACT(YEAR FROM fecha)=$1
         GROUP BY mes ORDER BY mes`,
        [y]
      ),
    ]);

    const ingMap = Object.fromEntries(ingRows.rows.map(r => [r.mes, parseFloat(r.total)]));
    const gasMap = Object.fromEntries(gasRows.rows.map(r => [r.mes, parseFloat(r.total)]));

    const data = meses.map(mes => ({
      mes,
      ingresos: ingMap[mes] || 0,
      gastos: gasMap[mes] || 0,
      balance: (ingMap[mes] || 0) - (gasMap[mes] || 0),
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
