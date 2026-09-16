-- Conserva los códigos existentes y permite registrar nuevos departamentos.
ALTER TABLE `departamento`
    MODIFY `codigo` VARCHAR(50) NOT NULL,
    ADD COLUMN `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO';
