-- ============================================================================
--  DanElement Boutique — Datos sintéticos: clientes, ventas y apartados
--  Fecha de generación: 2026-07-20
--
--  Qué crea:
--    · 12 clientes nuevos (notas = 'SEED_DEMO_20260720' para identificarlos)
--    · 40 ventas 'completada' con distintos métodos de pago (Efectivo,
--      T. Débito, T. Crédito, Transferencia y pagos divididos)
--    · 24 apartados en 4 estados:
--         - VENCIDOS      (activo, fecha_limite ya pasó)
--         - POR VENCER    (activo, vence en 1-3 días)
--         - COMPLETADOS   (liquidados, abonado = total)
--         - RECIÉN CREADOS(activo, vence en 7-14 días)
--    · Abonos coherentes con el saldo de cada apartado
--    · Consume inventario de las variantes disponibles:
--         ventas y apartados completados -> baja 'stock'
--         apartados activos               -> sube 'stock_apartado' (reserva)
--
--  Seguridad: resetea las secuencias antes de insertar para no colisionar con
--  los IDs existentes. Todo corre dentro de una transacción.
--
--  Ejecutar:  psql "<DB_URL>" -f backend/scripts/seed_datos_sinteticos.sql
--  Revertir:  ver bloque comentado al final del archivo.
-- ============================================================================

BEGIN;

-- 1) Alinear las secuencias con el MAX(id) actual (evita choques de PK)
SELECT setval(pg_get_serial_sequence('seguridad.personas','id'),          COALESCE((SELECT MAX(id) FROM seguridad.personas), 1));
SELECT setval(pg_get_serial_sequence('ventas.ventas','id'),            COALESCE((SELECT MAX(id) FROM ventas.ventas), 1));
SELECT setval(pg_get_serial_sequence('ventas.detalle_venta','id'),     COALESCE((SELECT MAX(id) FROM ventas.detalle_venta), 1));
SELECT setval(pg_get_serial_sequence('ventas.pagos','id'),             COALESCE((SELECT MAX(id) FROM ventas.pagos), 1));
SELECT setval(pg_get_serial_sequence('ventas.apartados','id'),         COALESCE((SELECT MAX(id) FROM ventas.apartados), 1));
SELECT setval(pg_get_serial_sequence('ventas.detalle_apartado','id'),  COALESCE((SELECT MAX(id) FROM ventas.detalle_apartado), 1));
SELECT setval(pg_get_serial_sequence('ventas.abonos','id'),            COALESCE((SELECT MAX(id) FROM ventas.abonos), 1));

DO $$
DECLARE
  v_vend        INT;
  v_variantes   INT[];
  v_precios     NUMERIC[];
  v_nvar        INT;
  v_clientes    INT[] := '{}';
  v_nombres     TEXT[] := ARRAY[
    'Mariana López Cruz','Roberto Sánchez Díaz','Gabriela Torres Nava','Héctor Ramírez Sol',
    'Paola Jiménez Vega','Andrés Molina Ruiz','Fernanda Castro León','Iván Guerrero Pat',
    'Daniela Ríos Mora','Sergio Peña Luna','Valeria Ortiz Campos','Emilio Vargas Rubio'];
  v_cid         INT;
  v_metodos     TEXT[] := ARRAY['Efectivo','T. Débito','T. Crédito','Transferencia'];

  v_i           INT;
  v_j           INT;
  v_bucket      INT;
  v_nitems      INT;
  v_idx         INT;
  v_var         INT;
  v_precio      NUMERIC;
  v_qty         INT;
  v_total       NUMERIC;
  v_venta_id    INT;
  v_ap_id       INT;
  v_fecha       TIMESTAMP;
  v_creado      TIMESTAMP;
  v_flimite     DATE;
  v_estado      VARCHAR;
  v_ratio       NUMERIC;
  v_abonado     NUMERIC;
  v_p1          NUMERIC;
  v_met         TEXT;
  n_ventas      INT := 0;
  n_apartados   INT := 0;
