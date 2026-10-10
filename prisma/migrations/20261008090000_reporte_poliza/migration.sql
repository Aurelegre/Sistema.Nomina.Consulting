CREATE TABLE `reporte_poliza` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `nomina_id` INTEGER NOT NULL,
  `usuario_id` INTEGER NOT NULL,
  `generado_por` VARCHAR(150) NOT NULL,
  `fecha_generacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `datos` JSON NOT NULL,
  UNIQUE INDEX `reporte_poliza_nomina_id_key` (`nomina_id`),
  INDEX `reporte_poliza_usuario_id_idx` (`usuario_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `reporte_poliza_nomina_id_fkey` FOREIGN KEY (`nomina_id`) REFERENCES `nomina` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `reporte_poliza_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO permiso (codigo,nombre) VALUES
('ACCOUNTING_POLICY.GENERATE','Generar reporte de póliza contable'),
('ACCOUNTING_POLICY.EXPORT','Exportar póliza contable a CSV y PDF');
INSERT INTO rol_permiso (rol_id,permiso_id)
SELECT r.id,p.id FROM rol r CROSS JOIN permiso p
WHERE r.codigo='ADMINISTRADOR' AND p.codigo IN ('ACCOUNTING_POLICY.GENERATE','ACCOUNTING_POLICY.EXPORT');
