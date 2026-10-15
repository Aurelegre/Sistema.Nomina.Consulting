CREATE TABLE reporte_tributario (
id INTEGER NOT NULL AUTO_INCREMENT,
nomina_id INTEGER NOT NULL,
tipo ENUM('IGSS_LABORAL','IGSS_PATRONAL','ISR') NOT NULL,
usuario_id INTEGER NOT NULL,
generado_por VARCHAR(150) NOT NULL,
fecha_generacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
datos JSON NOT NULL,
PRIMARY KEY (id),
UNIQUE INDEX reporte_tributario_nomina_id_tipo_key (nomina_id,tipo),
INDEX reporte_tributario_usuario_id_idx (usuario_id),
CONSTRAINT reporte_tributario_nomina_id_fkey FOREIGN KEY (nomina_id) REFERENCES nomina(id) ON DELETE RESTRICT ON UPDATE CASCADE,
CONSTRAINT reporte_tributario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO permiso(codigo,nombre) VALUES ('IGSS_LABOR_REPORT.VIEW','Consultar reporte de IGSS laboral'),
('IGSS_LABOR_REPORT.GENERATE','Generar reporte de IGSS laboral'),
('IGSS_LABOR_REPORT.EXPORT','Exportar reporte de IGSS laboral'),
('IGSS_EMPLOYER_REPORT.VIEW','Consultar reporte de IGSS patronal'),
('IGSS_EMPLOYER_REPORT.GENERATE','Generar reporte de IGSS patronal'),
('IGSS_EMPLOYER_REPORT.EXPORT','Exportar reporte de IGSS patronal'),
('ISR_REPORT.VIEW','Consultar reporte de ISR'),
('ISR_REPORT.GENERATE','Generar reporte de ISR'),
('ISR_REPORT.EXPORT','Exportar reporte de ISR');
INSERT INTO rol_permiso(rol_id,permiso_id) SELECT r.id,p.id FROM rol r CROSS JOIN permiso p WHERE r.codigo='ADMINISTRADOR' AND p.codigo IN ('IGSS_LABOR_REPORT.VIEW','IGSS_LABOR_REPORT.GENERATE','IGSS_LABOR_REPORT.EXPORT','IGSS_EMPLOYER_REPORT.VIEW','IGSS_EMPLOYER_REPORT.GENERATE','IGSS_EMPLOYER_REPORT.EXPORT','ISR_REPORT.VIEW','ISR_REPORT.GENERATE','ISR_REPORT.EXPORT');
