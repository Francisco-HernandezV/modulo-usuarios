-- ============================================================================
--  DanElement Boutique — Datos sintéticos MASIVOS (lote grande, aditivo)
--  Fecha: 2026-07-20     Marcador: notas = 'SEED_MASIVO_20260720'
--
--  Genera (configurable abajo):
--    · 120 clientes nuevos
--    · 700 ventas 'completada' con métodos variados (incl. pagos divididos)
--    · 320 apartados repartidos en 4 estados (80 c/u):
--         VENCIDO · POR VENCER · COMPLETADO · RECIÉN CREADO
--    · Abonos coherentes con el saldo
--    · Consume inventario repartido entre TODAS las variantes disponibles
--      (ventas/completados bajan stock; activos reservan stock_apartado)
--
--  Seguro: resetea secuencias, corre en transacción. Reversión al final.
--  Ejecutar:  psql "<DB_URL>" -f backend/scripts/seed_datos_sinteticos_masivo.sql
-- ============================================================================

BEGIN;

SELECT setval(pg_get_serial_sequence('seguridad.personas','id'),          COALESCE((SELECT MAX(id) FROM seguridad.personas), 1));
SELECT setval(pg_get_serial_sequence('ventas.ventas','id'),            COALESCE((SELECT MAX(id) FROM ventas.ventas), 1));
SELECT setval(pg_get_serial_sequence('ventas.detalle_venta','id'),     COALESCE((SELECT MAX(id) FROM ventas.detalle_venta), 1));
SELECT setval(pg_get_serial_sequence('ventas.pagos','id'),             COALESCE((SELECT MAX(id) FROM ventas.pagos), 1));
SELECT setval(pg_get_serial_sequence('ventas.apartados','id'),         COALESCE((SELECT MAX(id) FROM ventas.apartados), 1));
SELECT setval(pg_get_serial_sequence('ventas.detalle_apartado','id'),  COALESCE((SELECT MAX(id) FROM ventas.detalle_apartado), 1));
SELECT setval(pg_get_serial_sequence('ventas.abonos','id'),            COALESCE((SELECT MAX(id) FROM ventas.abonos), 1));

DO $$
DECLARE
  -- ── Parámetros ──
  N_CLIENTES   CONSTANT INT := 120;
  N_VENTAS     CONSTANT INT := 700;
  N_APARTADOS  CONSTANT INT := 320;   -- 80 por estado
  MARCA        CONSTANT TEXT := 'SEED_MASIVO_20260720';

  v_vend        INT;
  v_variantes   INT[];
  v_precios     NUMERIC[];
  v_nvar        INT;
  v_clientes    INT[] := '{}';

  v_pnombres TEXT[] := ARRAY['Mariana','Roberto','Gabriela','Héctor','Paola','Andrés','Fernanda','Iván',
    'Daniela','Sergio','Valeria','Emilio','Lucía','Diego','Sofía','Miguel','Carmen','Jorge','Elena','Pedro',
    'Ana','Carlos','Laura','Fernando','Andrea','Paula','Ricardo','Natalia','Julio','Rosa'];
  v_anombres TEXT[] := ARRAY['López','Sánchez','Torres','Ramírez','Jiménez','Molina','Castro','Guerrero',
    'Ríos','Peña','Ortiz','Vargas','Hernández','Díaz','Flores','Gómez','Reyes','Cruz','Morales','Navarro'];

  v_cid         INT;
  v_metodos     TEXT[] := ARRAY['Efectivo','T. Débito','T. Crédito','Transferencia'];

  v_i INT; v_j INT; v_bucket INT; v_nitems INT; v_idx INT;
  v_var INT; v_precio NUMERIC; v_qty INT; v_total NUMERIC;
  v_venta_id INT; v_ap_id INT;
  v_fecha TIMESTAMP; v_creado TIMESTAMP; v_flimite DATE;
  v_estado VARCHAR; v_ratio NUMERIC; v_abonado NUMERIC; v_p1 NUMERIC;
  cnt_ventas INT := 0; cnt_apartados INT := 0;
