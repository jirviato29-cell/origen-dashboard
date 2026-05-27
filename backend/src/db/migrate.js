const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto'))
      );

      CREATE TABLE IF NOT EXISTS ingresos (
        id SERIAL PRIMARY KEY,
        concepto TEXT NOT NULL,
        monto DECIMAL(12,2) NOT NULL,
        fecha DATE NOT NULL,
        notas TEXT
      );

      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        concepto TEXT NOT NULL,
        monto DECIMAL(12,2) NOT NULL,
        fecha DATE NOT NULL,
        categoria_id INT REFERENCES categorias(id),
        notas TEXT
      );

      CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        fecha DATE NOT NULL,
        tipo TEXT
      );

      CREATE TABLE IF NOT EXISTS asistencia (
        id SERIAL PRIMARY KEY,
        evento_id INT REFERENCES eventos(id),
        adultos INT DEFAULT 0,
        ninos INT DEFAULT 0,
        bebes INT DEFAULT 0
      );
    `);

    // Seed categorías base
    const { rows } = await client.query('SELECT COUNT(*) FROM categorias');
    if (parseInt(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO categorias (nombre, tipo) VALUES
          ('Diezmos', 'ingreso'),
          ('Ofrendas', 'ingreso'),
          ('Donaciones', 'ingreso'),
          ('Servicios', 'gasto'),
          ('Renta', 'gasto'),
          ('Equipamiento', 'gasto'),
          ('Ministerios', 'gasto'),
          ('Otros', 'gasto');
      `);
    }

    console.log('Migración completada.');
  } finally {
    client.release();
  }
}

migrate().catch(console.error).finally(() => pool.end());
