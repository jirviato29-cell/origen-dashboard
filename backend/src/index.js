require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');

const campusMiddleware           = require('./middleware/campus');
const campusRouter               = require('./routes/campus');
const authRouter          = require('./routes/auth');
const authVoluntarioRouter = require('./routes/authVoluntario');
const usuariosRouter      = require('./routes/usuarios');
const voluntariosRouter   = require('./routes/voluntarios');
const liderVoluntariosRouter = require('./routes/liderVoluntarios');
const liderAsignacionesRouter = require('./routes/liderAsignaciones');
const voluntarioDisponibilidadRouter = require('./routes/voluntarioDisponibilidad');
const ingresosRouter      = require('./routes/ingresos');
const gastosRouter        = require('./routes/gastos');
const gastosEventosRouter = require('./routes/gastosEventos');
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
const visitantesRouter           = require('./routes/visitantes');
const ofrendasEspecialesRouter   = require('./routes/ofrendas_especiales');
const tiposEventoRouter          = require('./routes/tiposEvento');
const ministeriosRouter          = require('./routes/ministerios');
const camposPersonalizadosRouter = require('./routes/camposPersonalizados');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Origen Dashboard' }));

// Rutas públicas (sin campus middleware)
app.use('/api', authRouter);
app.use('/api', authVoluntarioRouter);
app.use('/api/campus', campusRouter);

// A partir de aquí todas las peticiones resuelven req.campus
app.use(campusMiddleware);

app.use('/api/usuarios',    usuariosRouter);
app.use('/api/voluntarios', voluntariosRouter);
// Protegido: el router exige token y rol de líder/staff (requireLider).
app.use('/api/lider/voluntarios', liderVoluntariosRouter);
// Protegido: mismo requireLider. Ver/asignar posiciones (PASO 5).
app.use('/api/lider/asignaciones', liderAsignacionesRouter);
// Protegido: el router exige token y rol de voluntario (requireVoluntario).
app.use('/api/voluntario/disponibilidad', voluntarioDisponibilidadRouter);


app.use('/api/ingresos',   ingresosRouter);
app.use('/api/gastos',     gastosRouter);
app.use('/api/gastos-eventos', gastosEventosRouter);
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
app.use('/api/visitantes',              visitantesRouter);
app.use('/api/ofrendas-especiales',    ofrendasEspecialesRouter);
app.use('/api/tipos-evento',           tiposEventoRouter);
app.use('/api/ministerios',            ministeriosRouter);
app.use('/api/campos-personalizados',  camposPersonalizadosRouter);

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Origen Dashboard API corriendo en http://localhost:${PORT}`);
});
