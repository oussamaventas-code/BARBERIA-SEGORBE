-- =====================================================================
-- BARBERÍA SEGORBE · Esquema inicial
-- Web pública + CRM/ERP privado sobre Supabase (PostgreSQL)
--
-- Principios:
--   * Supabase es la única fuente de datos.
--   * Todo lo privado (clientes, citas, pagos, gastos, notas) solo es
--     accesible para usuarios del equipo (tabla staff) mediante RLS.
--   * El visitante anónimo SOLO puede:
--       - leer datos comerciales públicos (negocio, horario, servicios activos)
--       - consultar huecos libres (get_available_slots / get_available_days)
--       - crear una solicitud de reserva (create_booking), de forma atómica.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.appointment_status as enum
    ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'card', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('paid', 'refunded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------

-- Normaliza un teléfono español a formato E.164 sin '+': 34XXXXXXXXX.
-- Acepta "643 11 28 58", "+34 643112858", "0034643112858"...
create or replace function public.normalize_phone(p text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d like '00%' then d := substr(d, 3); end if;
  if length(d) = 9 then d := '34' || d; end if;
  return d;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Equipo (quién puede entrar en el CRM)
-- Un usuario de Supabase Auth NO tiene acceso al panel hasta que se le
-- añade a esta tabla. Así, aunque alguien se registrase, no vería nada.
-- ---------------------------------------------------------------------
create table if not exists public.staff (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Propietario',
  role        text not null default 'owner' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Configuración del negocio (fila única)
-- ---------------------------------------------------------------------
create table if not exists public.business_settings (
  id                    smallint primary key default 1 check (id = 1),
  business_name         text not null default 'Barbería Segorbe',
  tagline               text default 'Estilo, detalle y personalidad.',
  phone                 text not null default '643 11 28 58',
  whatsapp_phone        text not null default '34643112858',
  address               text not null default 'C. Jesús Esteban, 30009 Murcia, España',
  city                  text not null default 'Murcia',
  timezone              text not null default 'Europe/Madrid',
  email                 text,
  google_maps_url       text,
  google_reviews_url    text,
  rating                numeric(2,1) check (rating between 0 and 5),
  review_count          integer check (review_count >= 0),
  -- Reservas
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes between 5 and 120),
  default_duration_minutes integer not null default 30 check (default_duration_minutes between 5 and 480),
  buffer_minutes        integer not null default 0 check (buffer_minutes between 0 and 120),
  min_notice_minutes    integer not null default 120 check (min_notice_minutes between 0 and 10080),
  max_advance_days      integer not null default 60 check (max_advance_days between 1 and 365),
  capacity              integer not null default 1 check (capacity between 1 and 20),
  max_pending_per_phone integer not null default 3 check (max_pending_per_phone between 1 and 20),
  cancel_min_hours      integer not null default 2 check (cancel_min_hours between 0 and 168),
  online_booking_enabled boolean not null default true,
  confirmation_message  text not null default
    'Hemos recibido tu solicitud. Te confirmaremos la cita lo antes posible por teléfono o WhatsApp.',
  hours_verified        boolean not null default false,
  -- Datos legales (los completa el titular)
  legal_owner_name      text,
  legal_tax_id          text,
  legal_email           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists trg_business_settings_updated on public.business_settings;
create trigger trg_business_settings_updated
  before update on public.business_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Horario de apertura (permite varios tramos por día: mañana / tarde)
-- weekday: 0 = domingo ... 6 = sábado (igual que extract(dow) y JS getDay)
-- ---------------------------------------------------------------------
create table if not exists public.opening_hours (
  id            uuid primary key default gen_random_uuid(),
  weekday       smallint not null check (weekday between 0 and 6),
  opening_time  time,
  closing_time  time,
  is_closed     boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint opening_hours_times_chk check (
    is_closed or (opening_time is not null and closing_time is not null and closing_time > opening_time)
  )
);
create index if not exists opening_hours_weekday_idx on public.opening_hours (weekday);

-- ---------------------------------------------------------------------
-- Servicios
-- price / duration_minutes pueden ser NULL: la web mostrará
-- "Consultar precio" / "Duración a consultar" en lugar de inventarlos.
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) between 2 and 80),
  description      text check (description is null or length(description) <= 600),
  category         text check (category is null or length(category) <= 60),
  price            numeric(10,2) check (price is null or price >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 480),
  image_url        text,
  sort_order       integer not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists services_active_idx on public.services (active, sort_order);

drop trigger if exists trg_services_updated on public.services;
create trigger trg_services_updated
  before update on public.services
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(trim(name)) between 2 and 100),
  phone               text not null,
  email               text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notes               text,
  privacy_accepted_at timestamptz,
  marketing_consent   boolean not null default false,
  user_id             uuid unique references auth.users (id) on delete set null,
  access_token        uuid not null default gen_random_uuid(),
  source              text not null default 'admin' check (source in ('admin', 'web')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint customers_phone_format_chk check (phone ~ '^[0-9]{9,15}$')
);
-- Un teléfono = un cliente (evita duplicados)
create unique index if not exists customers_phone_key on public.customers (phone);
create unique index if not exists customers_access_token_key on public.customers (access_token);
create index if not exists customers_name_idx on public.customers (lower(name));

