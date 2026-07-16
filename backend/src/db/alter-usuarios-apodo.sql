-- ─────────────────────────────────────────────────────────────────────────────
-- usuarios.apodo — identificador de acceso del voluntario
-- ─────────────────────────────────────────────────────────────────────────────
-- Correr manualmente en Supabase. El endpoint POST /api/login-voluntario
-- asume que esta columna YA existe: sin ella el login del voluntario
-- responde 500 (el resto del sistema no se ve afectado).
--
-- El apodo lo asigna el líder al dar de alta al voluntario (paso 3).
-- Es nullable a proposito: los usuarios de staff que ya existen no tienen
-- apodo y deben seguir entrando por rol + clave.
--
-- No es UNIQUE a proposito: puede haber apodos repetidos. El login
-- desambigua con la clave (bcrypt.compare contra cada coincidencia).
--
-- Nota: schema.sql esta desfasado del esquema real (le faltan campus,
-- acceso_global, permisos_extra, voluntario_id y ministerio_id), por eso
-- este ALTER vive aparte y no ahi.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apodo TEXT;

-- El login busca por lower(btrim(apodo)) sobre rol='voluntario' y activo=true.
-- Este indice hace que esa busqueda no escanee la tabla completa.
CREATE INDEX IF NOT EXISTS idx_usuarios_apodo_voluntario
  ON usuarios (lower(btrim(apodo)))
  WHERE rol = 'voluntario' AND activo = true;
