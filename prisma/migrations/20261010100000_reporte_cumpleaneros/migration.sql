INSERT INTO permiso(codigo,nombre) VALUES
('BIRTHDAYS_REPORT.VIEW','Consultar reporte de cumpleañeros'),
('BIRTHDAYS_REPORT.EXPORT','Exportar reporte de cumpleañeros');
INSERT INTO rol_permiso(rol_id,permiso_id)
SELECT r.id,p.id FROM rol r CROSS JOIN permiso p
WHERE r.codigo='ADMINISTRADOR' AND p.codigo IN ('BIRTHDAYS_REPORT.VIEW','BIRTHDAYS_REPORT.EXPORT');
