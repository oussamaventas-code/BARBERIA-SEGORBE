-- =====================================================================
-- BARBERÍA SEGORBE · Datos iniciales
--
-- Solo se cargan datos de referencia confirmados. Todo es editable desde
-- el panel (/admin/configuracion y /admin/servicios).
--   * Horario: referencia 10:00–20:30. NO está verificado qué días abre;
--     se carga de lunes a sábado y domingo cerrado como punto de partida
--     y el panel muestra un aviso hasta que el propietario lo confirme
--     (business_settings.hours_verified = false).
--   * Servicios: categorías PROPUESTAS, sin precio ni duración inventados
--     (la web mostrará "Consultar precio").
-- =====================================================================

insert into public.business_settings (id, business_name, phone, whatsapp_phone, address, city, timezone,
  rating, review_count, google_maps_url)
values (1, 'Barbería Segorbe', '643 11 28 58', '34643112858', 'C. Jesús Esteban, 30009 Murcia, España', 'Murcia',
  'Europe/Madrid', 4.8, 60,
  'https://www.google.com/maps/search/?api=1&query=Barber%C3%ADa+Segorbe+C.+Jes%C3%BAs+Esteban+30009+Murcia')
on conflict (id) do nothing;

insert into public.opening_hours (weekday, opening_time, closing_time, is_closed)
select d, '10:00', '20:30', false from generate_series(1, 6) as d
where not exists (select 1 from public.opening_hours);

insert into public.opening_hours (weekday, opening_time, closing_time, is_closed)
select 0, null, null, true
where not exists (select 1 from public.opening_hours where weekday = 0);

insert into public.services (name, description, category, price, duration_minutes, sort_order, active, image_url)
select * from (values
  ('Corte de pelo', 'Un corte pensado para ti: escuchamos lo que buscas y lo adaptamos a tu estilo.', 'Corte', null::numeric, null::integer, 1, true,
   'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80'),
  ('Arreglo de barba', 'Perfilado y acabado de barba con atención al detalle.', 'Barba', null, null, 2, true,
   'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80'),
  ('Corte + barba', 'El servicio completo para salir con la imagen cuidada de principio a fin.', 'Combo', null, null, 3, true,
   'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80'),
  ('Otros servicios', 'Consúltanos cualquier otro servicio que necesites.', 'Otros', null, null, 4, true,
   'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80')
) as v
where not exists (select 1 from public.services);
