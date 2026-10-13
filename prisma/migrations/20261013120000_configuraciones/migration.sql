CREATE TABLE configuraciones (
 id INTEGER NOT NULL AUTO_INCREMENT,
 clave VARCHAR(64) NOT NULL,
 valor VARCHAR(32) NOT NULL,
 descripcion VARCHAR(255) NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 actualizado_por INTEGER NULL,
 fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE INDEX configuraciones_clave_key(clave),
 PRIMARY KEY(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO configuraciones(clave,valor,descripcion) VALUES
('sesionMinutos','480','Duración de nuevas sesiones (minutos)'),
('loginIntentos','5','Intentos de inicio de sesión por ventana'),
('loginMinutos','15','Ventana de intentos de inicio de sesión (minutos)'),
('igssLaboral','4.83','IGSS laboral (%)'),
('igssPatronal','10.67','IGSS patronal (%)'),
('solidaridad','3','Cuota solidarista (%)'),
('anticipo','50','Anticipo quincenal (%)'),
('bonificacion','250','Bonificación incentivo (Q)'),
('horaBase','240','Divisor mensual para valor de hora'),
('factorExtra','1.5','Multiplicador de hora extra'),
('factorDoble','2','Multiplicador de hora doble'),
('pieza','0.01','Bonificación por pieza (Q)'),
('comisionLimite1','100000','Primer límite de ventas (Q)'),
('comisionLimite2','200000','Segundo límite de ventas (Q)'),
('comisionLimite3','400000','Tercer límite de ventas (Q)'),
('comisionTasa1','2.5','Comisión sobre primer límite (%)'),
('comisionTasa2','3.5','Comisión sobre segundo límite (%)'),
('comisionTasa3','4.5','Comisión sobre tercer límite (%)'),
('isrLimite','300000','Límite de primer tramo anual ISR (Q)'),
('isrTasa1','5','ISR primer tramo (%)'),
('isrTasa2','7','ISR excedente del primer tramo (%)');

-- Legacy queued payrolls retain their original defaults. New payrolls use their captured configuration.
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
 DECLARE v_config JSON;
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
 SELECT reglas->'$.configuraciones' INTO v_config FROM nomina WHERE id=p_id;
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
  monto_extras=ROUND(horas_extras*salario_base/CAST(COALESCE(v_config->>'$.horaBase',240) AS DECIMAL(16,4))*CAST(COALESCE(v_config->>'$.factorExtra',1.5) AS DECIMAL(16,4)),2),
  monto_dobles=ROUND(horas_dobles*salario_base/CAST(COALESCE(v_config->>'$.horaBase',240) AS DECIMAL(16,4))*CAST(COALESCE(v_config->>'$.factorDoble',2) AS DECIMAL(16,4)),2),
  produccion=ROUND(piezas*CAST(COALESCE(v_config->>'$.pieza',0.01) AS DECIMAL(16,4)),2), bonificacion=CAST(COALESCE(v_config->>'$.bonificacion',250) AS DECIMAL(16,4)),
  tasa_comision=CASE WHEN ventas>CAST(COALESCE(v_config->>'$.comisionLimite3',400000) AS DECIMAL(16,4)) THEN (CAST(COALESCE(v_config->>'$.comisionTasa3',4.5) AS DECIMAL(16,4))/100) WHEN ventas>CAST(COALESCE(v_config->>'$.comisionLimite2',200000) AS DECIMAL(16,4)) THEN (CAST(COALESCE(v_config->>'$.comisionTasa2',3.5) AS DECIMAL(16,4))/100) WHEN ventas>CAST(COALESCE(v_config->>'$.comisionLimite1',100000) AS DECIMAL(16,4)) THEN (CAST(COALESCE(v_config->>'$.comisionTasa1',2.5) AS DECIMAL(16,4))/100) ELSE 0 END,
  solidaridad=ROUND(salario_base*(CAST(COALESCE(v_config->>'$.solidaridad',3) AS DECIMAL(16,4))/100),2), anticipo=ROUND(salario_base*(CAST(COALESCE(v_config->>'$.anticipo',50) AS DECIMAL(16,4))/100),2)
 WHERE nomina_id=p_id;
 UPDATE detalle_nomina SET comision=ROUND(ventas*tasa_comision,2) WHERE nomina_id=p_id;
 -- Production is treated as salary; only the statutory Q250 is excluded from IGSS.
 UPDATE detalle_nomina SET
  base_igss=salario_devengado+monto_extras+monto_dobles+produccion+comision,
  total_ingresos=salario_devengado+monto_extras+monto_dobles+produccion+comision+bonificacion,
  renta_anual=GREATEST(0,(salario_base+monto_extras+monto_dobles+produccion+comision+bonificacion)*12
   -ROUND((salario_base+monto_extras+monto_dobles+produccion+comision)*(CAST(COALESCE(v_config->>'$.igssLaboral',4.83) AS DECIMAL(16,4))/100),2)*12-v_deduccion)
 WHERE nomina_id=p_id;
 UPDATE detalle_nomina SET
  igss_laboral=ROUND(base_igss*(CAST(COALESCE(v_config->>'$.igssLaboral',4.83) AS DECIMAL(16,4))/100),2), igss_patronal=ROUND(base_igss*(CAST(COALESCE(v_config->>'$.igssPatronal',10.67) AS DECIMAL(16,4))/100),2),
  isr=ROUND((CASE WHEN renta_anual<=CAST(COALESCE(v_config->>'$.isrLimite',300000) AS DECIMAL(16,4)) THEN renta_anual*(CAST(COALESCE(v_config->>'$.isrTasa1',5) AS DECIMAL(16,4))/100) ELSE CAST(COALESCE(v_config->>'$.isrLimite',300000) AS DECIMAL(16,4))*(CAST(COALESCE(v_config->>'$.isrTasa1',5) AS DECIMAL(16,4))/100)+(renta_anual-CAST(COALESCE(v_config->>'$.isrLimite',300000) AS DECIMAL(16,4)))*(CAST(COALESCE(v_config->>'$.isrTasa2',7) AS DECIMAL(16,4))/100) END)/12,2)
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

