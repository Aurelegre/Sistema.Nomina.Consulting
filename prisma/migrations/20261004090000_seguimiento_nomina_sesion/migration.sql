-- Preserve pending executions while replacing the previous boolean guard.
ALTER TABLE periodo_nomina MODIFY estado ENUM('ABIERTO','PROCESANDO','CERRADO') NOT NULL DEFAULT 'ABIERTO';
UPDATE periodo_nomina SET estado='PROCESANDO' WHERE procesando=TRUE AND estado='ABIERTO';
DROP INDEX uq_periodo_nomina_unico_abierto ON periodo_nomina;
CREATE UNIQUE INDEX uq_periodo_nomina_unico_abierto ON periodo_nomina ((CASE WHEN estado IN ('ABIERTO','PROCESANDO') THEN 1 ELSE NULL END));
ALTER TABLE periodo_nomina DROP COLUMN procesando;
CREATE INDEX nomina_usuario_id_idx ON nomina(usuario_id);
ALTER TABLE nomina DROP INDEX nomina_usuario_id_fecha_notificada_idx, DROP COLUMN fecha_notificada, ADD COLUMN sesion_solicitud_id INTEGER NULL;

DROP PROCEDURE IF EXISTS sp_generar_nomina;
CREATE PROCEDURE sp_generar_nomina(IN p_id INT)
principal: BEGIN
 DECLARE v_lock INT DEFAULT 0;
 DECLARE v_periodo INT;
 DECLARE v_estado VARCHAR(20);
 DECLARE v_inicio DATE;
 DECLARE v_fin DATE;
 DECLARE v_mes VARCHAR(20);
 DECLARE v_dia DATE;
 DECLARE v_peso INT;
 DECLARE v_deduccion DECIMAL(14,2);
 DECLARE v_error TEXT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION
 BEGIN
  GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
  ROLLBACK;
  IF v_lock=1 THEN
   START TRANSACTION;
   UPDATE nomina SET estado='FALLIDA', error='No fue posible completar el cálculo. Revisa los datos e intenta nuevamente.', fecha_fin=UTC_TIMESTAMP(3)
     WHERE id=p_id AND estado <> 'COMPLETADA';
   UPDATE periodo_nomina SET estado='ABIERTO' WHERE id=v_periodo AND estado='PROCESANDO';
   COMMIT;
   DO RELEASE_LOCK(CONCAT('nomina:',p_id));
  END IF;
  RESIGNAL;
 END;
 SELECT GET_LOCK(CONCAT('nomina:',p_id),0) INTO v_lock;
 IF v_lock <> 1 THEN LEAVE principal; END IF;
 SELECT periodo_id, estado INTO v_periodo,v_estado FROM nomina WHERE id=p_id;
 IF v_estado IS NULL OR v_estado IN ('COMPLETADA','FALLIDA') THEN
  DO RELEASE_LOCK(CONCAT('nomina:',p_id)); LEAVE principal;
 END IF;
 UPDATE nomina SET estado='EN_PROCESO', fecha_inicio=UTC_TIMESTAMP(3), intentos=intentos+1 WHERE id=p_id;
 START TRANSACTION;
 SELECT n.estado, CAST(n.reglas->>'$.deduccionAnual' AS DECIMAL(14,2)),
   STR_TO_DATE(CONCAT(p.anio,'-',p.mes,'-01'),'%Y-%m-%d')
 INTO v_estado,v_deduccion,v_inicio
 FROM nomina n JOIN periodo_nomina p ON p.id=n.periodo_id
 WHERE n.id=p_id AND p.estado='PROCESANDO' FOR UPDATE;
 IF v_inicio IS NULL OR v_deduccion IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Período o parámetros no disponibles'; END IF;
 IF NOT EXISTS(SELECT 1 FROM detalle_nomina WHERE nomina_id=p_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La nómina no contiene empleados'; END IF;
 SET v_fin=LAST_DAY(v_inicio);
 CALL sp_obtener_mes_actual(v_mes);

 UPDATE detalle_nomina d SET
  dias_laborados=0, dias_ausencia=0,
  horas_extras=COALESCE((SELECT SUM(j.cantidad) FROM JSON_TABLE(d.entrada,'$.novedades[*]' COLUMNS(tipo VARCHAR(30) PATH '$.tipo',cantidad DECIMAL(14,2) PATH '$.cantidad')) j WHERE j.tipo='HORAS_EXTRAS'),0),
  horas_dobles=COALESCE((SELECT SUM(j.cantidad) FROM JSON_TABLE(d.entrada,'$.novedades[*]' COLUMNS(tipo VARCHAR(30) PATH '$.tipo',cantidad DECIMAL(14,2) PATH '$.cantidad')) j WHERE j.tipo='HORAS_DOBLES'),0),
  piezas=COALESCE((SELECT SUM(j.cantidad) FROM JSON_TABLE(d.entrada,'$.novedades[*]' COLUMNS(tipo VARCHAR(30) PATH '$.tipo',cantidad DECIMAL(14,2) PATH '$.cantidad')) j WHERE j.tipo='PIEZAS'),0),
  ventas=COALESCE((SELECT SUM(j.cantidad) FROM JSON_TABLE(d.entrada,'$.novedades[*]' COLUMNS(tipo VARCHAR(30) PATH '$.tipo',cantidad DECIMAL(14,2) PATH '$.cantidad')) j WHERE j.tipo='VENTAS'),0),
  compras=COALESCE((SELECT SUM(j.monto) FROM JSON_TABLE(d.entrada,'$.compras[*]' COLUMNS(monto DECIMAL(14,2) PATH '$.monto')) j),0)
 WHERE nomina_id=p_id;
 SET v_dia=v_inicio;
 WHILE v_dia<=v_fin DO
  SET v_peso=CASE WHEN DAY(v_dia)=31 THEN 0 WHEN v_dia=LAST_DAY(v_dia) AND DAY(v_dia)<30 THEN 31-DAY(v_dia) ELSE 1 END;
  UPDATE detalle_nomina d SET dias_laborados=dias_laborados+v_peso,
   dias_ausencia=dias_ausencia+IF(EXISTS(SELECT 1 FROM JSON_TABLE(d.entrada,'$.ausencias[*]' COLUMNS(inicio DATE PATH '$.inicio',fin DATE PATH '$.fin')) a WHERE v_dia BETWEEN a.inicio AND a.fin),v_peso,0)
  WHERE nomina_id=p_id AND v_dia>=CAST(entrada->>'$.ingreso' AS DATE)
   AND (entrada->>'$.salida'='null' OR entrada->>'$.salida' IS NULL OR v_dia<=CAST(entrada->>'$.salida' AS DATE));
  SET v_dia=v_dia+INTERVAL 1 DAY;
 END WHILE;
 UPDATE detalle_nomina SET
  descuento_ausencias=ROUND(salario_base/30*dias_ausencia,2),
  salario_devengado=ROUND(salario_base/30*(dias_laborados-dias_ausencia),2),
  dias_laborados=dias_laborados-dias_ausencia,
  monto_extras=ROUND(horas_extras*salario_base/240*1.5,2),
  monto_dobles=ROUND(horas_dobles*salario_base/240*2,2),
  produccion=ROUND(piezas*0.01,2), bonificacion=250,
  tasa_comision=CASE WHEN ventas>400000 THEN 0.045 WHEN ventas>200000 THEN 0.035 WHEN ventas>100000 THEN 0.025 ELSE 0 END,
  solidaridad=ROUND(salario_base*0.03,2), anticipo=ROUND(salario_base*0.5,2)
 WHERE nomina_id=p_id;
 UPDATE detalle_nomina SET comision=ROUND(ventas*tasa_comision,2) WHERE nomina_id=p_id;
 -- Production is treated as salary; only the statutory Q250 is excluded from IGSS.
 UPDATE detalle_nomina SET
  base_igss=salario_devengado+monto_extras+monto_dobles+produccion+comision,
  total_ingresos=salario_devengado+monto_extras+monto_dobles+produccion+comision+bonificacion,
  renta_anual=GREATEST(0,(salario_base+monto_extras+monto_dobles+produccion+comision+bonificacion)*12
   -ROUND((salario_base+monto_extras+monto_dobles+produccion+comision)*0.0483,2)*12-v_deduccion)
 WHERE nomina_id=p_id;
 UPDATE detalle_nomina SET
  igss_laboral=ROUND(base_igss*0.0483,2), igss_patronal=ROUND(base_igss*0.1067,2),
  isr=ROUND((CASE WHEN renta_anual<=300000 THEN renta_anual*0.05 ELSE 15000+(renta_anual-300000)*0.07 END)/12,2)
 WHERE nomina_id=p_id;
 UPDATE detalle_nomina SET total_egresos=igss_laboral+isr+solidaridad+compras WHERE nomina_id=p_id;
 UPDATE detalle_nomina SET liquido=total_ingresos-total_egresos, pago_final=total_ingresos-total_egresos-anticipo WHERE nomina_id=p_id;
 UPDATE detalle_nomina d
 JOIN JSON_TABLE(d.entrada,'$.ausencias[*]' COLUMNS(ausencia_id INT PATH '$.id')) j
 JOIN ausencia a ON a.id=j.ausencia_id AND a.empleado_id=d.empleado_id
 SET a.estado='APLICADA_NOMINA', a.version=a.version+1, a.fecha_actualizacion=UTC_TIMESTAMP(3)
 WHERE d.nomina_id=p_id AND a.estado='APROBADA' AND a.a_cuenta_salario=TRUE;
 UPDATE nomina n JOIN (
  SELECT SUM(total_ingresos) ingresos,SUM(total_egresos) egresos,SUM(anticipo) anticipos,SUM(pago_final) pagos,SUM(igss_patronal) patronal
  FROM detalle_nomina WHERE nomina_id=p_id
 ) t SET n.total_ingresos=t.ingresos,n.total_egresos=t.egresos,n.total_anticipo=t.anticipos,n.total_pago=t.pagos,n.total_patronal=t.patronal,
 n.estado='COMPLETADA',n.fecha_fin=UTC_TIMESTAMP(3),n.mes_generacion=v_mes,n.error=NULL WHERE n.id=p_id;
 UPDATE periodo_nomina SET estado='CERRADO',fecha_cierre=UTC_TIMESTAMP(3) WHERE id=v_periodo;
 COMMIT;
 DO RELEASE_LOCK(CONCAT('nomina:',p_id));
END;