create or replace function public.customers_normalize()
returns trigger
language plpgsql
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  new.name  := trim(new.name);
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  return new;
end;
$$;

drop trigger if exists trg_customers_normalize on public.customers;
create trigger trg_customers_normalize
  before insert or update on public.customers
  for each row execute function public.customers_normalize();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated
  before update on public.customers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Citas
-- appointment_date / start_time / end_time en hora local del negocio.
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  service_id       uuid references public.services (id) on delete restrict,
  appointment_date date not null,
  start_time       time not null,
  end_time         time not null,
  status           public.appointment_status not null default 'pending',
  customer_notes   text check (customer_notes is null or length(customer_notes) <= 500),
  manage_token     uuid not null default gen_random_uuid(),
  internal_notes   text,
  source           text not null default 'admin' check (source in ('admin', 'web')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint appointments_time_chk check (end_time > start_time)
);
create index if not exists appointments_date_idx on public.appointments (appointment_date, start_time);
create index if not exists appointments_customer_idx on public.appointments (customer_id);
create index if not exists appointments_service_idx on public.appointments (service_id);
create index if not exists appointments_status_idx on public.appointments (status);
create unique index if not exists appointments_manage_token_key on public.appointments (manage_token);

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated
  before update on public.appointments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Pagos (ingresos). Un ingreso existe SOLO cuando se registra como cobrado.
