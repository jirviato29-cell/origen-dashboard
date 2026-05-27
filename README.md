# Origen Dashboard — Campus Aguascalientes

Dashboard interno para la gestión administrativa de la iglesia Origen Campus Aguascalientes.

## Stack

- **Frontend:** React + Vite + Tailwind CSS v4 + React Router
- **Backend:** Express.js + PostgreSQL (via `pg`)
- **DB Hosting:** Railway (variable `DATABASE_URL`)

## Estructura

```
origen-dashboard/
├── frontend/   # React + Vite
└── backend/    # Express API
```

## Setup rápido

### 1. Base de datos

Crea la DB en Railway o localmente y copia la `DATABASE_URL`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edita DATABASE_URL en .env
npm install
node src/db/migrate.js   # Crea tablas y seed de categorías
npm run dev              # Puerto 3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # Puerto 5173 (proxy → 3001)
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/ingresos` | Lista ingresos (filtro: `year`, `month`) |
| POST | `/api/ingresos` | Crear ingreso |
| PUT | `/api/ingresos/:id` | Editar ingreso |
| DELETE | `/api/ingresos/:id` | Eliminar ingreso |
| GET | `/api/gastos` | Lista gastos (filtro: `year`, `month`) |
| POST | `/api/gastos` | Crear gasto |
| PUT | `/api/gastos/:id` | Editar gasto |
| DELETE | `/api/gastos/:id` | Eliminar gasto |
| GET | `/api/categorias` | Lista categorías (filtro: `tipo`) |
| GET | `/api/dashboard/resumen` | Totales mes + año |
| GET | `/api/dashboard/mensual` | Resumen enero-diciembre |

## Roles

- **Administración** ← Implementado: ingresos, gastos, dashboard mensual
- **Pastor** — En desarrollo
- **Anfitriones** — En desarrollo
- **Punto de Encuentro** — En desarrollo

## Paleta

- Primario: `#C1644A` (terracota)
- Secundario: `#F0EAD6` (crema)
