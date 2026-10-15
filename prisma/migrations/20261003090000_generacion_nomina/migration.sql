-- AlterTable
ALTER TABLE `periodo_nomina` ADD COLUMN `procesando` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `parametro_fiscal_nomina` (
    `anio` INTEGER NOT NULL,
    `deduccionAnual` DECIMAL(14, 2) NOT NULL,
    `referencia` VARCHAR(500) NOT NULL,

    PRIMARY KEY (`anio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nomina` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodo_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `solicitante` VARCHAR(150) NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'FALLIDA') NOT NULL DEFAULT 'PENDIENTE',
    `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_inicio` DATETIME(3) NULL,
    `fecha_fin` DATETIME(3) NULL,
    `mes_generacion` VARCHAR(20) NULL,
    `fecha_notificada` DATETIME(3) NULL,
    `intentos` INTEGER NOT NULL DEFAULT 0,
    `error` VARCHAR(500) NULL,
    `reglas` JSON NOT NULL,
    `total_ingresos` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_egresos` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_anticipo` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_pago` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_patronal` DECIMAL(18, 2) NOT NULL DEFAULT 0,

    UNIQUE INDEX `nomina_periodo_id_key`(`periodo_id`),
    INDEX `nomina_estado_fecha_solicitud_idx`(`estado`, `fecha_solicitud`),
    INDEX `nomina_usuario_id_fecha_notificada_idx`(`usuario_id`, `fecha_notificada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalle_nomina` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomina_id` INTEGER NOT NULL,
    `empleado_id` INTEGER NOT NULL,
    `codigo` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `departamento` VARCHAR(100) NOT NULL,
    `cuenta_contable` VARCHAR(50) NULL,
    `entrada` JSON NOT NULL,
    `salario_base` DECIMAL(14, 2) NOT NULL,
    `dias_laborados` INTEGER NOT NULL DEFAULT 0,
    `dias_ausencia` INTEGER NOT NULL DEFAULT 0,
    `salario_devengado` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `descuento_ausencias` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `horas_extras` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `horas_dobles` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `piezas` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `ventas` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `monto_extras` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `monto_dobles` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `bonificacion` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `produccion` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tasa_comision` DECIMAL(6, 4) NOT NULL DEFAULT 0,
    `comision` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `base_igss` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `igss_laboral` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `igss_patronal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `renta_anual` DECIMAL(16, 2) NOT NULL DEFAULT 0,
    `isr` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `solidaridad` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `compras` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_ingresos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_egresos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `liquido` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `anticipo` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `pago_final` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `detalle_nomina_empleado_id_idx`(`empleado_id`),
    UNIQUE INDEX `detalle_nomina_nomina_id_empleado_id_key`(`nomina_id`, `empleado_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `nomina` ADD CONSTRAINT `nomina_periodo_id_fkey` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_nomina`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nomina` ADD CONSTRAINT `nomina_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalle_nomina` ADD CONSTRAINT `detalle_nomina_nomina_id_fkey` FOREIGN KEY (`nomina_id`) REFERENCES `nomina`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalle_nomina` ADD CONSTRAINT `detalle_nomina_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Routines own the calculation transaction. CALL must not be wrapped in a Prisma transaction.
DROP PROCEDURE IF EXISTS sp_obtener_mes_actual;
CREATE PROCEDURE sp_obtener_mes_actual(OUT p_nombre VARCHAR(20))
NO SQL
SET p_nombre = ELT(MONTH(UTC_TIMESTAMP() - INTERVAL 6 HOUR),
 'enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre');

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
   UPDATE nomina SET estado='FALLIDA', error='No fue posible completar el cálculo. Revisa los datos e intenta nuevamente.', fecha_fin=UTC_TIMESTAMP(3), fecha_notificada=NULL
     WHERE id=p_id AND estado <> 'COMPLETADA';
   UPDATE periodo_nomina SET procesando=FALSE WHERE id=v_periodo AND estado='ABIERTO';
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
 WHERE n.id=p_id AND p.estado='ABIERTO' AND p.procesando=TRUE FOR UPDATE;
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
 n.estado='COMPLETADA',n.fecha_fin=UTC_TIMESTAMP(3),n.mes_generacion=v_mes,n.error=NULL,n.fecha_notificada=NULL WHERE n.id=p_id;
 UPDATE periodo_nomina SET estado='CERRADO',fecha_cierre=UTC_TIMESTAMP(3),procesando=FALSE WHERE id=v_periodo;
 COMMIT;
 DO RELEASE_LOCK(CONCAT('nomina:',p_id));
END;

INSERT INTO parametro_fiscal_nomina (anio, deduccionAnual, referencia) VALUES
(2025,48000,'Decreto 10-2012 art. 72; sin deducciones documentales externas'),
(2026,51024,'Decreto 10-2012 y deduccion extraordinaria Decreto 13-2026 art. 4; ejercicio 2026');
INSERT INTO permiso (codigo,nombre) VALUES ('PAYROLL.DETAIL','Consultar detalle de nomina por empleado'),('PAYROLL.EXPORT','Exportar nomina completa a CSV');
INSERT INTO rol_permiso (rol_id,permiso_id) SELECT r.id,p.id FROM rol r CROSS JOIN permiso p WHERE r.codigo IN ('ADMINISTRADOR','NOMINA_RRHH','FINANZAS_CONSULTA') AND p.codigo IN ('PAYROLL.DETAIL','PAYROLL.EXPORT');
DELETE rp FROM rol_permiso rp JOIN permiso p ON p.id=rp.permiso_id WHERE p.codigo IN ('PAYROLL.CLOSE','PAYROLL_PERIODS.CLOSE');
DELETE FROM permiso WHERE codigo IN ('PAYROLL.CLOSE','PAYROLL_PERIODS.CLOSE');