-- Se conservan aunque se borre la cita o el cliente (SET NULL).
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete set null,
  customer_id    uuid references public.customers (id) on delete set null,
  service_id     uuid references public.services (id) on delete set null,
  concept        text,
  amount         numeric(10,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'cash',
  payment_date   date not null default (now() at time zone 'Europe/Madrid')::date,
  status         public.payment_status not null default 'paid',
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists payments_date_idx on public.payments (payment_date);
create index if not exists payments_customer_idx on public.payments (customer_id);
create index if not exists payments_appointment_idx on public.payments (appointment_id);
-- Evita cobrar dos veces la misma cita
create unique index if not exists payments_one_paid_per_appointment
  on public.payments (appointment_id) where appointment_id is not null and status = 'paid';

-- ---------------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  concept      text not null check (length(trim(concept)) between 2 and 120),
  category     text not null default 'Otros',
  amount       numeric(10,2) not null check (amount > 0),
  expense_date date not null default (now() at time zone 'Europe/Madrid')::date,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses (expense_date);

-- ---------------------------------------------------------------------
-- Bloqueos de agenda (descansos, vacaciones, festivos, días especiales)
-- ---------------------------------------------------------------------
create table if not exists public.blocked_slots (
  id             uuid primary key default gen_random_uuid(),
  start_datetime timestamptz not null,
  end_datetime   timestamptz not null,
  reason         text,
  created_at     timestamptz not null default now(),
  constraint blocked_slots_range_chk check (end_datetime > start_datetime)
);
create index if not exists blocked_slots_range_idx on public.blocked_slots (start_datetime, end_datetime);

-- =====================================================================
-- Integridad de agenda: impide citas incompatibles SIEMPRE
-- (tanto si vienen de la web como del panel).
-- =====================================================================
create or replace function public.appointments_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s          public.business_settings;
  v_overlap  integer;
  v_start_ts timestamptz;
  v_end_ts   timestamptz;
begin
  -- Solo las citas activas ocupan agenda
  if new.status not in ('pending', 'confirmed', 'completed') then
    return new;
  end if;

  -- En UPDATE, si no cambia nada relevante, no revalidamos
  if tg_op = 'UPDATE'
     and old.appointment_date = new.appointment_date
     and old.start_time = new.start_time
     and old.end_time = new.end_time
     and old.status in ('pending', 'confirmed', 'completed') then
    return new;
  end if;

  select * into s from public.business_settings where id = 1;
  if not found then
    raise exception 'Falta la configuración del negocio' using errcode = 'P0001';
  end if;

  -- Serializa todas las escrituras del mismo día: sin condiciones de carrera.
  perform pg_advisory_xact_lock(hashtext('segorbe-agenda'), (new.appointment_date - date '2000-01-01'));

  select count(*) into v_overlap
  from public.appointments a
  where a.appointment_date = new.appointment_date
    and a.id <> new.id
    and a.status in ('pending', 'confirmed', 'completed')
    and a.start_time < (new.end_time + make_interval(mins => s.buffer_minutes))
    and (a.end_time + make_interval(mins => s.buffer_minutes)) > new.start_time;

  if v_overlap >= s.capacity then
    raise exception 'SLOT_TAKEN: Ese horario ya está ocupado' using errcode = 'P0001';
  end if;

  v_start_ts := (new.appointment_date + new.start_time) at time zone s.timezone;
  v_end_ts   := (new.appointment_date + new.end_time) at time zone s.timezone;

  if exists (
    select 1 from public.blocked_slots b
    where b.start_datetime < v_end_ts and b.end_datetime > v_start_ts
  ) then
    raise exception 'SLOT_BLOCKED: Ese horario está bloqueado en la agenda' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appointments_guard on public.appointments;
create trigger trg_appointments_guard
  before insert or update on public.appointments
  for each row execute function public.appointments_guard();

-- =====================================================================
-- Disponibilidad (pública, sin exponer datos personales)
-- =====================================================================
create or replace function public.get_available_slots(p_service_id uuid, p_date date, p_exclude_appointment uuid default null)
returns table (slot_time time)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s          public.business_settings;
  v_duration integer;
  v_now      timestamp;           -- "ahora" en hora local del negocio
  v_dow      smallint;
  r          record;
  v_t        time;
  v_end      time;
  v_overlap  integer;
begin
  select * into s from public.business_settings where id = 1;
  if not found or not s.online_booking_enabled then return; end if;

  select coalesce(sv.duration_minutes, s.default_duration_minutes) into v_duration
  from public.services sv where sv.id = p_service_id and sv.active;
  if v_duration is null then return; end if;

  v_now := now() at time zone s.timezone;
  if p_date < v_now::date or p_date > (v_now::date + s.max_advance_days) then return; end if;

  v_dow := extract(dow from p_date)::smallint;

  for r in
    select oh.opening_time, oh.closing_time
    from public.opening_hours oh
    where oh.weekday = v_dow and not oh.is_closed
      and not exists (select 1 from public.opening_hours c where c.weekday = v_dow and c.is_closed)
    order by oh.opening_time
  loop
    v_t := r.opening_time;
    while v_t + make_interval(mins => v_duration) <= r.closing_time
          and v_t + make_interval(mins => v_duration) > v_t   -- evita desbordar medianoche
    loop
      v_end := v_t + make_interval(mins => v_duration);

      if (p_date + v_t) >= v_now + make_interval(mins => s.min_notice_minutes) then
        select count(*) into v_overlap
        from public.appointments a
        where a.appointment_date = p_date
          and a.id is distinct from p_exclude_appointment
          and a.status in ('pending', 'confirmed', 'completed')
          and a.start_time < (v_end + make_interval(mins => s.buffer_minutes))
          and (a.end_time + make_interval(mins => s.buffer_minutes)) > v_t;

        if v_overlap < s.capacity and not exists (
          select 1 from public.blocked_slots b
          where b.start_datetime < ((p_date + v_end) at time zone s.timezone)
            and b.end_datetime   > ((p_date + v_t)   at time zone s.timezone)
        ) then
          slot_time := v_t;
          return next;
        end if;
      end if;

      v_t := v_t + make_interval(mins => s.slot_interval_minutes);
      exit when v_t <= r.opening_time; -- desbordamiento
    end loop;
  end loop;
end;
$$;

create or replace function public.get_available_days(p_service_id uuid, p_from date, p_to date, p_exclude_appointment uuid default null)
returns table (day date, slots integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d date;
begin
  if p_to < p_from or p_to - p_from > 62 then
    raise exception 'Rango de fechas no válido' using errcode = '22023';
  end if;
  d := p_from;
  while d <= p_to loop
    day := d;
    select count(*)::integer into slots from public.get_available_slots(p_service_id, d, p_exclude_appointment);
    return next;
    d := d + 1;
  end loop;
end;
$$;

-- =====================================================================
-- Creación pública de reservas (atómica)
-- =====================================================================
create or replace function public.create_booking(
  p_service_id       uuid,
  p_date             date,
  p_start_time       time,
  p_name             text,
  p_phone            text,
  p_email            text default null,
  p_notes            text default null,
  p_privacy_accepted boolean default false,
  p_tokens           uuid[] default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s            public.business_settings;
  v_service    public.services;
  v_duration   integer;
  v_phone      text;
  v_customer   uuid;
  v_end        time;
  v_pending    integer;
  v_appt       uuid;
  v_token      uuid;
  v_email      text;
  v_new        boolean := false;
  v_verified   boolean := false;
  v_ctoken     uuid;
begin
  if not coalesce(p_privacy_accepted, false) then
    raise exception 'PRIVACY_REQUIRED: Debes aceptar la política de privacidad' using errcode = 'P0001';
  end if;

  if p_name is null or length(trim(p_name)) < 2 or length(trim(p_name)) > 100 then
    raise exception 'INVALID_NAME: Indica tu nombre' using errcode = 'P0001';
  end if;

  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or v_phone !~ '^[0-9]{9,15}$' then
    raise exception 'INVALID_PHONE: El teléfono no es válido' using errcode = 'P0001';
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL: El email no es válido' using errcode = 'P0001';
  end if;

  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'INVALID_NOTES: Las notas son demasiado largas' using errcode = 'P0001';
  end if;

  select * into s from public.business_settings where id = 1;
  if not found or not s.online_booking_enabled then
    raise exception 'BOOKING_DISABLED: La reserva online no está disponible' using errcode = 'P0001';
  end if;

  select * into v_service from public.services where id = p_service_id and active;
  if not found then
    raise exception 'INVALID_SERVICE: El servicio no está disponible' using errcode = 'P0001';
  end if;
  v_duration := coalesce(v_service.duration_minutes, s.default_duration_minutes);
  v_end := p_start_time + make_interval(mins => v_duration);

  -- Bloqueo del día ANTES de comprobar disponibilidad → atómico
  perform pg_advisory_xact_lock(hashtext('segorbe-agenda'), (p_date - date '2000-01-01'));

  -- El hueco debe estar entre los disponibles (horario, cierres, bloqueos,
  -- antelación mínima, máximo de días, capacidad y margen entre citas)
  if not exists (select 1 from public.get_available_slots(p_service_id, p_date) g where g.slot_time = p_start_time) then
    raise exception 'SLOT_TAKEN: Ese horario ya no está disponible' using errcode = 'P0001';
  end if;

  -- Identidad: 1) cuenta iniciada, 2) token de este dispositivo (ya reservó antes),
  -- 3) invitado: se enlaza por teléfono. Solo en 1) y 2) hay prueba de quién es,
  -- y solo entonces (o si es un cliente nuevo) se devuelve el token del dispositivo.
  if auth.uid() is not null then
    select id into v_customer from public.customers where user_id = auth.uid();
  end if;
  if v_customer is null and p_tokens is not null then
    select c.id into v_customer from public.customers c where c.access_token = any (p_tokens) limit 1;
  end if;
  if v_customer is not null then
    v_verified := true;
  else
    select id into v_customer from public.customers where phone = v_phone;
    if v_customer is null then
      insert into public.customers (name, phone, email, privacy_accepted_at, source)
      values (trim(p_name), v_phone, v_email, now(), 'web')
      returning id into v_customer;
      v_new := true;
    else
      update public.customers
         set email = coalesce(email, v_email),
             privacy_accepted_at = coalesce(privacy_accepted_at, now())
       where id = v_customer;
    end if;
  end if;
  if v_new or v_verified then
    select access_token into v_ctoken from public.customers where id = v_customer;
  end if;

  -- Antiabuso: límite de solicitudes pendientes futuras por teléfono
  select count(*) into v_pending
  from public.appointments a
  where a.customer_id = v_customer
    and a.status = 'pending'
    and a.appointment_date >= (now() at time zone s.timezone)::date;
  if v_pending >= s.max_pending_per_phone then
    raise exception 'TOO_MANY_PENDING: Ya tienes solicitudes pendientes. Contacta con la barbería' using errcode = 'P0001';
  end if;

  -- Misma persona, mismo día y hora → duplicado
  if exists (
    select 1 from public.appointments a
    where a.customer_id = v_customer and a.appointment_date = p_date
      and a.start_time = p_start_time and a.status in ('pending', 'confirmed')
  ) then
    raise exception 'DUPLICATE: Ya existe una solicitud para ese horario' using errcode = 'P0001';
  end if;

  insert into public.appointments
    (customer_id, service_id, appointment_date, start_time, end_time, status, customer_notes, source)
  values
    (v_customer, p_service_id, p_date, p_start_time, v_end, 'pending', nullif(trim(coalesce(p_notes, '')), ''), 'web')
  returning id, manage_token into v_appt, v_token;

  return jsonb_build_object(
    'appointment_id', v_appt,
    'manage_token', v_token,
    'customer_token', v_ctoken,
    'status', 'pending',
    'date', p_date,
    'start_time', to_char(p_start_time, 'HH24:MI'),
    'end_time', to_char(v_end, 'HH24:MI'),
    'service_name', v_service.name,
    'message', s.confirmation_message
  );
