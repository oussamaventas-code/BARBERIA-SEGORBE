-- =====================================================================
-- BARBERÍA SEGORBE · Esquema Cloudflare D1 (SQLite)
--
-- La base de datos NO es accesible desde el navegador: solo el Worker
-- (binding DB) la consulta, y lo hace tras comprobar sesión y permisos.
-- La integridad de la agenda vive aquí, en triggers, para que proteja
-- cualquier vía de escritura (web pública, panel o futuras integraciones).
-- Fechas 'YYYY-MM-DD' y horas 'HH:MM' en hora local del negocio.
-- =====================================================================

CREATE TABLE business_settings (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  business_name            TEXT NOT NULL DEFAULT 'Barbería Segorbe',
  tagline                  TEXT DEFAULT 'Estilo, detalle y personalidad.',
  phone                    TEXT NOT NULL DEFAULT '643 11 28 58',
  whatsapp_phone           TEXT NOT NULL DEFAULT '34643112858',
  address                  TEXT NOT NULL DEFAULT 'C. Jesús Esteban, 30009 Murcia, España',
  city                     TEXT NOT NULL DEFAULT 'Murcia',
  timezone                 TEXT NOT NULL DEFAULT 'Europe/Madrid',
  email                    TEXT,
  google_maps_url          TEXT,
  google_reviews_url       TEXT,
  rating                   REAL CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  review_count             INTEGER CHECK (review_count IS NULL OR review_count >= 0),
  slot_interval_minutes    INTEGER NOT NULL DEFAULT 15 CHECK (slot_interval_minutes BETWEEN 5 AND 120),
  default_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (default_duration_minutes BETWEEN 5 AND 480),
  buffer_minutes           INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes BETWEEN 0 AND 120),
  min_notice_minutes       INTEGER NOT NULL DEFAULT 120 CHECK (min_notice_minutes BETWEEN 0 AND 10080),
  max_advance_days         INTEGER NOT NULL DEFAULT 60 CHECK (max_advance_days BETWEEN 1 AND 365),
  capacity                 INTEGER NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 20),
  max_pending_per_phone    INTEGER NOT NULL DEFAULT 3 CHECK (max_pending_per_phone BETWEEN 1 AND 20),
  cancel_min_hours         INTEGER NOT NULL DEFAULT 2 CHECK (cancel_min_hours BETWEEN 0 AND 168),
  online_booking_enabled   INTEGER NOT NULL DEFAULT 1 CHECK (online_booking_enabled IN (0, 1)),
  confirmation_message     TEXT NOT NULL DEFAULT 'Hemos recibido tu solicitud. Te confirmaremos la cita lo antes posible por teléfono o WhatsApp.',
  hours_verified           INTEGER NOT NULL DEFAULT 0 CHECK (hours_verified IN (0, 1)),
  legal_owner_name         TEXT,
  legal_tax_id             TEXT,
  legal_email              TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- weekday: 0 = domingo … 6 = sábado. Varios tramos por día permitidos.
CREATE TABLE opening_hours (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  weekday      INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opening_time TEXT CHECK (opening_time IS NULL OR opening_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  closing_time TEXT CHECK (closing_time IS NULL OR closing_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  is_closed    INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
  CHECK (is_closed = 1 OR (opening_time IS NOT NULL AND closing_time IS NOT NULL AND closing_time > opening_time))
);
CREATE INDEX opening_hours_weekday_idx ON opening_hours (weekday);

-- price / duration_minutes NULL = «Consultar precio» / duración por defecto
CREATE TABLE services (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name             TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  description      TEXT CHECK (description IS NULL OR length(description) <= 600),
  category         TEXT CHECK (category IS NULL OR length(category) <= 60),
  price            REAL CHECK (price IS NULL OR price >= 0),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 480),
  image_url        TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX services_active_idx ON services (active, sort_order);

-- Cuentas de acceso (clientes con cuenta y personal del panel)
CREATE TABLE users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'customer' CHECK (kind IN ('customer', 'staff')),
  display_name  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- Limitación de intentos (login, etc.)
CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  hits         INTEGER NOT NULL
);

-- Un teléfono = un cliente. access_token = identidad del dispositivo (invitado recurrente).
CREATE TABLE customers (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name                TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  phone               TEXT NOT NULL UNIQUE CHECK (length(phone) BETWEEN 9 AND 15 AND phone NOT GLOB '*[^0-9]*'),
  email               TEXT,
  notes               TEXT,
  privacy_accepted_at TEXT,
  marketing_consent   INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  user_id             TEXT UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  access_token        TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  source              TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'web')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX customers_name_idx ON customers (lower(name));

-- start_min / end_min = minutos desde las 00:00 (comparaciones sin ambigüedad)
CREATE TABLE appointments (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id      TEXT NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  service_id       TEXT REFERENCES services (id) ON DELETE RESTRICT,
  appointment_date TEXT NOT NULL CHECK (appointment_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  start_time       TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  end_time         TEXT NOT NULL CHECK (end_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  start_min        INTEGER NOT NULL,
  end_min          INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  customer_notes   TEXT CHECK (customer_notes IS NULL OR length(customer_notes) <= 500),
  internal_notes   TEXT,
  manage_token     TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  source           TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'web')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_min > start_min)
);
CREATE INDEX appointments_date_idx ON appointments (appointment_date, start_min);
CREATE INDEX appointments_customer_idx ON appointments (customer_id);
CREATE INDEX appointments_service_idx ON appointments (service_id);
CREATE INDEX appointments_status_idx ON appointments (status);

-- Los ingresos existen SOLO cuando se registra un cobro.
CREATE TABLE payments (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  appointment_id TEXT REFERENCES appointments (id) ON DELETE SET NULL,
  customer_id    TEXT REFERENCES customers (id) ON DELETE SET NULL,
  service_id     TEXT REFERENCES services (id) ON DELETE SET NULL,
  concept        TEXT,
  amount         REAL NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'other')),
  payment_date   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX payments_date_idx ON payments (payment_date);
