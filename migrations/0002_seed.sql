-- Datos iniciales. Solo lo confirmado; todo editable desde el panel.
--  * Horario de referencia 10:00–20:30 (días NO verificados: lunes a sábado como punto de partida).
--  * Servicios: categorías PROPUESTAS, sin precio ni duración inventados («Consultar precio»).
INSERT INTO business_settings (id, rating, review_count, google_maps_url)
VALUES (1, 4.8, 60, 'https://www.google.com/maps/search/?api=1&query=Barber%C3%ADa+Segorbe+C.+Jes%C3%BAs+Esteban+30009+Murcia');

INSERT INTO opening_hours (weekday, opening_time, closing_time, is_closed) VALUES
  (1, '10:00', '20:30', 0), (2, '10:00', '20:30', 0), (3, '10:00', '20:30', 0),
  (4, '10:00', '20:30', 0), (5, '10:00', '20:30', 0), (6, '10:00', '20:30', 0),
  (0, NULL, NULL, 1);

INSERT INTO services (name, description, category, sort_order, image_url) VALUES
  ('Corte de pelo', 'Un corte pensado para ti: escuchamos lo que buscas y lo adaptamos a tu estilo.', 'Corte', 1, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80'),
  ('Arreglo de barba', 'Perfilado y acabado de barba con atención al detalle.', 'Barba', 2, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80'),
  ('Corte + barba', 'El servicio completo para salir con la imagen cuidada de principio a fin.', 'Combo', 3, 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80'),
  ('Otros servicios', 'Consúltanos cualquier otro servicio que necesites.', 'Otros', 4, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80');