end;
$$;

-- =====================================================================
-- Identidad del cliente y autogestión de citas
--
-- Un cliente es reconocido por:
--   * su cuenta (Supabase Auth)  → customers.user_id
--   * el token de su dispositivo → customers.access_token (se guarda en el
--     navegador tras reservar; "invitado recurrente")
--   * el token de una cita concreta → appointments.manage_token
-- Con cualquiera de ellos puede ver, cambiar y cancelar SUS citas y nada más.
-- Un teléfono tecleado NO es una prueba de identidad: nunca devuelve datos.
-- =====================================================================
create or replace function public._authorized_appointments(p_tokens uuid[])
returns setof public.appointments
language sql
stable
security definer
set search_path = public
as $$
  select a.*
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  where a.manage_token = any (coalesce(p_tokens, '{}'::uuid[]))
     or c.access_token = any (coalesce(p_tokens, '{}'::uuid[]))
     or (auth.uid() is not null and c.user_id = auth.uid());
$$;

create or replace function public.my_bookings(p_tokens uuid[] default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s          public.business_settings;
  c          public.customers;
  v_visits   integer;
  v_customer jsonb := null;
  v_bookings jsonb;
begin
  select * into s from public.business_settings where id = 1;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'date', a.appointment_date,
      'start_time', to_char(a.start_time, 'HH24:MI'),
      'end_time', to_char(a.end_time, 'HH24:MI'),
      'service_id', a.service_id,
      'service_name', sv.name,
      'can_modify', a.status in ('pending', 'confirmed')
                    and ((a.appointment_date + a.start_time) at time zone s.timezone)
                        >= now() + make_interval(hours => s.cancel_min_hours)
    ) order by a.appointment_date desc, a.start_time desc), '[]'::jsonb)
  into v_bookings
  from (select * from public._authorized_appointments(p_tokens)
        order by appointment_date desc, start_time desc limit 30) a
  left join public.services sv on sv.id = a.service_id;

  select * into c from public.customers
   where access_token = any (coalesce(p_tokens, '{}'::uuid[]))
      or (auth.uid() is not null and user_id = auth.uid())
   limit 1;
  if found then
    select count(*) into v_visits from public.appointments where customer_id = c.id and status = 'completed';
    v_customer := jsonb_build_object(
      'name', c.name, 'phone', c.phone, 'email', c.email,
      'visits', v_visits, 'regular', v_visits >= 3, 'has_account', c.user_id is not null);
  end if;

  return jsonb_build_object('customer', v_customer, 'bookings', v_bookings, 'cancel_min_hours', s.cancel_min_hours);