BEGIN
  -- Vendedor que "atiende" (id 6 = rol_vendedor). Cae a un admin si no existe.
  SELECT id INTO v_vend FROM seguridad.personas WHERE id = 6 AND es_empleado = TRUE;
  IF v_vend IS NULL THEN SELECT MIN(id) INTO v_vend FROM seguridad.personas WHERE es_empleado = TRUE; END IF;

  -- Muestra de variantes disponibles (activas y con stock real)
  SELECT array_agg(id), array_agg(precio) INTO v_variantes, v_precios
  FROM (
    SELECT id, precio FROM inventario.variantes_producto
    WHERE activo = TRUE AND (stock - COALESCE(stock_apartado,0)) >= 3
    ORDER BY random() LIMIT 60
  ) s;
  v_nvar := array_length(v_variantes, 1);
  IF v_nvar IS NULL OR v_nvar = 0 THEN
    RAISE EXCEPTION 'No hay variantes con stock disponible para generar datos.';
  END IF;

  -- 2) Clientes sintéticos
  FOR v_i IN 1..array_length(v_nombres,1) LOOP
    INSERT INTO seguridad.personas (nombre, telefono, email, rfc, notas, creado_en, es_cliente, es_empleado, rol_id)
    VALUES (
      v_nombres[v_i],
      lpad((floor(random()*9000000000)::bigint)::text, 10, '0'),
      'demo_seed_' || v_i || '_' || floor(random()*100000)::int || '@example.com',
      NULL,
      'SEED_DEMO_20260720',
      now() - ((random()*40)::int || ' days')::interval,
      TRUE, FALSE, 4   -- cliente de mostrador: sin credenciales de acceso
    )
    RETURNING id INTO v_cid;
    v_clientes := array_append(v_clientes, v_cid);
  END LOOP;

  -- 3) VENTAS (40) con métodos de pago variados
  FOR v_i IN 1..40 LOOP
    v_fecha := now() - ((random()*30)::int || ' days')::interval - ((random()*10)::int || ' hours')::interval;
    v_nitems := 1 + floor(random()*3)::int;   -- 1..3 artículos
    v_total := 0;

    INSERT INTO ventas.ventas (cliente_id, usuario_id, subtotal, descuento_monto, total, estado, creado_en)
    VALUES (v_clientes[1 + floor(random()*array_length(v_clientes,1))::int], v_vend, 0, 0, 0, 'completada', v_fecha)
    RETURNING id INTO v_venta_id;

    FOR v_j IN 1..v_nitems LOOP
      v_idx    := 1 + floor(random()*v_nvar)::int;
      v_var    := v_variantes[v_idx];
      v_precio := v_precios[v_idx];
      v_qty    := 1 + floor(random()*2)::int;   -- 1..2

      INSERT INTO ventas.detalle_venta (venta_id, variante_id, cantidad, precio_unitario)
      VALUES (v_venta_id, v_var, v_qty, v_precio);

      UPDATE inventario.variantes_producto
        SET stock = GREATEST(stock - v_qty, 0) WHERE id = v_var;

      v_total := v_total + v_precio * v_qty;
    END LOOP;

    UPDATE ventas.ventas SET subtotal = v_total, total = v_total WHERE id = v_venta_id;

    -- Pagos: ~25% divididos (efectivo + tarjeta), resto un solo método
    IF random() < 0.25 THEN
      v_p1 := round((v_total * 0.5)::numeric, 2);
      INSERT INTO ventas.pagos (venta_id, metodo, monto, pagado_en) VALUES (v_venta_id, 'Efectivo', v_p1, v_fecha);
      INSERT INTO ventas.pagos (venta_id, metodo, monto, pagado_en) VALUES (v_venta_id, 'T. Crédito', v_total - v_p1, v_fecha);
    ELSE
      v_met := v_metodos[1 + floor(random()*4)::int];
      INSERT INTO ventas.pagos (venta_id, metodo, monto, pagado_en) VALUES (v_venta_id, v_met, v_total, v_fecha);
    END IF;

    n_ventas := n_ventas + 1;
  END LOOP;

  -- 4) APARTADOS (24 = 6 por estado)
  FOR v_i IN 1..24 LOOP
    v_bucket := v_i % 4;   -- 0 vencido | 1 por vencer | 2 completado | 3 reciente

    IF v_bucket = 0 THEN          -- VENCIDO
      v_creado  := now() - ((15 + random()*10)::int || ' days')::interval;
      v_flimite := CURRENT_DATE - (3 + floor(random()*10))::int;
      v_estado  := 'activo';
      v_ratio   := random() * 0.5;                 -- 0%..50% abonado
    ELSIF v_bucket = 1 THEN       -- POR VENCER
      v_creado  := now() - ((4 + random()*2)::int || ' days')::interval;
      v_flimite := CURRENT_DATE + (1 + floor(random()*3))::int;
      v_estado  := 'activo';
      v_ratio   := 0.3 + random() * 0.4;           -- 30%..70%
    ELSIF v_bucket = 2 THEN       -- COMPLETADO
      v_creado  := now() - ((5 + random()*15)::int || ' days')::interval;
      v_flimite := (v_creado::date) + 7;
      v_estado  := 'completado';
      v_ratio   := 1.0;
    ELSE                          -- RECIÉN CREADO
      v_creado  := now() - ((random()*1)::int || ' days')::interval;
      v_flimite := CURRENT_DATE + (7 + floor(random()*8))::int;
      v_estado  := 'activo';
      v_ratio   := CASE WHEN random() < 0.3 THEN 0 ELSE random() * 0.3 END;
    END IF;

    v_nitems := 1 + floor(random()*2)::int;   -- 1..2 artículos
    v_total := 0;

    INSERT INTO ventas.apartados (cliente_id, usuario_id, total, abonado, estado, fecha_limite, creado_en)
    VALUES (v_clientes[1 + floor(random()*array_length(v_clientes,1))::int], v_vend, 0, 0, v_estado, v_flimite, v_creado)
    RETURNING id INTO v_ap_id;

    FOR v_j IN 1..v_nitems LOOP
      v_idx    := 1 + floor(random()*v_nvar)::int;
      v_var    := v_variantes[v_idx];
      v_precio := v_precios[v_idx];
      v_qty    := 1 + floor(random()*2)::int;

      INSERT INTO ventas.detalle_apartado (apartado_id, variante_id, cantidad, precio_unitario)
      VALUES (v_ap_id, v_var, v_qty, v_precio);

      IF v_estado = 'completado' THEN
        -- Mercancía entregada: sale del stock
        UPDATE inventario.variantes_producto SET stock = GREATEST(stock - v_qty, 0) WHERE id = v_var;
      ELSE
        -- Apartado activo: se reserva
        UPDATE inventario.variantes_producto SET stock_apartado = stock_apartado + v_qty WHERE id = v_var;
      END IF;

      v_total := v_total + v_precio * v_qty;
    END LOOP;

    v_abonado := round((v_total * v_ratio)::numeric, 2);
    IF v_estado = 'completado' THEN v_abonado := v_total; END IF;

    UPDATE ventas.apartados SET total = v_total, abonado = v_abonado WHERE id = v_ap_id;

    -- Abonos coherentes con lo abonado
    IF v_abonado > 0 THEN
      IF v_estado = 'completado' THEN
        v_p1 := round((v_total * 0.4)::numeric, 2);   -- anticipo + liquidación
        INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id, fecha)
        VALUES (v_ap_id, v_p1, v_metodos[1 + floor(random()*4)::int], v_vend, v_creado + interval '1 hour');
        INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id, fecha)
        VALUES (v_ap_id, v_total - v_p1, v_metodos[1 + floor(random()*4)::int], v_vend, v_creado + interval '2 days');
      ELSE
        INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id, fecha)
        VALUES (v_ap_id, v_abonado, v_metodos[1 + floor(random()*4)::int], v_vend, v_creado + interval '1 hour');
      END IF;
    END IF;

    n_apartados := n_apartados + 1;
  END LOOP;

  RAISE NOTICE 'Listo: % clientes, % ventas, % apartados generados.',
    array_length(v_clientes,1), n_ventas, n_apartados;