CREATE INDEX payments_customer_idx ON payments (customer_id);
CREATE UNIQUE INDEX payments_one_paid_per_appointment ON payments (appointment_id)
  WHERE appointment_id IS NOT NULL AND status = 'paid';

CREATE TABLE expenses (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  concept      TEXT NOT NULL CHECK (length(trim(concept)) BETWEEN 2 AND 120),
  category     TEXT NOT NULL DEFAULT 'Otros',
  amount       REAL NOT NULL CHECK (amount > 0),
  expense_date TEXT NOT NULL,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX expenses_date_idx ON expenses (expense_date);

-- Bloqueos en hora local: 'YYYY-MM-DD HH:MM' (se comparan como texto)
CREATE TABLE blocked_slots (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  start_local TEXT NOT NULL CHECK (length(start_local) = 16 AND start_local GLOB '????-??-?? ??:??'),
  end_local   TEXT NOT NULL CHECK (length(end_local) = 16 AND end_local GLOB '????-??-?? ??:??'),
  reason      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_local > start_local)
);
CREATE INDEX blocked_slots_idx ON blocked_slots (start_local, end_local);

-- =====================================================================
-- Integridad de agenda (atómica: se evalúa dentro de la propia sentencia
-- INSERT/UPDATE y D1 serializa las escrituras → imposible el doble hueco)
-- =====================================================================
CREATE TRIGGER appointments_guard_insert
BEFORE INSERT ON appointments
WHEN NEW.status IN ('pending', 'confirmed', 'completed')
BEGIN
  SELECT RAISE(ABORT, 'SLOT_TAKEN: Ese horario ya está ocupado')
  WHERE (
    SELECT count(*) FROM appointments a
    WHERE a.appointment_date = NEW.appointment_date
      AND a.status IN ('pending', 'confirmed', 'completed')
      AND a.start_min < NEW.end_min   + (SELECT buffer_minutes FROM business_settings WHERE id = 1)
      AND a.end_min   + (SELECT buffer_minutes FROM business_settings WHERE id = 1) > NEW.start_min
  ) >= (SELECT capacity FROM business_settings WHERE id = 1);

  SELECT RAISE(ABORT, 'SLOT_BLOCKED: Ese horario está bloqueado en la agenda')
  WHERE EXISTS (
    SELECT 1 FROM blocked_slots b
    WHERE b.start_local < NEW.appointment_date || ' ' || NEW.end_time
      AND b.end_local   > NEW.appointment_date || ' ' || NEW.start_time
  );
END;

CREATE TRIGGER appointments_guard_update
BEFORE UPDATE OF appointment_date, start_min, end_min, status ON appointments
WHEN NEW.status IN ('pending', 'confirmed', 'completed')
 AND (OLD.appointment_date IS NOT NEW.appointment_date OR OLD.start_min IS NOT NEW.start_min
      OR OLD.end_min IS NOT NEW.end_min OR OLD.status NOT IN ('pending', 'confirmed', 'completed'))
BEGIN
  SELECT RAISE(ABORT, 'SLOT_TAKEN: Ese horario ya está ocupado')
  WHERE (
    SELECT count(*) FROM appointments a
    WHERE a.appointment_date = NEW.appointment_date
      AND a.id <> NEW.id
      AND a.status IN ('pending', 'confirmed', 'completed')
      AND a.start_min < NEW.end_min   + (SELECT buffer_minutes FROM business_settings WHERE id = 1)
      AND a.end_min   + (SELECT buffer_minutes FROM business_settings WHERE id = 1) > NEW.start_min
  ) >= (SELECT capacity FROM business_settings WHERE id = 1);

  SELECT RAISE(ABORT, 'SLOT_BLOCKED: Ese horario está bloqueado en la agenda')
  WHERE EXISTS (
    SELECT 1 FROM blocked_slots b
    WHERE b.start_local < NEW.appointment_date || ' ' || NEW.end_time
      AND b.end_local   > NEW.appointment_date || ' ' || NEW.start_time
  );
END;