end;
$$;

create or replace function public.cancel_booking(p_appointment_id uuid, p_tokens uuid[] default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s public.business_settings;
  a public.appointments;
begin
  select * into s from public.business_settings where id = 1;
  select * into a from public._authorized_appointments(p_tokens) x where x.id = p_appointment_id;
  if not found then raise exception 'NOT_FOUND: No encontramos esa cita' using errcode = 'P0001'; end if;
  if a.status not in ('pending', 'confirmed')
     or ((a.appointment_date + a.start_time) at time zone s.timezone) < now() + make_interval(hours => s.cancel_min_hours) then
    raise exception 'CANNOT_MODIFY: Esta cita ya no se puede cancelar online. Llámanos' using errcode = 'P0001';
  end if;
  update public.appointments set status = 'cancelled' where id = a.id;
  return public.my_bookings(p_tokens);
end;
$$;

create or replace function public.reschedule_booking(p_appointment_id uuid, p_date date, p_start_time time, p_tokens uuid[] default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s public.business_settings;
  a public.appointments;
begin
  select * into s from public.business_settings where id = 1;
  select * into a from public._authorized_appointments(p_tokens) x where x.id = p_appointment_id;
  if not found then raise exception 'NOT_FOUND: No encontramos esa cita' using errcode = 'P0001'; end if;
  if a.status not in ('pending', 'confirmed') or a.service_id is null
     or ((a.appointment_date + a.start_time) at time zone s.timezone) < now() + make_interval(hours => s.cancel_min_hours) then
    raise exception 'CANNOT_MODIFY: Esta cita ya no se puede cambiar online. Llámanos' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('segorbe-agenda'), (p_date - date '2000-01-01'));
  if not exists (select 1 from public.get_available_slots(a.service_id, p_date, a.id) g where g.slot_time = p_start_time) then
    raise exception 'SLOT_TAKEN: Ese horario ya no está disponible' using errcode = 'P0001';
  end if;

  -- Un cambio vuelve a necesitar la confirmación de la barbería
  update public.appointments
     set appointment_date = p_date, start_time = p_start_time,
         end_time = p_start_time + (a.end_time - a.start_time), status = 'pending'
   where id = a.id;
  return public.my_bookings(p_tokens);
end;
$$;

-- Crear / vincular la cuenta de un cliente (requiere haber iniciado sesión).
-- Vincula el historial solo con PRUEBA (token de dispositivo o de cita).
-- Sin prueba y con un teléfono que ya tiene historial → se rechaza.
create or replace function public.claim_customer(
  p_name text, p_phone text, p_privacy_accepted boolean, p_tokens uuid[] default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_c     public.customers;
  v_phone text := public.normalize_phone(p_phone);
begin
  if v_uid is null then
    raise exception 'NOT_AUTH: Inicia sesión para continuar' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.customers where user_id = v_uid) then
    return public.my_bookings(p_tokens);
  end if;

  select c.* into v_c from public.customers c
   where c.user_id is null
     and (c.access_token = any (coalesce(p_tokens, '{}'::uuid[]))
          or c.id in (select customer_id from public.appointments where manage_token = any (coalesce(p_tokens, '{}'::uuid[]))))
   limit 1;

  if found then
    update public.customers set user_id = v_uid where id = v_c.id;
  else
    if not coalesce(p_privacy_accepted, false) then
      raise exception 'PRIVACY_REQUIRED: Debes aceptar la política de privacidad' using errcode = 'P0001';
    end if;
    if p_name is null or length(trim(p_name)) < 2 then
      raise exception 'INVALID_NAME: Indica tu nombre' using errcode = 'P0001';
    end if;
    if v_phone is null or v_phone !~ '^[0-9]{9,15}$' then
      raise exception 'INVALID_PHONE: El teléfono no es válido' using errcode = 'P0001';
    end if;

    select * into v_c from public.customers where phone = v_phone;
    if found then
      if v_c.user_id is not null or exists (select 1 from public.appointments where customer_id = v_c.id) then
        raise exception 'PHONE_IN_USE: Ese teléfono ya tiene historial en la barbería. Entra desde el móvil donde reservaste o llámanos para vincularlo' using errcode = 'P0001';
      end if;
      update public.customers set user_id = v_uid, name = trim(p_name),
             privacy_accepted_at = coalesce(privacy_accepted_at, now()) where id = v_c.id;
    else
      insert into public.customers (name, phone, privacy_accepted_at, source, user_id)
      values (trim(p_name), v_phone, now(), 'web', v_uid);
    end if;
  end if;

  return public.my_bookings(p_tokens);
end;
$$;

-- =====================================================================
-- Vista de estadísticas de cliente (respeta RLS del que consulta)
-- Total gastado = SOLO pagos registrados como cobrados.
-- =====================================================================
create or replace view public.customer_stats
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.phone,
  c.email,
  c.notes,
  c.created_at,
  c.marketing_consent,
  c.source,
  (select count(*) from public.appointments a where a.customer_id = c.id and a.status = 'completed')::integer as visits,
  (select max(a.appointment_date) from public.appointments a where a.customer_id = c.id and a.status = 'completed') as last_visit,
  (select a.appointment_date from public.appointments a
     where a.customer_id = c.id and a.status in ('pending', 'confirmed')
       and a.appointment_date >= (now() at time zone 'Europe/Madrid')::date
     order by a.appointment_date, a.start_time limit 1) as next_appointment,
  (c.user_id is not null) as has_account,
  ((select count(*) from public.appointments a where a.customer_id = c.id and a.status = 'completed') >= 3) as regular,
  coalesce((select sum(p.amount) from public.payments p where p.customer_id = c.id and p.status = 'paid'), 0)::numeric(10,2) as total_spent
from public.customers c;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.staff             enable row level security;
alter table public.business_settings enable row level security;
alter table public.opening_hours     enable row level security;
alter table public.services          enable row level security;
alter table public.customers         enable row level security;
alter table public.appointments      enable row level security;
alter table public.payments          enable row level security;
alter table public.expenses          enable row level security;
alter table public.blocked_slots     enable row level security;

-- staff: cada usuario ve su propia fila (para saber si es del equipo)
drop policy if exists staff_self_read on public.staff;
create policy staff_self_read on public.staff
  for select to authenticated using (user_id = auth.uid());

-- Datos comerciales: lectura pública
drop policy if exists settings_public_read on public.business_settings;
create policy settings_public_read on public.business_settings
  for select to anon, authenticated using (true);
drop policy if exists settings_staff_write on public.business_settings;
create policy settings_staff_write on public.business_settings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists hours_public_read on public.opening_hours;
create policy hours_public_read on public.opening_hours
  for select to anon, authenticated using (true);
drop policy if exists hours_staff_all on public.opening_hours;
create policy hours_staff_all on public.opening_hours
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated using (active or public.is_staff());
drop policy if exists services_staff_all on public.services;
create policy services_staff_all on public.services
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Datos privados: solo equipo
drop policy if exists customers_staff_all on public.customers;
create policy customers_staff_all on public.customers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists appointments_staff_all on public.appointments;
create policy appointments_staff_all on public.appointments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists payments_staff_all on public.payments;
create policy payments_staff_all on public.payments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists expenses_staff_all on public.expenses;
create policy expenses_staff_all on public.expenses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists blocked_staff_all on public.blocked_slots;
create policy blocked_staff_all on public.blocked_slots
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- Permisos de tabla (defensa en profundidad además de RLS)
-- =====================================================================
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;

grant select on public.business_settings, public.opening_hours, public.services to anon;
grant select, insert, update, delete on
  public.business_settings, public.opening_hours, public.services, public.customers,
  public.appointments, public.payments, public.expenses, public.blocked_slots
  to authenticated;
grant select on public.staff, public.customer_stats to authenticated;

grant execute on function public.get_available_slots(uuid, date, uuid) to anon, authenticated;
grant execute on function public.get_available_days(uuid, date, date, uuid) to anon, authenticated;
grant execute on function public.my_bookings(uuid[]) to anon, authenticated;
grant execute on function public.cancel_booking(uuid, uuid[]) to anon, authenticated;
grant execute on function public.claim_customer(text, text, boolean, uuid[]) to authenticated;
grant execute on function public.reschedule_booking(uuid, date, time, uuid[]) to anon, authenticated;
grant execute on function public.create_booking(uuid, date, time, text, text, text, text, boolean, uuid[]) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.normalize_phone(text) to authenticated;