BEGIN
  SELECT id INTO v_vend FROM seguridad.personas WHERE id = 6 AND es_empleado = TRUE;
  IF v_vend IS NULL THEN SELECT MIN(id) INTO v_vend FROM seguridad.personas WHERE es_empleado = TRUE; END IF;

  -- Todas las variantes activas con stock (reparte el consumo)
  SELECT array_agg(id), array_agg(precio) INTO v_variantes, v_precios
  FROM (
    SELECT id, precio FROM inventario.variantes_producto
    WHERE activo = TRUE AND (stock - COALESCE(stock_apartado,0)) >= 2
    ORDER BY random()
  ) s;
  v_nvar := array_length(v_variantes, 1);
  IF v_nvar IS NULL OR v_nvar = 0 THEN
    RAISE EXCEPTION 'No hay variantes con stock disponible.';
  END IF;

  -- Clientes
  FOR v_i IN 1..N_CLIENTES LOOP
    INSERT INTO seguridad.personas (nombre, telefono, email, rfc, notas, creado_en, es_cliente, es_empleado, rol_id)
    VALUES (
      v_pnombres[1 + floor(random()*array_length(v_pnombres,1))::int] || ' ' ||
      v_anombres[1 + floor(random()*array_length(v_anombres,1))::int] || ' ' ||
      v_anombres[1 + floor(random()*array_length(v_anombres,1))::int],
      lpad((floor(random()*9000000000)::bigint)::text, 10, '0'),
      'seed_masivo_' || v_i || '_' || floor(random()*1000000)::int || '@example.com',
      NULL, MARCA, now() - ((random()*120)::int || ' days')::interval,
      TRUE, FALSE, 4   -- cliente de mostrador: sin credenciales de acceso
    ) RETURNING id INTO v_cid;
    v_clientes := array_append(v_clientes, v_cid);
  END LOOP;

  -- VENTAS
  FOR v_i IN 1..N_VENTAS LOOP
    v_fecha := now() - ((random()*120)::int || ' days')::interval - ((random()*12)::int || ' hours')::interval;
    v_nitems := 1 + floor(random()*3)::int;
    v_total := 0;

    INSERT INTO ventas.ventas (cliente_id, usuario_id, subtotal, descuento_monto, total, estado, creado_en)
    VALUES (v_clientes[1 + floor(random()*array_length(v_clientes,1))::int], v_vend, 0, 0, 0, 'completada', v_fecha)
    RETURNING id INTO v_venta_id;

    FOR v_j IN 1..v_nitems LOOP
      v_idx := 1 + floor(random()*v_nvar)::int;
      v_var := v_variantes[v_idx]; v_precio := v_precios[v_idx];
      v_qty := 1 + floor(random()*2)::int;
      INSERT INTO ventas.detalle_venta (venta_id, variante_id, cantidad, precio_unitario)
      VALUES (v_venta_id, v_var, v_qty, v_precio);
      UPDATE inventario.variantes_producto SET stock = GREATEST(stock - v_qty, 0) WHERE id = v_var;
      v_total := v_total + v_precio * v_qty;
    END LOOP;

    UPDATE ventas.ventas SET subtotal = v_total, total = v_total WHERE id = v_venta_id;

    IF random() < 0.25 THEN
      v_p1 := round((v_total * 0.5)::numeric, 2);
      INSERT INTO ventas.pagos (venta_id, metodo, monto, pagado_en) VALUES (v_venta_id, 'Efectivo', v_p1, v_fecha);
      INSERT INTO ventas.pagos (venta_id, metodo, monto, pagado_en) VALUES (v_venta_id, v_metodos[2 + floor(random()*2)::int], v_total - v_p1, v_fecha);
    ELSE
      INSERT INTO ventas.pagos (venta_id, metodo, monto, pagado_en) VALUES (v_venta_id, v_metodos[1 + floor(random()*4)::int], v_total, v_fecha);
    END IF;

    cnt_ventas := cnt_ventas + 1;
  END LOOP;

  -- APARTADOS (repartidos en 4 estados)
  FOR v_i IN 1..N_APARTADOS LOOP
    v_bucket := v_i % 4;
    IF v_bucket = 0 THEN            -- VENCIDO
      v_creado  := now() - ((15 + random()*40)::int || ' days')::interval;
      v_flimite := CURRENT_DATE - (3 + floor(random()*20))::int;
      v_estado  := 'activo'; v_ratio := random()*0.5;
    ELSIF v_bucket = 1 THEN         -- POR VENCER
      v_creado  := now() - ((4 + random()*3)::int || ' days')::interval;
      v_flimite := CURRENT_DATE + (1 + floor(random()*3))::int;
      v_estado  := 'activo'; v_ratio := 0.3 + random()*0.4;
    ELSIF v_bucket = 2 THEN         -- COMPLETADO
      v_creado  := now() - ((5 + random()*80)::int || ' days')::interval;
      v_flimite := (v_creado::date) + 7;
      v_estado  := 'completado'; v_ratio := 1.0;
    ELSE                            -- RECIÉN CREADO
      v_creado  := now() - ((random()*2)::int || ' days')::interval;
      v_flimite := CURRENT_DATE + (7 + floor(random()*10))::int;
      v_estado  := 'activo'; v_ratio := CASE WHEN random() < 0.3 THEN 0 ELSE random()*0.3 END;
    END IF;

    v_nitems := 1 + floor(random()*2)::int; v_total := 0;

    INSERT INTO ventas.apartados (cliente_id, usuario_id, total, abonado, estado, fecha_limite, creado_en)
    VALUES (v_clientes[1 + floor(random()*array_length(v_clientes,1))::int], v_vend, 0, 0, v_estado, v_flimite, v_creado)
    RETURNING id INTO v_ap_id;

    FOR v_j IN 1..v_nitems LOOP
      v_idx := 1 + floor(random()*v_nvar)::int;
      v_var := v_variantes[v_idx]; v_precio := v_precios[v_idx];
      v_qty := 1 + floor(random()*2)::int;
      INSERT INTO ventas.detalle_apartado (apartado_id, variante_id, cantidad, precio_unitario)
      VALUES (v_ap_id, v_var, v_qty, v_precio);
      IF v_estado = 'completado' THEN
        UPDATE inventario.variantes_producto SET stock = GREATEST(stock - v_qty, 0) WHERE id = v_var;
      ELSE
        UPDATE inventario.variantes_producto
          SET stock_apartado = stock_apartado + v_qty
          WHERE id = v_var AND (stock - stock_apartado) >= v_qty;
      END IF;
      v_total := v_total + v_precio * v_qty;
    END LOOP;

    v_abonado := round((v_total * v_ratio)::numeric, 2);
    IF v_estado = 'completado' THEN v_abonado := v_total; END IF;
    UPDATE ventas.apartados SET total = v_total, abonado = v_abonado WHERE id = v_ap_id;

    IF v_abonado > 0 THEN
      IF v_estado = 'completado' THEN
        v_p1 := round((v_total * 0.4)::numeric, 2);
        INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id, fecha)
        VALUES (v_ap_id, v_p1, v_metodos[1 + floor(random()*4)::int], v_vend, v_creado + interval '1 hour');
        INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id, fecha)
        VALUES (v_ap_id, v_total - v_p1, v_metodos[1 + floor(random()*4)::int], v_vend, v_creado + interval '2 days');
      ELSE
        INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id, fecha)
        VALUES (v_ap_id, v_abonado, v_metodos[1 + floor(random()*4)::int], v_vend, v_creado + interval '1 hour');
      END IF;
    END IF;

    cnt_apartados := cnt_apartados + 1;
  END LOOP;

  RAISE NOTICE 'Listo: % clientes, % ventas, % apartados (marcador %).',
    array_length(v_clientes,1), cnt_ventas, cnt_apartados, MARCA;
