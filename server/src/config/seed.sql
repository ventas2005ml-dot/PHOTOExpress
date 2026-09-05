-- Admin (password: password)
INSERT INTO usuarios (nombre, email, password, rol) VALUES
  ('Administrador', 'admin@photoexpress.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('Empleado Demo', 'empleado@photoexpress.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'empleado')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Fotos', 'Revelado e impresión de fotografías'),
  ('Ampliaciones', 'Ampliaciones en distintos tamaños'),
  ('Productos', 'Productos con foto personalizada'),
  ('Digital', 'Servicios digitales y edición')
ON CONFLICT DO NOTHING;

INSERT INTO servicios (categoria_id, nombre, descripcion, precio) VALUES
  (1, 'Foto 10x15', 'Revelado estándar 10x15 cm', 150),
  (1, 'Foto 13x18', 'Revelado estándar 13x18 cm', 220),
  (1, 'Foto 15x21', 'Revelado estándar 15x21 cm', 290),
  (1, 'Foto 20x30', 'Revelado estándar 20x30 cm', 450),
  (2, 'Ampliación 30x40', 'Ampliación fotográfica 30x40 cm', 850),
  (2, 'Ampliación 40x60', 'Ampliación fotográfica 40x60 cm', 1400),
  (2, 'Ampliación 50x70', 'Ampliación fotográfica 50x70 cm', 2100),
  (3, 'Taza con foto', 'Taza cerámica personalizada con foto', 2500),
  (3, 'Imán 7x10', 'Imán magnético con foto', 600),
  (3, 'Llavero con foto', 'Llavero acrílico con foto', 800),
  (4, 'Retoque básico', 'Corrección de color y brillo', 500),
  (4, 'Restauración foto', 'Restauración de foto dañada o antigua', 2000),
  (4, 'Escaneo 35mm', 'Digitalización de negativo 35mm por rollo', 1800)
ON CONFLICT DO NOTHING;

INSERT INTO configuracion (clave, valor) VALUES
  ('descuento_transferencia', '10'),
  ('descuento_efectivo', '5'),
  ('recargo_mp', '8'),
  ('cbu', '0000000000000000000000'),
  ('alias', 'PHOTO.EXPRESS.LAB'),
  ('titular', 'PhotoExpress SRL'),
  ('link_mp', 'https://mpago.la/xxxxx'),
  ('whatsapp_numero', '5491100000000')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;