END $$;

COMMIT;

-- ============================================================================
--  REVERTIR (opcional): elimina SOLO lo generado por este seed.
--  Descomenta y ejecuta si necesitas limpiar.
-- ----------------------------------------------------------------------------
-- BEGIN;
-- WITH cli AS (SELECT id FROM seguridad.personas WHERE notas = 'SEED_DEMO_20260720')
-- DELETE FROM ventas.abonos          WHERE apartado_id IN (SELECT id FROM ventas.apartados WHERE cliente_id IN (SELECT id FROM cli));
-- WITH cli AS (SELECT id FROM seguridad.personas WHERE notas = 'SEED_DEMO_20260720')
-- DELETE FROM ventas.detalle_apartado WHERE apartado_id IN (SELECT id FROM ventas.apartados WHERE cliente_id IN (SELECT id FROM cli));
-- WITH cli AS (SELECT id FROM seguridad.personas WHERE notas = 'SEED_DEMO_20260720')
-- DELETE FROM ventas.apartados       WHERE cliente_id IN (SELECT id FROM cli);
-- WITH cli AS (SELECT id FROM seguridad.personas WHERE notas = 'SEED_DEMO_20260720')
-- DELETE FROM ventas.pagos           WHERE venta_id IN (SELECT id FROM ventas.ventas WHERE cliente_id IN (SELECT id FROM cli));
-- WITH cli AS (SELECT id FROM seguridad.personas WHERE notas = 'SEED_DEMO_20260720')
-- DELETE FROM ventas.detalle_venta   WHERE venta_id IN (SELECT id FROM ventas.ventas WHERE cliente_id IN (SELECT id FROM cli));
-- WITH cli AS (SELECT id FROM seguridad.personas WHERE notas = 'SEED_DEMO_20260720')
-- DELETE FROM ventas.ventas          WHERE cliente_id IN (SELECT id FROM cli);
-- DELETE FROM seguridad.personas        WHERE notas = 'SEED_DEMO_20260720';
-- COMMIT;
-- ============================================================================