END $$;

COMMIT;

-- ============================================================================
--  REVERTIR (opcional) — borra SOLO este lote (notas = 'SEED_MASIVO_20260720')
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DELETE FROM ventas.abonos           WHERE apartado_id IN (SELECT id FROM ventas.apartados WHERE cliente_id IN (SELECT id FROM seguridad.personas WHERE notas='SEED_MASIVO_20260720'));
-- DELETE FROM ventas.detalle_apartado WHERE apartado_id IN (SELECT id FROM ventas.apartados WHERE cliente_id IN (SELECT id FROM seguridad.personas WHERE notas='SEED_MASIVO_20260720'));
-- DELETE FROM ventas.apartados        WHERE cliente_id IN (SELECT id FROM seguridad.personas WHERE notas='SEED_MASIVO_20260720');
-- DELETE FROM ventas.pagos            WHERE venta_id IN (SELECT id FROM ventas.ventas WHERE cliente_id IN (SELECT id FROM seguridad.personas WHERE notas='SEED_MASIVO_20260720'));
-- DELETE FROM ventas.detalle_venta    WHERE venta_id IN (SELECT id FROM ventas.ventas WHERE cliente_id IN (SELECT id FROM seguridad.personas WHERE notas='SEED_MASIVO_20260720'));
-- DELETE FROM ventas.ventas           WHERE cliente_id IN (SELECT id FROM seguridad.personas WHERE notas='SEED_MASIVO_20260720');
-- DELETE FROM seguridad.personas         WHERE notas='SEED_MASIVO_20260720';
-- COMMIT;
-- ============================================================================
