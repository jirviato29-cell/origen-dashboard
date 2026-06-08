/**
 * Uso: node src/scripts/gen-hash.js "tu_clave_secreta" "Tu Nombre" stewardship
 * Imprime el INSERT listo para pegar en Supabase SQL Editor.
 * Elimina este archivo después de usarlo si quieres.
 */
const bcrypt = require('bcryptjs');

const [,, clave, nombre = 'Admin', rol = 'stewardship'] = process.argv;

if (!clave) {
  console.error('Uso: node src/scripts/gen-hash.js "tu_clave" "Tu Nombre" stewardship');
  process.exit(1);
}

bcrypt.hash(clave, 10).then(hash => {
  console.log('\n--- Copia este INSERT en el SQL Editor de Supabase ---\n');
  console.log(`INSERT INTO usuarios (nombre, rol, clave_hash, activo)`);
  console.log(`VALUES ('${nombre}', '${rol}', '${hash}', true);\n`);
});
