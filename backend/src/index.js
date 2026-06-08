require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');

const authRouter          = require('./routes/auth');
const usuariosRouter      = require('./routes/usuarios');
const voluntariosRouter   = require('./routes/voluntarios');
const ingresosRouter      = require('./routes/ingresos');
const gastosRouter        = require('./routes/gastos');
const categoriasRouter    = require('./routes/categorias');
const dashboardRouter     = require('./routes/dashboard');
const asistenciaRouter    = require('./routes/asistencia');
const ofrendasRouter      = require('./routes/ofrendas');
const eventosRouter       = require('./routes/eventos');
const comprobantesRouter         = require('./routes/comprobantes');
const calendarioRouter           = require('./routes/calendario');
const serviciosDominicalesRouter = require('./routes/serviciosDominicales');
const participantesRouter        = require('./routes/participantes');
const abonosRouter               = require('./routes/abonos');
const cortesRouter               = require('./routes/cortes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Origen Dashboard' }));

app.use('/api', authRouter);
app.use('/api/usuarios',    usuariosRouter);
app.use('/api/voluntarios', voluntariosRouter);


app.use('/api/ingresos',   ingresosRouter);
app.use('/api/gastos',     gastosRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/asistencia', asistenciaRouter);
app.use('/api/ofrendas',   ofrendasRouter);
app.use('/api/eventos',        eventosRouter);
app.use('/api/comprobantes',          comprobantesRouter);
app.use('/api/calendario',           calendarioRouter);
app.use('/api/servicios-dominicales', serviciosDominicalesRouter);
app.use('/api/participantes',         participantesRouter);
app.use('/api/abonos',               abonosRouter);
app.use('/api/cortes',               cortesRouter);

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Origen Dashboard API corriendo en http://localhost:${PORT}`);
});
