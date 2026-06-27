// Script para crear el primer usuario en la base de datos.
// Uso:  node src/scripts/crear-usuario.js
// Requiere que DATABASE_URL esté en el .env del backend.

require('dotenv').config();
const readline = require('readline');
const bcrypt   = require('bcryptjs');
const pool     = require('../db/pool');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const ROLES_VALIDOS = ['stewardship', 'anfitriones', 'punto_encuentro', 'pastor', 'administracion'];

async function main() {
  console.log('\n── Crear usuario en Origen Dashboard ──\n');

  const nombre = (await ask('Nombre del usuario: ')).trim();
  if (!nombre) { console.error('El nombre no puede estar vacío.'); process.exit(1); }

  const rol = (await ask(`Rol (${ROLES_VALIDOS.join(' | ')}): `)).trim();
  if (!ROLES_VALIDOS.includes(rol)) {
    console.error(`Rol inválido. Usa uno de: ${ROLES_VALIDOS.join(', ')}`);
    process.exit(1);
  }

  const clave = (await ask('Clave (no se mostrará): ')).trim();
  if (clave.length < 4) { console.error('La clave debe tener al menos 4 caracteres.'); process.exit(1); }

  rl.close();

  const clave_hash = await bcrypt.hash(clave, 12);

  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, rol, clave_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, rol, created_at`,
    [nombre, rol, clave_hash]
  );

  console.log('\nUsuario creado exitosamente:');
  console.log(rows[0]);
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
